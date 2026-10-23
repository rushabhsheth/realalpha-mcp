// Copied from Real Alpha's site (app/src/lib/credentials.ts) by its scripts/mcp-repo.mjs.
// What a segment page (/s/[slug]) says about the people in it: who's talking, who hosted the episode, and what they
// do as of the episode. scripts/missing-credentials.mjs reads them here too, so it lists the people the page shows.
// Plain TypeScript with no Astro imports, which is why it imports people.ts by its full filename (Node 22.18 and up
// run .ts files directly).

import { guestNames, nameKey } from './people.ts';

/** Someone a video's lineup names (src/data/lineups.json, from `npm run lineups`), as its title and description give them */
export interface LineupPerson {
  part: 'guest' | 'host';
  name: string;
  title?: string;
  company?: string;
}

/** Who's talking on a segment page: the person quoted, or else the episode's one guest. A panel without a quote has no one. */
export function whoIsTalking(segment: { guest?: string; quote?: { speaker?: string } }) {
  const guests = guestNames(segment.guest);
  return segment.quote?.speaker?.trim() || (guests.length === 1 ? guests[0] : undefined);
}

const wordsOf = (name: string) => nameKey(name).split(' ').filter(Boolean);

/**
 * Whether two spellings could be one person's name: the shorter one's words start the longer one's, the last perhaps
 * as an initial ("Oege De" or "Oege D." for Oege de Moor), or they share a first and last word around a middle name
 * ("Jeffrey P. Bezos"). Both need two words, so a first name on its own is no one.
 */
export function looselySame(a: string, b: string) {
  const [short, long] = [wordsOf(a), wordsOf(b)].sort((x, y) => x.length - y.length);
  if (short.length < 2) return false;
  const last = short.length - 1;
  const initial = (word: string, i: number) => i === last && word.length === 1 && long[i].startsWith(word);
  if (short.every((word, i) => word === long[i] || initial(word, i))) return true;
  return short[0] === long[0] && short[last] === long[long.length - 1];
}

/**
 * The person a video's lineup names by any of these spellings, or by a name `same` says is theirs (one of their
 * `aliases`, say). Lineups spell names the way each video does, like "Oege De" for Oege de Moor, so a loose match
 * counts too, as long as it points to one person in the lineup.
 */
export function inLineup(people: LineupPerson[], names: (string | undefined)[], same?: (name: string) => boolean) {
  const spelled = names.filter((name): name is string => Boolean(name));
  const keys = new Set(spelled.map(nameKey));
  const exact = people.find((person) => keys.has(nameKey(person.name)) || same?.(person.name));
  if (exact) return exact;
  const loose = people.filter((person) => spelled.some((name) => looselySame(person.name, name)));
  return loose.length === 1 ? loose[0] : undefined;
}

/**
 * Who hosted an episode: the people its lineup names as hosting, or else, when it names none, the show's hosts in
 * hosts.json, which lists who hosts each show now. A guest host or a host who has since left is only in the lineup.
 */
export function episodeHosts(lineup: LineupPerson[], showHosts: string[]): LineupPerson[] {
  const named = lineup.filter((person) => person.part === 'host');
  return named.length ? named : showHosts.map((name) => ({ part: 'host', name }));
}

/** Whether two people on a page are one: the same entry on our lists, or else names that match, loosely. */
export const samePerson = (a: { id?: string; name: string }, b: { id?: string; name: string }) =>
  a.id && b.id ? a.id === b.id : nameKey(a.name) === nameKey(b.name) || looselySame(a.name, b.name);

/**
 * The line under someone's name: the title and company their episode's lineup gives, which were right when it was
 * recorded, or else their `role` on our lists, or else whatever part of the two the lineup gives.
 */
export function roleFor(named: LineupPerson | undefined, role?: string) {
  if (named?.title && named.company) return `${named.title}, ${named.company}`;
  return role || named?.title || named?.company || undefined;
}

/**
 * What someone does, for the Person in a page's structured data (src/lib/seo.ts): the title and company their episode's
 * lineup gives, right as of the episode, or else what their role on our lists says, where "Co-founder & CEO, OpenAI" is
 * a title and a company. A lineup with a company and no title borrows the role's title only when the role names the same
 * company. Only a role's first part counts ("Chief AI Officer, Meta" of "Chief AI Officer, Meta; founder, Scale AI"),
 * and a role with no company counts as a title only when it reads like one ("Performance psychologist", not "Atomic AI").
 */
