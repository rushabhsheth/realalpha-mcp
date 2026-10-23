// Copied from Real Alpha's site (app/src/lib/search.ts) by its scripts/mcp-repo.mjs.
/** Lowercase and drop accents, so typing "cristobal" finds "Cristóbal". Runs at build time and in the browser. */
export const searchable = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
