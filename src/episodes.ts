// Copied from Real Alpha's site (app/worker/episodes.ts) by its scripts/mcp-repo.mjs.
/**
 * One episode for the MCP server's summarize_episode (worker/mcp.ts): found by its YouTube or realalpha.app/v/ link,
 * its id, or words that name it (its title, guest, host or show), and given as an assistant can summarize it from:
 * what it covers, the guest's background, a point for each part of the conversation with its time, its best minutes
 * (worker/moments.ts › momentOf), the opening of its full analysis, and its page to cite. People paste a YouTube link
 * and ask for a recap of a video their assistant can't watch; for the episodes we cut, this is what we heard in it.
 *
 * Only cut episodes the live build has pages for (covers.at ≤ /build.txt) are summarized. An episode we know of but
 * haven't cut says so, with how a reader asks for its cut (worker/requests.ts). The analysis past its opening stays
 * behind the page's sign-in, as on the site (src/components/EpisodeAnalysis.astro).
 */

import { nameKey } from './lib/people';
import { searchable } from './lib/search';
import { SITE } from './lib/site';
import { timecode } from './lib/time';
import {
  contextFor,
  type Database,
  formPatterns,
  liveBuild,
  type Moment,
  MOMENT_COLUMNS,
  MOMENTS_FROM,
  momentOf,
  type MomentsEnv,
  termPattern,
  termsOf,
} from './moments';

type Row = Record<string, any>;