export function jobOf(named: LineupPerson | undefined, role?: string): { jobTitle?: string; worksFor?: string } {
  const first = role?.split(';')[0].trim() ?? '';
  const comma = first.lastIndexOf(', ');
  const listed =
    comma > 0 ? { jobTitle: first.slice(0, comma), worksFor: first.slice(comma + 2) } : /\s\p{Ll}/u.test(first) ? { jobTitle: first } : {};
  if (!named?.title && !named?.company) return listed;
  const sameCompany = Boolean(named.company && listed.worksFor && nameKey(named.company) === nameKey(listed.worksFor));
  const jobTitle = named.title ?? (sameCompany ? listed.jobTitle : undefined);
  return { ...(jobTitle && { jobTitle }), ...(named.company && { worksFor: named.company }) };
}

// Words that start a role held by one person, which reads without an article after "is": "CEO of NVIDIA",
// "head of ChatGPT at OpenAI", "cohost of My First Million". Any other role gets "a" or "an": "a venture capitalist".
const ONE_HOLDER =
  /^(?:co-?)?(?:ceo|cto|coo|cfo|cpo|cmo|cso|ciso|cio|founder|founders|president|chair|chairman|chairwoman|chairperson|head|chief|vp|svp|evp|host|creator|author|editor|team principal|managing partner|general partner|executive chair)\b/i;
// A role that's someone's family, which needs "the": "the husband of Elizabeth Holmes".
const KIN = /^(?:husband|wife|spouse|widow|widower|son|daughter|brother|sister|father|mother)\b/i;

/**
 * A role written to follow someone's name after a comma, as an episode summary's `role` is ("husband of Elizabeth
 * Holmes and founder of Hamanthus"), turned into what follows "is" in a sentence: "the husband of Elizabeth Holmes and
 * founder of Hamanthus". Undefined when it can't follow "is", such as "of Coatue".
 */
export function asPredicate(role?: string) {
  const text = role?.trim().replace(/\.$/, '');
  if (!text || /^(?:of|at|from|and|who)\b/i.test(text)) return undefined;
  if (/^(?:a|an|the|one of|his|her|their)\s/i.test(text) || /^\S+['’]s\s/.test(text)) return text;
  // A capital the role starts with only because it starts the role ("Founder and CEO of Vercel"), not an acronym or a
  // title in title case ("Chief Technologist for AI Infrastructure").
  const titleCase = text.split(/\s+/).slice(1, 4).some((word) => /^\p{Lu}\p{Ll}/u.test(word));
  const lower = /^\p{Lu}\p{Ll}/u.test(text) && !titleCase ? `${text[0].toLowerCase()}${text.slice(1)}` : text;
  if (KIN.test(text)) return `the ${lower}`;
  if (ONE_HOLDER.test(text)) return lower;
  const word = text.split(/\s/)[0];
  // An acronym is said letter by letter: "an MIT economist", "an AI researcher", "a UFC fighter".
  const vowelSound = /^\p{Lu}{2,}/u.test(word)
    ? /^[AEFHILMNORSX]/.test(word)
    : /^(?:[ai]|e(?!u)|o(?!ne\b|nce)|u(?!ni|s[eu]|r[aeiou])|hon(?!ey)|hour|heir)/i.test(word);
  return `${vowelSound ? 'an' : 'a'} ${text}`;
}

/**
 * Who a guest is, as what follows "<name> is" in one plain sentence for the top of their episode's pages (/v/[id],
 * /s/[slug]): "Billy Evans is the husband of Elizabeth Holmes and founder of Hamanthus, a Raman spectroscopy startup."
 * It comes from the episode's summary (`npm run summaries`), whose `role` the model writes from the episode and its
 * YouTube description, and only when the summary has one guest and they're this person: a panel's summary says who
 * they are all together. Undefined otherwise, and the page shows their name and title alone (roleFor).
 */
export function whoTheyAre(name: string, summary: { guest?: string; role?: string } | undefined, same = samePerson) {
  const [guest, ...others] = guestNames(summary?.guest);
  if (!guest || others.length || !same({ name }, { name: guest })) return undefined;
  return asPredicate(summary?.role);
}
