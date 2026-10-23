/**
 * The MCP server as a Worker of its own. On realalpha.app it runs inside Real Alpha's site Worker, which answers /mcp
 * with the same answerMcp() as here (src/mcp.ts and src/moments.ts are copied from it). Here there's no site beside
 * it: every moment in the database counts (there's no build to wait for), and anyone just looking at /mcp is sent to
 * the page about the hosted server.
 */
import { answerMcp, type McpEnv } from './mcp';

const PAGE = 'https://realalpha.app/mcp/';
// No site files here, so no /build.txt: liveBuild() then counts every moment (src/moments.ts).
const NO_SITE = { fetch: async () => new Response('Not found', { status: 404 }) };

export default {
  async fetch(request: Request, env: Omit<McpEnv, 'ASSETS'>, ctx?: { waitUntil(work: Promise<unknown>): void }): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname !== '/mcp' && pathname !== '/mcp/') return new Response(`The MCP server is at /mcp. About it: ${PAGE}`, { status: 404 });
    const looking = request.method === 'GET' || request.method === 'HEAD';
    if (looking && !request.headers.get('Accept')?.includes('text/event-stream')) return Response.redirect(PAGE, 302);
    return answerMcp(request, { ...env, ASSETS: NO_SITE }, ctx);
  },
};
