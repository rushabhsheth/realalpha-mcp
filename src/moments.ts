// Copied from Real Alpha's site (app/worker/moments.ts) by its scripts/mcp-repo.mjs.
/**
 * What the MCP server (worker/mcp.ts) reads from the realalpha D1 database, shaped for an AI assistant to quote and
 * cite: the moments we cut (segments, with their episode, show and date), who's talking in each and what they do as of
 * the episode, the big questions they answer (src/lib/questions.ts), and a minute of an episode's transcript around a
 * second. Every moment carries its page on realalpha.app, the speaker's and the show's pages, and a line to cite it by,
 * so an answer built from it links back to where it came from.
 *
 * Only what the live build has pages for counts: a segment cut after that build (its covers.at, later than /build.txt)
 * waits for the next one, so no link leads to a 404. The apps' search and Ask (worker/search.ts) find moments their own
 * way and shape them with the pieces here (momentOf and the rest), so both say the same about a moment. Excerpts stay short, a quote or a minute of transcript, never a
 * whole transcript: the videos are the shows', and the site plays them in YouTube's player under YouTube's terms.
 */

import { inLineup, type LineupPerson, roleFor, whoIsTalking } from './lib/credentials';
import { namedInFull } from './lib/full-name';
import { guestNames, idFor, nameKey, spellings } from './lib/people';
import { PAGE_FROM, type Question, questionById } from './lib/questions';
import { searchable } from './lib/search';
import { SITE } from './lib/site';
import { spoken, timecode } from './lib/time';
import { segmentTopics as topics } from './lib/topics';