// An 11-character YouTube id in a link to it, ours or YouTube's, or on its own.
const VIDEO_ID = /(?:^|[/=]|v\/)([A-Za-z0-9_-]{11})(?=$|[/?&#])/;
// Words that ask for an episode without naming one: "summarize the latest episode of Lenny's Podcast".
const ASKING = new Set(
  'episode episodes podcast podcasts interview interviews video videos summary summarize summarise recap key points latest newest new last recent full conversation chat youtube link watch listen show'.split(
    ' ',
  ),
);
/** How many episodes one word search reads before ranking them. */
const CANDIDATES = 300;
/** How many other episodes a summary names when the words matched more than one. */
const OTHERS = 5;

const dated = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const youtube = (video: string) => `https://www.youtube.com/watch?v=${video}`;

export interface EpisodeMatch {
  episode: string;
  show: string;
  date: string;
  video: string;
  url: string;
}

/** The shows we follow whose name the words hold ("lenny's podcast boris" holds Lenny's Podcast), longest name first. */
function showsIn(asked: string, shows: { id: string; name: string }[]) {
  const key = ` ${nameKey(asked)} `;
  return shows.filter((show) => nameKey(show.name) && key.includes(` ${nameKey(show.name)} `)).sort((a, b) => b.name.length - a.name.length);
}

/** An episode row's text to match words against, each part with its weight: its title and guests above its dek. */
const fieldsOf = (row: Row, showName: string): [string, number][] =>
  (
    [
      [row.episode, 3],
      [row.guest ?? '', 3],
      [row.hosts ?? '', 2],
      [showName, 2],
      [row.dek ?? '', 1],
    ] as [string, number][]
  ).map(([text, weight]) => [searchable(String(text)), weight]);

/** The rows best first by how many of the words they have and where, the newest first among equals. */
function ranked(rows: Row[], terms: string[], showName: (id: string) => string) {
  const patterns = terms.map(termPattern);
  return rows
    .map((row, at) => {
      const fields = fieldsOf(row, showName(row.show));
      const weights = patterns.map((pattern) => Math.max(0, ...fields.filter(([text]) => pattern.test(text)).map(([, weight]) => weight)));
      return { row, at, have: weights.filter((weight) => weight > 0).length, score: weights.reduce((sum, weight) => sum + weight, 0) };
    })
    .filter(({ have }) => have > 0)
    .sort((a, b) => b.have - a.have || b.score - a.score || a.at - b.at)
    .map(({ row }) => row);
}

/**
 * The episode a link, id or few words mean, summarized; or, for one we know of and haven't cut, what we know and how
 * to ask for it; or what to try when nothing matched. `show` narrows a word search to one show.
 */
export async function summarizeEpisode(env: MomentsEnv & { DB: Database }, asked: string, show?: { id: string; name: string }): Promise<Record<string, unknown>> {
  const db = env.DB;
  const build = await liveBuild(env.ASSETS);
  const { directory } = await contextFor(db, []);
  const showName = (id: string) => directory.shows.find((each) => each.id === id)?.name ?? id;
  const text = asked.trim();

  // A link or an id: the video itself, cut or not. Eleven letters alone may be a word ("programming"), so a bare id
  // that isn't one of our videos is searched for as words instead.
  const id = text.match(VIDEO_ID)?.[1];
  const linked = /[/.]/.test(text);
  if (id) {
    const [video] = (
      await db
        .prepare(`SELECT v.id, v.show, coalesce(c.title, v.title) AS episode, v.published, c.at AS cut FROM videos v LEFT JOIN covers c ON c.video = v.id WHERE v.id = ?1 AND v.hidden IS NULL`)
        .bind(id)
        .all<Row>()
    ).results;
    if (video?.cut && video.cut <= build) return summaryOf(env, video.id, build, []);
    if (video) return uncut(video, showName);
    if (linked) {
      return {
        found: false,
        youtube: youtube(id),
        tip: "Real Alpha doesn't follow the show this video is from, so it has no summary of it. Real Alpha covers long interviews with the people building AI; search_moments finds what they said on a subject.",
      };
    }
  }

  // Words: the show they name, if any, and the rest matched against each cut episode's title, guests, hosts and dek.
  const named = show ? [show] : showsIn(text, directory.shows);
  const within = named[0];
  const showWords = within ? new Set(termsOf(within.name)) : new Set<string>();
  const terms = termsOf(text).filter((term) => !ASKING.has(term) && !showWords.has(term));
  const values: unknown[] = [build];
  const where: string[] = [];
  if (within) {
    values.push(within.id);
    where.push(`v.show = ?${values.length}`);
  }
  if (terms.length) {
    // Each word in its other forms too: "hyperscalers" is also "hyperscaler" (moments.ts › otherForms).
    const patterns = terms.slice(0, 6).flatMap((term) =>
      formPatterns(term).map((pattern) => {
        values.push(pattern);
        return `(coalesce(c.title, v.title) || ' ' || coalesce(su.guest, '') || ' ' || coalesce(su.hosts, '') || ' ' || coalesce(su.dek, '')) LIKE ?${values.length}`;
      }),
    );
    where.push(`(${patterns.join(' OR ')})`);
  }
  if (!where.length) {
    return { found: false, tip: 'Give a YouTube link to the episode, or its show and guest, like "Boris Cherny on Lenny\'s Podcast".' };
  }
  const { results } = await db
    .prepare(
      `SELECT v.id, v.show, coalesce(c.title, v.title) AS episode, v.published, su.guest, su.hosts, su.dek
       FROM covers c JOIN videos v ON v.id = c.video LEFT JOIN summaries su ON su.video = v.id
       WHERE v.hidden IS NULL AND c.at <= ?1 AND (su.video IS NOT NULL OR EXISTS (SELECT 1 FROM segments s WHERE s.video = v.id))
       ${where.map((each) => ` AND ${each}`).join('')} ORDER BY v.published DESC LIMIT ${CANDIDATES}`,
    )
    .bind(...values)
    .all<Row>();
  // With no words besides a show's name, its newest episode.
  const found = terms.length ? ranked(results, terms, showName) : results;
  if (found.length) {
    const others = found.slice(1, 1 + OTHERS).map((row) => matchOf(row, showName));
    return summaryOf(env, found[0].id, build, others);
  }

  // Not among the cut episodes: one of the shows' uploads we haven't cut, by its title.
  if (terms.length) {
    const bound: unknown[] = within ? [within.id] : [];
    const titled = terms.slice(0, 6).flatMap((term) =>
      formPatterns(term).map((pattern) => {
        bound.push(pattern);
        return `v.title LIKE ?${bound.length}`;
      }),
    );
    const { results: uploads } = await db
      .prepare(
        `SELECT v.id, v.show, v.title AS episode, v.published FROM videos v
         WHERE v.hidden IS NULL AND v.short = 0 AND v.id NOT IN (SELECT video FROM covers)${within ? ' AND v.show = ?1' : ''}
         AND (${titled.join(' OR ')}) ORDER BY v.published DESC LIMIT ${CANDIDATES}`,
      )
      .bind(...bound)
      .all<Row>();
    const upload = ranked(uploads, terms, showName)[0];
    if (upload) return uncut(upload, showName);
  }
  return {
    found: false,
    tip: within
      ? `No ${within.name} episode Real Alpha cut matches that. Try the guest's name, or give the episode's YouTube link.`
      : "No episode Real Alpha cut matches that. Try the show and the guest's name, or give the episode's YouTube link.",
  };
}

const matchOf = (row: Row, showName: (id: string) => string): EpisodeMatch => ({
  episode: row.episode,
  show: showName(row.show),
  date: new Date(row.published).toISOString().slice(0, 10),
  video: row.id,
  url: `${SITE}/v/${row.id}/`,
});

/** An episode of a show we follow that we haven't cut (or whose page isn't live yet): what it is, and how to ask for it. */
function uncut(row: Row, showName: (id: string) => string) {
  return {
    found: true,
    cut: false,
    episode: row.episode,
    show: showName(row.show),
    date: new Date(row.published).toISOString().slice(0, 10),
    video: row.id,
    youtube: youtube(row.id),
    tip: `Real Alpha follows ${showName(row.show)} but hasn't cut this episode, so it has no summary yet. A Real Alpha reader can ask for its cut in Settings (${SITE}/settings/), free with a sign-in, and gets an email when it's ready.`,
  };
}

/** A cut episode in full: its summary, points, best minutes and the opening of its analysis. */
async function summaryOf(env: MomentsEnv & { DB: Database }, video: string, build: string, others: EpisodeMatch[]) {
  const db = env.DB;
  const [{ results: episodes }, { results: summaries }, { results: rows }, { results: analyses }] = (await db.batch([
    db.prepare(`SELECT v.show, coalesce(c.title, v.title) AS episode, v.published FROM videos v JOIN covers c ON c.video = v.id WHERE v.id = ?1`).bind(video),
    db.prepare(`SELECT guest, role, hosts, dek, background, summary, points FROM summaries WHERE video = ?1`).bind(video),
    db.prepare(`SELECT ${MOMENT_COLUMNS} ${MOMENTS_FROM} AND s.video = ?2 AND s.extra = 0 ORDER BY s.rank`).bind(build, video),
    db.prepare(`SELECT headline, short FROM analyses WHERE video = ?1`).bind(video),
  ])) as { results: Row[] }[];
  const context = await contextFor(db, rows);
  const episode = episodes[0];
  const showName = context.directory.shows.find((show) => show.id === episode.show)?.name ?? episode.show;
  const summary = summaries[0];
  const analysis = analyses[0];
  const moments: Moment[] = rows.map((row) => momentOf(row, context));
  const points: { at: number; title: string; text: string }[] = summary?.points ? JSON.parse(summary.points) : [];
  const url = `${SITE}/v/${video}/`;
  return {
    found: true,
    cut: true,
    episode: episode.episode,
    show: showName,
    show_page: `${SITE}/shows/${episode.show}/`,
    date: new Date(episode.published).toISOString().slice(0, 10),
    ...(summary?.guest && { guests: summary.guest }),
    ...(summary?.role && { guests_are: summary.role }),
    ...(summary?.hosts && { hosts: summary.hosts }),
    video,
    url,
    youtube: youtube(video),
    ...(summary?.dek && { dek: summary.dek }),
    ...(summary?.background && { background: summary.background }),
    ...(summary?.summary && { summary: summary.summary }),
    points: points.map((point) => ({ at: timecode(point.at), title: point.title, text: point.text, url: `${url}?t=${Math.floor(point.at)}` })),
    best_moments: moments,
    ...(analysis && {
      analysis: { headline: analysis.headline, opening: JSON.parse(analysis.short) as string[], url: `${url}#analysis`, rest: 'The rest of the analysis is on the page, free with a sign-in.' },
    }),
    transcript: `Read any minute of it with transcript_excerpt (video "${video}").`,
    cite: `${showName}, “${episode.episode}”, ${dated(episode.published)}, via Real Alpha: ${url}`,
    ...(others.length && { other_matches: others }),
  };
}
