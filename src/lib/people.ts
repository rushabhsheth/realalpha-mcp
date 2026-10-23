// Copied from Real Alpha's site (app/src/lib/people.ts) by its scripts/mcp-repo.mjs.
// Finding people by name. Segments name people in two places, the episode's guests (one comma-separated string) and
// the speaker of each quote, and pages and scripts look those names up in builders.json, hosts.json, guests.json and
// the founders of sponsored listings. They all do it here, so a name links the same way everywhere.
//
// Plain TypeScript with no Astro imports, so Node scripts can use it too (scripts/missing-faces.mjs). That's why it
// imports search.ts by its full filename. Pages get a finder loaded with the lists from findPeople() in builders.ts.

import { searchable } from './search.ts';

/** An entry in builders.json, hosts.json or guests.json, or a founder in listings.json */
export interface Listed {
  id: string;
  name: string;
  /** Other spellings of their name that segments use, like "Clem Delangue" for "Clément Delangue" */
  aliases?: string[];
  x?: string;
}

// Builders come first, so someone moved up from guests.json gets their profile even before they leave that list.
// Speakers come last: the people quoted in segments who are on none of the other lists (findPeople in builders.ts).
const ORDER = ['builders', 'hosts', 'guests', 'founders', 'speakers'] as const;
export type List = (typeof ORDER)[number];

// Where each list's people have their page. Hosts have one at /people/<id>/ like a guest's since 2026-10-22, so a host's
// name on a segment page links somewhere (before, only /hosts linked them, to X).
const PAGES: Partial<Record<List, string>> = {
  builders: '/builders/',
  founders: '/builders/',
  hosts: '/people/',
  guests: '/people/',
  speakers: '/people/',
};

export interface Person {
  id: string;
  /** As their list spells it */
  name: string;
  list: List;
  /** Their page: /builders/<id>/ for builders and listed founders, /people/<id>/ for hosts, guests and speakers */
  profile?: string;
  x?: string;
}

/** "David Silver, Lasse Espeholt" -> ["David Silver", "Lasse Espeholt"]. "and" and "&" separate names too. */
export const guestNames = (guest?: string) =>
  (guest ?? '')
    .split(/\s*(?:[,;&]|\band\b)\s*/)
    .map((name) => name.trim())
    .filter(Boolean);

/**
 * What two names are compared by: case, accents, dots, apostrophes and dashes don't count, and neither does a title in
 * front, so "Dr. Nworah Ayogu" is "Nworah Ayogu".
 */
export const nameKey = (name: string) =>
  searchable(name)
    .replace(/['’.]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^(?:dr|prof|professor|sir) (?=\S)/, '');

/** Every spelling an entry is found by: its name and aliases, and for "Shawn Wang (swyx)" also "Shawn Wang" and "swyx". */
export function spellings({ name, aliases = [] }: Pick<Listed, 'name' | 'aliases'>) {
  return [name, ...aliases].flatMap((spelling) => {
    const nickname = spelling.match(/^(.+?)\s*\((.+)\)$/);
    return nickname ? [spelling, nickname[1], nickname[2]] : [spelling];
  });
}

/**
 * A function that finds a person by name in these lists, or gives undefined for a name that's on none of them. Only
 * the site passes `speakers`.
 */
export function peopleFinder(lists: Record<Exclude<List, 'speakers'>, Listed[]> & { speakers?: Listed[] }) {
  const byKey = new Map<string, Person>();
  for (const list of ORDER) {
    for (const entry of lists[list] ?? []) {
      const person: Person = {
        id: entry.id,
        name: entry.name,
        list,
        ...(PAGES[list] && { profile: `${PAGES[list]}${entry.id}/` }),
        ...(entry.x && { x: entry.x }),
      };
      for (const spelling of spellings(entry)) {
        const key = nameKey(spelling);
        if (key && !byKey.has(key)) byKey.set(key, person);
      }
    }
  }
  return (name?: string): Person | undefined => (name ? byKey.get(nameKey(name)) : undefined);
}

/**
 * Whose a segment is, by name: the person it quotes, and when that isn't one of the episode's guests (a host, say) or
 * nothing is quoted, the guests too. So on a panel each segment goes to the guest it quotes, not to every guest of the
 * episode. `same` says whether two names are one person; by default it compares their nameKey.
 */
export function segmentPeople(
  segment: { guest?: string; quote?: { speaker?: string } },
  same = (a: string, b: string) => nameKey(a) === nameKey(b),
) {
  const guests = guestNames(segment.guest);
  const speaker = segment.quote?.speaker?.trim();
  if (!speaker) return guests;
  return guests.some((guest) => same(guest, speaker)) ? [speaker] : [speaker, ...guests];
}

// Letters that NFD doesn't split into a plain letter and an accent.
const LETTERS: Record<string, string> = { ł: 'l', ø: 'o', đ: 'd', ß: 'ss', æ: 'ae', œ: 'oe', ı: 'i' };

/** A lowercase-with-dashes id like the others in src/data: "Łukasz O'Brien" -> "lukasz-obrien" */
export const idFor = (name: string) =>
  searchable(name)
    .replace(/[łøđßæœı]/g, (letter) => LETTERS[letter])
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
