// Copied from Real Alpha's site (app/src/lib/mcp.ts) by its scripts/mcp-repo.mjs.
// What the MCP server (worker/mcp.ts) and its page (src/pages/mcp.astro) both say about it: its name and version, as
// clients and the MCP Registry show them (marketing/launch/directories/mcp/server.json has the same), its address, and
// how many requests a minute one address can send (wrangler.jsonc › ratelimits › MCP_LIMIT has to say the same).
// Plain TypeScript with no imports, so the page doesn't bring the server's SDK into the build.

export const SERVER = { name: 'app.realalpha/moments', title: 'Real Alpha', version: '1.0.0' };
/** The path the server answers on, at the site's address */
export const ROUTE = '/mcp';
export const RATE_LIMIT = 120;
/** Its code, in public (scripts/mcp-repo.mjs writes it from here) */
export const REPOSITORY = 'https://github.com/rushabhsheth/realalpha-mcp';