/** The parts of Cloudflare's D1 binding used here, typed as worker/push.ts types them, so the Worker's Env has both. */
export interface Database {
  prepare(query: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}

interface Statement {
  bind(...values: unknown[]): Statement;
  run(): Promise<{ meta: { changes: number } }>;
  all<T>(): Promise<{ results: T[] }>;
}

export interface MomentsEnv {
  /** The realalpha D1 database (wrangler.jsonc › d1_databases). Missing in `astro dev`. */
  DB?: Database;
  /** The static site (wrangler.jsonc › assets.binding), whose /build.txt says when the live build was made. */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

type Row = Record<string, any>;

/** The most moments one answer carries, so a reply stays a list of sources rather than the catalog. */
export const MOST = 20;
/** How much of a transcript one excerpt holds: from a little before the second asked for, to about a minute after. */
const BEFORE = 10;
const AFTER = 75;
const EXCERPT_CHARACTERS = 1_200;

// ---- The live build ----

/** How long a Worker trusts the /build.txt it read before reading it again. */
const BUILD_FOR_MS = 60_000;
const builds = new WeakMap<object, { at: number; value: Promise<string> }>();

/**
 * When the live build was made (src/lib/build.ts), as an ISO time: segments cut before it have pages. Without a
 * /build.txt (a build that doesn't have one yet), every segment counts.
 */
export function liveBuild(assets: MomentsEnv['ASSETS']): Promise<string> {
  const kept = builds.get(assets);
  if (kept && Date.now() - kept.at <= BUILD_FOR_MS) return kept.value;
  const value = assets
    .fetch(new Request(`${SITE}/build.txt`))
    .then(async (response) => {
      const text = response.ok ? (await response.text()).trim() : '';
      return /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(text) ? text : '9999-12-31T00:00:00.000Z';
    })
    .catch(() => '9999-12-31T00:00:00.000Z');
  builds.set(assets, { at: Date.now(), value });
  return value;
}

// ---- The directory: who people are, the companies and the shows ----

export interface Person {
  id: string;
  name: string;
  list: 'builders' | 'hosts' | 'guests' | 'speakers';
  role?: string;
  /** For builders: their company, by name and id */
  company?: string;
  companyId?: string;
  /** Their page on realalpha.app, where every moment of theirs is listed: hosts have none */
  page?: string;
  /** Every spelling they're found by */
  keys: string[];
}

interface Directory {
  people: Person[];
  byKey: Map<string, Person>;
  companies: { id: string; name: string }[];
  shows: { id: string; name: string }[];
  /** Every id on the lists, which a speaker on none of them can't have for their /people/ page */
  taken: Set<string>;
  /** How the moments write the words of names that aren't plain letters, by the word nameKey makes of each: "lutke" is "Lütke" */
  spelled: Map<string, string[]>;
}

// The names a moment's people go by in the database: its quote's speaker and its guests.
const NAMES = `(coalesce(s.quote ->> '$.speaker', '') || ' ' || coalesce(s.guest, ''))`;

const DIRECTORY_SQL = [
  `SELECT b.id, b.name, b.aliases, b.role, CASE WHEN c.status = 'live' THEN c.name END AS company,
     CASE WHEN c.status = 'live' THEN c.id END AS company_id
   FROM builders b LEFT JOIN companies c ON c.id = b.company WHERE b.status = 'live' ORDER BY b.position, b.id`,
  `SELECT h.id, h.name, h.aliases, h.role FROM hosts h JOIN shows s ON s.id = h.show
   WHERE h.status = 'live' AND s.status IN ('live', 'paused') ORDER BY h.position, h.id`,
  `SELECT id, name, aliases, role FROM guests WHERE status = 'live' ORDER BY position, id`,
  `SELECT id, name FROM companies WHERE status = 'live' ORDER BY position, id`,
  `SELECT id, name FROM shows WHERE status IN ('live', 'paused') ORDER BY position, id`,
  // The moments' names with something besides plain letters, digits, spaces, commas and hyphens: "Tobi Lütke", "O’Brien".
  `SELECT DISTINCT ${NAMES} AS names FROM segments s WHERE ${NAMES} GLOB '*[^a-zA-Z0-9 ,-]*'`,
];
/** How long a Worker keeps the directory before reading it again, as segment pages keep their lists. */
const DIRECTORY_FOR_MS = 5 * 60_000;
const directories = new WeakMap<object, { at: number; value: Promise<Directory> }>();

// Where each list's people have their page, as src/lib/people.ts has it. Hosts have none.
const PAGES = { builders: '/builders/', guests: '/people/' } as const;

async function readDirectory(db: Database): Promise<Directory> {
  const kept = directories.get(db);
  if (kept && Date.now() - kept.at <= DIRECTORY_FOR_MS) return kept.value;
  const value = (db.batch(DIRECTORY_SQL.map((sql) => db.prepare(sql))) as Promise<{ results: Row[] }[]>).then(
    ([builders, hosts, guests, companies, shows, written]) => {
      const people: Person[] = [];
      const byKey = new Map<string, Person>();
      // Builders first, as on the site, so someone on two lists gets their builder page.
      for (const [list, { results }] of [
        ['builders', builders],
        ['hosts', hosts],
        ['guests', guests],
      ] as const) {
        for (const row of results) {
          const aliases: string[] = row.aliases ? JSON.parse(row.aliases) : [];
          const keys = spellings({ name: row.name, aliases }).map(nameKey).filter(Boolean);
          const page = list === 'hosts' ? undefined : `${SITE}${PAGES[list]}${row.id}/`;
          const person: Person = {
            id: row.id,
            name: row.name,
            list,
            ...(row.role && { role: row.role }),
            ...(row.company && { company: row.company, companyId: row.company_id }),
            ...(page && { page }),
            keys,
          };
          people.push(person);
          for (const key of keys) if (!byKey.has(key)) byKey.set(key, person);
        }
      }
      const spelled = new Map<string, string[]>();
      for (const { names } of written.results) {
        for (const word of String(names).split(/[^\p{L}\p{N}'’.]+/u)) {
          const key = nameKey(word);
          // A word of plain letters is found by its key alone: LIKE ignores their case.
          if (!key || /^[a-z0-9]*$/i.test(word)) continue;
          const spellings = spelled.get(key) ?? [];
          if (!spellings.includes(word)) spelled.set(key, [...spellings, word]);
        }
      }
      return {
        people,
        byKey,
        companies: companies.results.map((row) => ({ id: row.id, name: row.name })),
        shows: shows.results.map((row) => ({ id: row.id, name: row.name })),
        taken: new Set(people.map((person) => person.id)),
        spelled,
      };
    },
  );
  directories.set(db, { at: Date.now(), value });
  // A failed read isn't kept, so the next request asks again.
  value.catch(() => directories.delete(db));
  return value;
}

/** Someone a moment names who is on none of our lists: their name, and a /people/ page if they're quoted. */
function unlisted(name: string, quoted: boolean, directory: Directory): Person {
  const id = idFor(name);
  // As src/lib/builders.ts › speakersOnNoList gives them pages: a quote's speaker with a first and last name.
  const page = quoted && id && !directory.taken.has(id) && nameKey(name).split(' ').length >= 2 ? `${SITE}/people/${id}/` : undefined;
  return { id, name, list: 'speakers', ...(page && { page }), keys: [nameKey(name)] };
}

export type Found<T> = { found: T } | { ambiguous: T[] } | { missing: true };

/**
 * The person a name means: anyone on our lists by any spelling of their name, or else the one person on them whose
 * first or last name it is ("Altman"). A first name several people share comes back as all of them. Someone on no list
 * comes back as themselves, so the moments that quote them still count.
 */
export async function findPerson(db: Database, name: string): Promise<Found<Person>> {
  const directory = await readDirectory(db);
  const key = nameKey(name);
  if (!key) return { missing: true };
  const exact = directory.byKey.get(key);
  if (exact) return { found: exact };
  const partial = directory.people.filter((person) => person.keys.some((each) => each.split(' ').includes(key) || each.startsWith(`${key} `)));
  const unique = [...new Map(partial.map((person) => [person.id, person])).values()];
  if (unique.length === 1) return { found: unique[0] };
  if (unique.length > 1) return { ambiguous: unique.slice(0, 10) };
  return key.includes(' ') ? { found: unlisted(name.trim(), true, directory) } : { missing: true };
}

/** A company in the AI Companies directory, by its id or its name; or, when it isn't there, the name as given. */
export async function findCompany(db: Database, name: string) {
  const { companies, people } = await readDirectory(db);
  const key = nameKey(name);
  const company = companies.find((each) => each.id === name.trim().toLowerCase() || nameKey(each.name) === key) ?? {
    id: undefined,
    name: name.trim(),
  };
  return { ...company, people: company.id ? people.filter((person) => person.companyId === company.id) : [] };
}

/** A show we follow, by its id or its name, or by a name that starts the show's ("Lenny's" for Lenny's Podcast). */
export async function findShow(db: Database, name: string): Promise<Found<{ id: string; name: string }>> {
  const { shows } = await readDirectory(db);
  const key = nameKey(name);
  const exact = shows.find((show) => show.id === name.trim().toLowerCase() || nameKey(show.name) === key);
  if (exact) return { found: exact };
  const partial = key ? shows.filter((show) => nameKey(show.name).startsWith(key) || show.id.startsWith(idFor(name))) : [];
  if (partial.length === 1) return { found: partial[0] };
  return partial.length ? { ambiguous: partial.slice(0, 10) } : { missing: true };
}

// ---- Moments ----

/** A moment as the tools give it: what was said, who said it, where and when, and the page to cite. */
export interface Moment {
  /** The moment's id on realalpha.app, for get_moment */
  slug: string;
  title: string;
  /** Who's talking: the person quoted, or the episode's one guest */
  speaker?: string;
  /** What they do, as the episode's lineup gives it, or else as our lists have it */
  speaker_role?: string;
  /** Their page on realalpha.app, with every moment of theirs */
  speaker_page?: string;
  show: string;
  show_page: string;
  episode: string;
  /** When the episode came out, YYYY-MM-DD */
  date: string;
  /** Their words, as said in the episode */
  quote?: string;
  summary: string;
  takeaways?: string[];
  /** Where in the episode it starts, like 31:50, and how long it runs */
  starts_at: string;
  length: string;
  /** The moment's page, which plays the episode from it: the link to cite */
  url: string;
  /** The episode's page, from the moment on */
  episode_url: string;
  /** A line to credit it by */
  cite: string;
}

export const MOMENT_COLUMNS = `s.id, s.video, s.rank, s.start, s."end", s.title, s.summary, s.takeaways, s.guest, s.quote, s.topics,
  s.questions, s.extra, v.show, coalesce(c.title, v.title) AS episode, v.published`;
// A video gone from YouTube or made for kids (`hidden`) is off the site, as scripts/export-data.mjs leaves it out, and
// a segment cut after the live build (?1) has no page yet. A cut video keeps the title it had when it was cut (covers).
export const MOMENTS_FROM = `FROM segments s JOIN videos v ON v.id = s.video JOIN covers c ON c.video = s.video
  WHERE v.hidden IS NULL AND c.at <= ?1`;
// Everything a moment says, for matching words against: its title, summary, takeaways, quote, guests, episode, topics
// and its answers to the big questions.
const HAYSTACK = `(s.title || ' ' || s.summary || ' ' || s.takeaways || ' ' || coalesce(s.quote, '') || ' ' || coalesce(s.guest, '') || ' ' ||
  coalesce(c.title, v.title) || ' ' || coalesce(s.topics, '') || ' ' || coalesce(s.questions, ''))`;
const NEWEST = 'ORDER BY v.published DESC, s.video, s.rank';
/** The most rows one search reads before ranking them. */
const CANDIDATES = 500;

const dated = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** The episode's lineup for each of these videos (appearances, from `npm run lineups`), as lineups.json holds it. */
async function lineupsOf(db: Database, videos: string[]): Promise<Map<string, LineupPerson[]>> {
  const lineups = new Map<string, LineupPerson[]>();
  if (videos.length === 0) return lineups;
  const { results } = await db
    .prepare(
      `SELECT video, part, name, title, company FROM appearances
       WHERE video IN (SELECT value FROM json_each(?1)) ORDER BY video, position`,
    )
    .bind(JSON.stringify([...new Set(videos)]))
    .all<Row>();
  for (const row of results) {
    const person: LineupPerson = { part: row.part, name: row.name, ...(row.title && { title: row.title }), ...(row.company && { company: row.company }) };
    lineups.set(row.video, [...(lineups.get(row.video) ?? []), person]);
  }
  return lineups;
}

interface Context {
  directory: Directory;
  lineups: Map<string, LineupPerson[]>;
}

/** Who's talking in a moment: the person on our lists, or the name as the moment gives it. */
export function speakerOf(row: Row, { directory }: Context): Person | undefined {
  const quote = row.quote ? JSON.parse(row.quote) : undefined;
  const name = whoIsTalking({ guest: row.guest ?? undefined, quote });
  if (!name) return undefined;
  return directory.byKey.get(nameKey(name)) ?? unlisted(name, Boolean(quote?.speaker), directory);
}

/** A segments row as a Moment: `full` adds its takeaways, which lists of many moments leave out. */
export function momentOf(row: Row, context: Context, full = false): Moment {
  const showName = context.directory.shows.find((show) => show.id === row.show)?.name ?? row.show;
  const quote = row.quote ? JSON.parse(row.quote) : undefined;
  const person = speakerOf(row, context);
  const named = person && inLineup(context.lineups.get(row.video) ?? [], [person.name, ...person.keys]);
  const role = person && roleFor(named, person.role);
  const url = `${SITE}/s/${row.id}/`;
  const who = person?.name ?? showName;
  return {
    slug: row.id,
    title: row.title,
    ...(person && { speaker: person.name }),
    ...(role && { speaker_role: role }),
    ...(person?.page && { speaker_page: person.page }),
    show: showName,
    show_page: `${SITE}/shows/${row.show}/`,
    episode: row.episode,
    date: new Date(row.published).toISOString().slice(0, 10),
    ...(quote?.text && { quote: quote.text }),
    // Its first mention of them written out in full, as the moment's page has it ("Jensen splits…" is Jensen Huang).
    summary: namedInFull(row.summary, person?.name, [quote?.speaker]),
    ...(full && { takeaways: JSON.parse(row.takeaways) }),
    starts_at: timecode(row.start),
    length: spoken(row.end - row.start),
    url,
    episode_url: `${SITE}/v/${row.video}/?t=${Math.floor(row.start)}`,
    cite: `${who}${person ? ` on ${showName}` : ''}, ${dated(row.published)}, via Real Alpha: ${url}`,
  };
}

export async function contextFor(db: Database, rows: Row[]): Promise<Context> {
  const [directory, lineups] = await Promise.all([readDirectory(db), lineupsOf(db, rows.map((row) => row.video))]);
  return { directory, lineups };
}

/**
 * Whether this person is the one talking in a moment: they're the one quoted, or it quotes no one and they're one of the
 * episode's guests. Stricter than a person's page on the site (src/lib/people.ts › segmentPeople), which also lists
 * the moments of their episode where the host is quoted: asked what someone said, an assistant gets only their words.
 */
function theirs(row: Row, keys: Set<string>) {
  const speaker = row.quote ? JSON.parse(row.quote).speaker?.trim() : undefined;
  return speaker ? keys.has(nameKey(speaker)) : guestNames(row.guest ?? undefined).some((name) => keys.has(nameKey(name)));
}

/**
 * The LIKE pattern for text that has this in it, cut short to D1's limit: D1 refuses a pattern over 50 bytes, and with
 * it the whole query. Cut, it still keeps every row the whole would, and the rows kept are checked in full afterwards.
 */
function containing(text: string) {
  let kept = '';
  for (const character of text) {
    if (new TextEncoder().encode(`%${kept}${character}%`).length > 50) break;
    kept += character;
  }
  return `%${kept}%`;
}

/** A word and the ways the moments write it when it isn't plain letters (see `spelled`), each as a LIKE pattern. */
const writtenAs = (word: string, spelled: Directory['spelled']) => [...new Set([word, ...(spelled.get(word) ?? [])].map(containing))];

/**
 * The SQL that keeps a moment whose people include one of these names (the full check is `theirs`), by each name's last
 * word as nameKey has it, and as the moments write that word when it isn't plain letters: LIKE ignores only ASCII
 * letters' case, so "lutke" doesn't find "Lütke", nor "obrien" "O’Brien".
 */
function namedSql(names: string[], from: number, spelled: Directory['spelled']) {
  const words = [...new Set(names.map((name) => nameKey(name).split(' ').at(-1)!).filter((word) => word.length >= 2))];
  const values = [...new Set(words.flatMap((word) => writtenAs(word, spelled)))];
  return { sql: values.map((_, i) => `${NAMES} LIKE ?${from + i}`).join(' OR ') || '0', values };
}

// Words a search doesn't match on, unless it has nothing else: "what did Sam Altman say about agents" is about agents,
// and nearly every moment is about AI.
const STOP = new Set(
  'a about actually after ai also an and are as at be been but by can could did discuss do does for from get going gonna got had has have he her his how i if in into is it its just know like lot me mention much my not of on opinion or our over really said say says she should so talk talks than that the their them then there these they thing things think thinks this those to up very view views was way we were what when where which who why will with would you your'.split(
    ' ',
  ),
);

// What a question is phrased with and says nothing about its subject: "tell me what people are saying about…", "why do
// the ones…", "what's the latest on…", and the halves of a contraction (don't → "don", "t"). Ask leaves these out as
// well as STOP's, since it counts how many of a question's words a moment covers (worker/search.ts › findMoments), where
// "people" counts as much as "agents" does. A search keeps them: someone typing "people" wants it.
const QUESTION_STOP = new Set(
  'according aren around because before being both come comes coming couldn currently didn doesn don each else even ever every everyone everything explain explains few find give gives hadn happen happened happening happens hasn haven here him however isn kind later latest lately less let lets look looking looks made make makes making many may maybe mean means might more most must need needs never no now off often once ones only other others out own people please recently same saying see seem seems shouldn since some someone something still such sure take takes talking tell telling tells thinking thought thoughts through today too try trying wasn want wants weren whether while whom whose within without won wouldn yet'.split(
    ' ',
  ),
);

/**
 * A search's words, lowercase and without accents, the small ones left out. With `question`, a question's filler too
 * (QUESTION_STOP), for Ask. Either way at least one word is left: the question's own when all of them are filler.
 */
export function termsOf(query: string, options: { question?: boolean } = {}) {
  const words = [...new Set(searchable(query).match(/[\p{L}\p{N}]+/gu) ?? [])].filter((word) => word.length >= 2 || /\d/.test(word));
  const kept = words.filter((word) => !STOP.has(word));
  const asked = options.question ? kept.filter((word) => !QUESTION_STOP.has(word)) : kept;
  return ([asked, kept, words].find((list) => list.length) ?? words).slice(0, 8);
}

/** A word's pattern: it starts a word, so "agent" finds "agents" and "agentic" but "ai" doesn't find "said". */
export const wordPattern = (term: string) => new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u');

/** The text a moment is matched on, each part with its weight: the title and quote above the summary. */
function fieldsOf(row: Row): [string, number][] {
  const quote = row.quote ? JSON.parse(row.quote) : undefined;
  const answers: { id: string; answer: string }[] = row.questions ? JSON.parse(row.questions) : [];
  return (
    [
      [row.title, 4],
      [quote?.text ?? '', 3],
      [`${quote?.speaker ?? ''} ${row.guest ?? ''}`, 3],
      [answers.map((answer) => `${questionById.get(answer.id)?.question ?? ''} ${answer.answer}`).join(' '), 2.5],
      [row.takeaways, 2],
      [topicLabels(row.topics).join(' '), 2],
      [row.summary, 1.5],
      [row.episode ?? '', 1],
    ] as [string, number][]
  ).map(([text, weight]) => [searchable(String(text)), weight]);
}

/** Which of a search's words a moment has, each with the weight of the best place it's in (0 when it hasn't). */
const weightsOf = (fields: [string, number][], terms: string[]) =>
  terms.map((term) => {
    const pattern = wordPattern(term);
    return Math.max(0, ...fields.filter(([text]) => pattern.test(text)).map(([, weight]) => weight));
  });

/**
 * The moments that match a search, best first: each word counts by the best place it's in, times how rare it is among
 * the moments found (so "bubble" counts for more than "model"), with more for the whole phrase. With `every`, a moment
 * needs all the words; without, any of them, as long as it matches a third as well as the best one does.
 */
function ranked(rows: Row[], terms: string[], every: boolean) {
  const matches = rows.map((row, at) => {
    const fields = fieldsOf(row);
    return { row, at, fields, weights: weightsOf(fields, terms) };
  });
  const rarity = terms.map((_, i) => Math.log(1 + matches.length / Math.max(1, matches.filter((match) => match.weights[i] > 0).length)));
  const phrase = terms.join(' ');
  const scored = matches
    .filter(({ weights }) => (every ? weights.every((weight) => weight > 0) : weights.some((weight) => weight > 0)))
    .map(({ row, at, fields, weights }) => {
      let score = weights.reduce((sum, weight, i) => sum + weight * rarity[i], 0);
      if (terms.length > 1 && [0, 1, 3, 6].some((i) => fields[i][0].includes(phrase))) score += 3 * Math.max(...rarity);
      // A best minute of its episode before an extra moment its viewing guide added, when the words match as well.
      return { row, at, score: score + (row.extra ? 0 : 0.1) };
    })
    .sort((a, b) => b.score - a.score || a.at - b.at);
  const enough = every || scored.length === 0 ? 0 : scored[0].score / 3;
  return scored.filter(({ score }) => score >= enough).map(({ row }) => row);
}

const topicLabels = (json?: string | null) => {
  const ids: string[] = json ? JSON.parse(json) : [];
  return ids.map((id) => topics.find((topic) => topic.id === id)?.label ?? id);
};

/** The topic a word or two names (src/lib/topics.ts), by its id or label: "coding agents", "robotics". */
function topicNamed(text: string) {
  const key = searchable(text).trim();
  return topics.find((topic) => topic.id === key.replace(/\s+/g, '-') || searchable(topic.label) === key);
}

export interface SearchOptions {
  query: string;
  person?: Person;
  company?: Awaited<ReturnType<typeof findCompany>>;
  show?: string;
  since?: string;
  limit?: number;
}

/** The moments that best match a search, with any of its filters, best first. */
export async function searchMoments(env: MomentsEnv & { DB: Database }, options: SearchOptions): Promise<{ total: number; moments: Moment[] }> {
  const db = env.DB;
  const terms = termsOf(options.query);
  const build = await liveBuild(env.ASSETS);
  const limit = Math.min(options.limit ?? 8, MOST);
  const company = options.company;
  const { spelled } = await readDirectory(db);

  /** The rows with the search's words, all of them or any, and its filters, newest first. */
  const read = async (every: boolean) => {
    const values: unknown[] = [build];
    const where: string[] = [];
    const add = (sql: (at: number) => string, ...bound: unknown[]) => {
      where.push(sql(values.length + 1));
      values.push(...bound);
    };
    if (terms.length) {
      // Each word as the moments may write it: "lutke" is also "Lütke" (see namedSql). Four patterns a word at most,
      // so a search's eight words take no more than 32 of the 100 values D1 binds to a query.
      const groups = terms.map((term) =>
        writtenAs(term, spelled)
          .slice(0, 4)
          .map((pattern) => {
            values.push(pattern);
            return `${HAYSTACK} LIKE ?${values.length}`;
          }),
      );
      where.push(`(${groups.map((group) => `(${group.join(' OR ')})`).join(every ? ' AND ' : ' OR ')})`);
    }
    if (options.show) add((at) => `v.show = ?${at}`, options.show);
    if (options.since) add((at) => `v.published >= ?${at}`, options.since);
    if (options.person) {
      const named = namedSql(options.person.keys, values.length + 1, spelled);
      where.push(`(${named.sql})`);
      values.push(...named.values);
    }
    if (company) {
      // A company's moments: someone from it talking, by our lists or the episode's lineup, or the company named.
      const named = namedSql(
        company.people.flatMap((person) => person.keys),
        values.length + 3,
        spelled,
      );
      add(
        (at) => `(${HAYSTACK} LIKE ?${at} OR s.video IN (SELECT video FROM appearances WHERE company LIKE ?${at + 1}) OR ${named.sql})`,
        containing(company.name),
        containing(company.name),
        ...named.values,
      );
    }
    const { results } = await db
      .prepare(`SELECT ${MOMENT_COLUMNS} ${MOMENTS_FROM}${where.map((each) => ` AND ${each}`).join('')} ${NEWEST} LIMIT ${CANDIDATES}`)
      .bind(...values)
      .all<Row>();
    return results;
  };

  /** The rows that pass the filters SQL can't check: whose moment it is, and whether it's a company's. */
  const kept = async (rows: Row[]) => {
    if (options.person) {
      const keys = new Set(options.person.keys);
      rows = rows.filter((row) => theirs(row, keys));
    }
    if (!company) return rows;
    const context = await contextFor(db, rows);
    const keys = new Set(company.people.flatMap((person) => person.keys));
    const mention = wordPattern(searchable(company.name));
    const companyKey = nameKey(company.name);
    return rows.filter((row) => {
      if (theirs(row, keys)) return true;
      if (mention.test(searchable(`${row.title} ${row.summary} ${row.takeaways} ${row.quote ?? ''}`))) return true;
      // Whoever is talking works there, as the episode's lineup has it.
      const person = speakerOf(row, context);
      const named = person && inLineup(context.lineups.get(row.video) ?? [], [person.name, ...person.keys]);
      return Boolean(named?.company && nameKey(named.company) === companyKey);
    });
  };

  // Every word first; when too few moments have them all, any of them, with the ones that have them all still first.
  let found = terms.length ? ranked(await kept(await read(true)), terms, true) : await kept(await read(true));
  if (terms.length > 1 && found.length < limit) {
    const more = ranked(await kept(await read(false)), terms, false);
    const seen = new Set(found.map((row) => row.id));
    found = [...found, ...more.filter((row) => !seen.has(row.id))];
  }
  const shown = found.slice(0, limit);
  const context = await contextFor(db, shown);
  return { total: found.length, moments: shown.map((row) => momentOf(row, context)) };
}

/** Everything a person said in the moments we cut, newest first, or only on a topic, best match first. */
export async function momentsOf(env: MomentsEnv & { DB: Database }, person: Person, topic?: string, limit = 10) {
  const db = env.DB;
  const named = namedSql(person.keys, 2, (await readDirectory(db)).spelled);
  const { results } = await db
    .prepare(`SELECT ${MOMENT_COLUMNS} ${MOMENTS_FROM} AND (${named.sql}) ${NEWEST} LIMIT ${CANDIDATES}`)
    .bind(await liveBuild(env.ASSETS), ...named.values)
    .all<Row>();
  const keys = new Set(person.keys);
  let rows = results.filter((row) => theirs(row, keys));
  const all = rows.length;
  if (topic) {
    // Their moments on one of our topics first, newest first, then the others that have the topic's words.
    const named = topicNamed(topic);
    const tagged = named ? rows.filter((row) => row.topics?.includes(`"${named.id}"`)) : [];
    const words = ranked(rows, termsOf(topic), false).filter((row) => !tagged.includes(row));
    rows = [...tagged, ...words];
  }
  const shown = rows.slice(0, Math.min(limit, MOST));
  const context = await contextFor(db, shown);
  return { all, matching: rows.length, moments: shown.map((row) => momentOf(row, context)) };
}

/** The newest best minutes, by when their episodes came out, from one show or from them all. */
export async function latestMoments(env: MomentsEnv & { DB: Database }, n: number, show?: string) {
  const db = env.DB;
  const { results } = await db
    .prepare(`SELECT ${MOMENT_COLUMNS} ${MOMENTS_FROM} AND s.extra = 0${show ? ' AND v.show = ?2' : ''} ${NEWEST} LIMIT ?${show ? 3 : 2}`)
    .bind(await liveBuild(env.ASSETS), ...(show ? [show] : []), Math.min(n, MOST))
    .all<Row>();
  const context = await contextFor(db, results);
  return results.map((row) => momentOf(row, context));
}

/**
 * One moment in full: its takeaways and topics, the big questions it answers, and the episode's other best minutes.
 * `live: false` reads one the live build doesn't have yet, for the news desk (worker/news.ts), whose item goes live in
 * the same rebuild as the moment's page.
 */
export async function getMoment(env: MomentsEnv & { DB: Database }, slug: string, { live = true }: { live?: boolean } = {}) {
  const db = env.DB;
  const build = live ? await liveBuild(env.ASSETS) : '9999-12-31T23:59:59.999Z';
  const [row] = (await db.prepare(`SELECT ${MOMENT_COLUMNS} ${MOMENTS_FROM} AND s.id = ?2`).bind(build, slug).all<Row>()).results;
  if (!row) return undefined;
  const { results: episode } = await db
    .prepare(`SELECT s.id, s.title, s.start FROM segments s WHERE s.video = ?1 AND s.extra = 0 AND s.id != ?2 ORDER BY s.rank`)
    .bind(row.video, slug)
    .all<Row>();
  const context = await contextFor(db, [row]);
  const answers: { id: string; stance: string; answer: string }[] = row.questions ? JSON.parse(row.questions) : [];
  return {
    ...momentOf(row, context, true),
    topics: topicLabels(row.topics),
    answers: answers.flatMap((answer) => {
      const question = questionById.get(answer.id);
      const stance = question?.stances.find((each) => each.id === answer.stance);
      return question && stance ? [{ question: question.question, question_id: question.id, stance: stance.label, says: answer.answer }] : [];
    }),
    more_from_the_episode: episode.map((other) => ({ title: other.title, starts_at: timecode(other.start), url: `${SITE}/s/${other.id}/` })),
  };
}

/**
 * How the people we cut answer one of the big questions (src/lib/questions.ts): its moments by which way they answer,
 * the biggest group first, each newest first, as its page (/q/<id>/) has them. The page exists once PAGE_FROM moments
 * answer it.
 */
export async function answersTo(env: MomentsEnv & { DB: Database }, question: Question, perStance = 6) {
  const db = env.DB;
  const { results } = await db
    .prepare(
      `SELECT ${MOMENT_COLUMNS}, (SELECT json_object('stance', q.value ->> '$.stance', 'answer', q.value ->> '$.answer')
         FROM json_each(s.questions) q WHERE q.value ->> '$.id' = ?2) AS answered
       ${MOMENTS_FROM} AND s.questions IS NOT NULL AND answered IS NOT NULL ${NEWEST}`,
    )
    .bind(await liveBuild(env.ASSETS), question.id)
    .all<Row>();
  const rows = results.map((row) => ({ row, ...(JSON.parse(row.answered) as { stance: string; answer: string }) }));
  const shown = question.stances.flatMap((stance) => rows.filter((each) => each.stance === stance.id).slice(0, perStance));
  const context = await contextFor(
    db,
    shown.map(({ row }) => row),
  );
  const groups = question.stances
    .map((stance, order) => ({ stance, order, all: rows.filter((each) => each.stance === stance.id) }))
    .filter((group) => group.all.length > 0)
    .sort((a, b) => b.all.length - a.all.length || a.order - b.order)
    .map(({ stance, all }) => ({
      stance: stance.label,
      count: all.length,
      moments: all.slice(0, perStance).map(({ row, answer }) => ({ says: answer, ...momentOf(row, context) })),
    }));
  const counted = groups.reduce((sum, group) => sum + group.count, 0);
  return {
    question: question.question,
    ...(counted >= PAGE_FROM && { page: `${SITE}/q/${question.id}/` }),
    answered_by: counted,
    groups,
  };
}

// A speaker label that only tells voices apart, as a show's transcript service writes them (src/lib/episode-transcript.ts).
const NUMBERED = /^(?:speaker|spk|voice|person|participant|unknown)(?![a-z])[\s_-]*\w{0,3}$/i;

/**
 * About a minute of an episode's transcript from a second, for an episode we cut (only those have one on the site):
 * the lines from a little before it, up to EXCERPT_CHARACTERS, with who's talking where the transcript says, and the
 * moment it falls in, if any.
 */
export async function transcriptExcerpt(env: MomentsEnv & { DB: Database }, video: string, second: number) {
  const db = env.DB;
  const build = await liveBuild(env.ASSETS);
  const [episode] = (
    await db
      .prepare(
        `SELECT v.id, v.show, coalesce(c.title, v.title) AS episode, v.published, v.length, t.source, t.lines IS NOT NULL AS has_lines
         FROM videos v JOIN covers c ON c.video = v.id JOIN transcripts t ON t.video = v.id
         WHERE v.id = ?1 AND v.hidden IS NULL AND c.at <= ?2`,
      )
      .bind(video, build)
      .all<Row>()
  ).results;
  if (!episode?.has_lines) return undefined;
  if (episode.length && second > episode.length) return { past_the_end: timecode(episode.length) };
  const [{ results: lines }, { results: inside }] = (await db.batch([
    db
      .prepare(
        `SELECT j.value ->> '$.at' AS at, j.value ->> '$.text' AS text, j.value ->> '$.speaker' AS speaker
         FROM transcripts t, json_each(t.lines) j
         WHERE t.video = ?1 AND (j.value ->> '$.at') >= ?2 AND (j.value ->> '$.at') <= ?3 ORDER BY j.key`,
      )
      .bind(video, Math.max(0, second - BEFORE), second + AFTER),
    db
      .prepare(`SELECT id, title FROM segments WHERE video = ?1 AND start <= ?2 AND "end" > ?2 ORDER BY extra, rank LIMIT 1`)
      .bind(video, second),
  ])) as { results: Row[] }[];
  const excerpt: { at: string; speaker?: string; text: string }[] = [];
  let characters = 0;
  for (const line of lines) {
    if (characters >= EXCERPT_CHARACTERS) break;
    const speaker = line.speaker && !NUMBERED.test(String(line.speaker).trim()) ? String(line.speaker).trim() : undefined;
    excerpt.push({ at: timecode(line.at), ...(speaker && { speaker }), text: line.text });
    characters += String(line.text).length;
  }
  const { shows } = await readDirectory(db);
  const showName = shows.find((show) => show.id === episode.show)?.name ?? episode.show;
  const url = `${SITE}/v/${video}/?t=${Math.floor(second)}`;
  return {
    episode: episode.episode,
    show: showName,
    date: new Date(episode.published).toISOString().slice(0, 10),
    from: excerpt[0]?.at ?? timecode(second),
    lines: excerpt,
    transcript:
      episode.source === 'show'
        ? `From the transcript ${showName} publishes with the episode.`
        : 'A machine transcript of the episode’s audio: names may be misspelled, and the times may be a few seconds off.',
    url,
    ...(inside[0] && { moment: { title: inside[0].title, url: `${SITE}/s/${inside[0].id}/` } }),
    cite: `${showName}, “${episode.episode}”, ${dated(episode.published)}, at ${timecode(second)}, via Real Alpha: ${url}`,
  };
}
