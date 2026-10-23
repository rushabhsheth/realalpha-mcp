// Copied from Real Alpha's site (app/src/lib/full-name.ts) by its scripts/mcp-repo.mjs.
/**
 * A segment's summary with the person talking named in full the first time it names them, for its page's
 * description and "About this segment" (src/pages/s/[slug].astro, src/lib/seo.ts › segmentSeo). The summaries call
 * people what the conversation calls them, a first name or a surname ("Alex answers…", "Bernhardsson weighs…"), and 4
 * of 511 named the person in full, while the passages Google's AI Overviews cited for "what did X say about Y" named X
 * in full 72% of the time (155 of 214, the citation check of 2026-10-22). Runs at build time and in the Worker.
 */
import { searchable } from './search';

// A word: letters, with the hyphens of names like Wissner-Gross. An apostrophe ends it, so "Ben’s" is Ben, then ’s.
const WORD = /\p{L}[\p{L}\p{M}-]*/gu;
const capitalized = (word: string) => /^\p{Lu}/u.test(word);
// The fewest letters a short form of a first name needs ("Alex" for Alexander), so "Al" or "Ed" alone match nothing.
const SHORT_FORM = 3;

/**
 * `text` with the first mention of `name` written out in full: the first name, a short form of it, or the surname,
 * each matched as a whole word in its own case. `spellings` are other ways the data writes the same person (the
 * quote's speaker, say), whose first and last words count too. A mention that's part of someone else's name is left
 * alone (a first name followed by a capitalized word, a surname after one), and so is a text that already has the
 * name in full in any of its spellings, or a name of one word.
 */
export function namedInFull(text: string, name: string | undefined, spellings: (string | undefined)[] = []): string {
  const full = name?.trim().replace(/\s+/g, ' ');
  if (!full || !full.includes(' ')) return text;
  const all = [full, ...spellings.flatMap((spelling) => (spelling?.includes(' ') ? [spelling.trim()] : []))];
  const plain = searchable(text);
  if (all.some((spelling) => plain.includes(searchable(spelling)))) return text;

  const firsts = new Set(all.map((spelling) => spelling.split(/\s+/)[0]));
  const lasts = new Set(all.map((spelling) => spelling.split(/\s+/).at(-1)!));
  const isFirst = (word: string) =>
    firsts.has(word) || (word.length >= SHORT_FORM && capitalized(word) && [...firsts].some((first) => first.startsWith(word)));
  const isLast = (word: string) => lasts.has(word) || [...lasts].some((last) => searchable(last) === searchable(word) && capitalized(word));

  const words = [...text.matchAll(WORD)].map((match) => ({ word: match[0], at: match.index! }));
  for (const [i, { word, at }] of words.entries()) {
    const first = isFirst(word);
    if (!first && !isLast(word)) continue;
    // The words either side, when only a space separates them: "Sam Altman", "Daniela Amodei".
    const before = words[i - 1];
    const after = words[i + 1];
    const touching = (a?: { word: string; at: number }, b?: { word: string; at: number }) =>
      Boolean(a && b && text.slice(a.at + a.word.length, b.at) === ' ');
    if (first && after && touching(words[i], after) && capitalized(after.word)) continue;
    if (!first && before && touching(before, words[i]) && capitalized(before.word)) continue;
    return text.slice(0, at) + full + text.slice(at + word.length);
  }
  return text;
}
