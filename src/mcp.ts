// Copied from Real Alpha's site (app/worker/mcp.ts) by its scripts/mcp-repo.mjs.
/**
 * The MCP server at https://realalpha.app/mcp, "ask what AI leaders said": AI assistants (Claude, ChatGPT, Cursor, VS
 * Code and the rest) connect to it over Streamable HTTP, with no account and no key, and search the moments Real Alpha
 * cuts from long interviews with the people building AI, read what one person said, see how they answer the big
 * questions (src/lib/questions.ts), and read a minute of an episode's transcript. It only reads (worker/moments.ts), and
 * every result carries its page on realalpha.app, so an assistant that answers from it links back to us.
 *
 * Stateless: the Agents SDK's createMcpHandler makes a fresh server for each request, with no session and no Durable
 * Object, and answers both the 2026-07-28 protocol and the 2025 Streamable HTTP clients. Each address gets
 * RATE_LIMIT requests a minute (src/lib/mcp.ts, wrangler.jsonc › ratelimits). A browser that opens /mcp is sent to
 * /mcp/, the page that says how to add the server (src/pages/mcp.astro).
 */

import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';
import { RATE_LIMIT, ROUTE, SERVER } from './lib/mcp';
import { nameKey } from './lib/people';
import { questionById, questions } from './lib/questions';
import { SITE } from './lib/site';
import { segmentTopics as topics } from './lib/topics';
import {
  answersTo,
  type Database,
  findCompany,
  findPerson,
  findShow,
  getMoment,
  latestMoments,
  MOST,
  type MomentsEnv,
  momentsOf,
  searchMoments,
  transcriptExcerpt,
} from './moments';


export interface McpEnv extends MomentsEnv {
  /** The Workers rate limiter for /mcp (wrangler.jsonc › ratelimits). Missing in tests that don't give one. */
  MCP_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

const INSTRUCTIONS = `Real Alpha (${SITE}) cuts the minutes worth hearing from long interviews and podcasts with the people building AI: founders, CEOs and researchers at AI labs and companies, on shows like Lenny's Podcast, Dwarkesh Podcast, No Priors and BG2. Each moment is a few minutes of one episode, with the speaker's own words, a summary and its page.

Use it to find what a named person actually said, with the date and the show, instead of paraphrasing from memory. When you use a moment, quote or paraphrase its \`quote\`, name the speaker, show and date, and link its \`url\` (the \`cite\` field has a ready line). Results are short excerpts and links: for the full context, send people to the moment's page, which plays the episode from that minute.`;

/** Read-only, no side effects, and nothing outside Real Alpha's own catalog. */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 1) }] });
const problem = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
// An 11-character YouTube id, on its own or in any link to it (ours or YouTube's).
const VIDEO_ID = /(?:^|[/=]|v\/)([A-Za-z0-9_-]{11})(?=$|[/?&#])/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A slug, or the slug in a link to its page. */
const slugOf = (value: string) => value.trim().match(/\/s\/([a-z0-9-]+)/)?.[1] ?? value.trim().toLowerCase();

function serverFor(env: McpEnv & { DB: Database }) {
  const server = new McpServer(
    { name: SERVER.name, title: SERVER.title, version: SERVER.version, websiteUrl: `${SITE}/mcp/` },
    { instructions: INSTRUCTIONS },
  );

  /** The people a name could mean, as a message that asks for the full name. */
  const which = (name: string, people: { name: string; role?: string }[]) =>
    problem(`"${name}" could be ${people.map((person) => (person.role ? `${person.name} (${person.role})` : person.name)).join(', ')}. Ask again with their full name.`);

  server.registerTool(
    'search_moments',
    {
      title: 'Search what AI leaders said',
      description:
        'Search the moments Real Alpha cut from long interviews with the people building AI. Matches the words of `query` against what each moment is about, the speaker\'s quote and its takeaways, best match first. Filter by who is talking (`person`), a company (someone from it talking, or it being discussed), a show, or how recent. Each result has the speaker, what they do, the show, the date, their quote, and the moment\'s page to cite.',
      inputSchema: z.object({
        query: z.string().min(1).max(200).describe('What to look for, in a few words: "AI bubble", "coding agents replacing engineers", "scaling laws"'),
        person: z.string().max(100).optional().describe('Only moments where this person is talking, by name: "Sam Altman", "Dario Amodei"'),
        company: z.string().max(100).optional().describe('Only moments from someone at this company, or about it: "Anthropic", "Nvidia"'),
        show: z.string().max(100).optional().describe('Only moments from this show: "Lenny\'s Podcast", "Dwarkesh Podcast", "No Priors"'),
        since: z.string().regex(DATE, 'A date like 2026-01-31').optional().describe('Only episodes out on or after this date, YYYY-MM-DD'),
        limit: z.number().int().min(1).max(MOST).optional().describe(`How many moments to return, 8 if not given, ${MOST} at most`),
      }),
      annotations: { title: 'Search what AI leaders said', ...READ_ONLY },
    },
    async ({ query, person, company, show, since, limit }) => {
      const found = person ? await findPerson(env.DB, person) : undefined;
      if (found && 'ambiguous' in found) return which(person!, found.ambiguous);
      if (found && 'missing' in found) return problem(`No one called "${person}" is in Real Alpha's moments. Try their full name.`);
      const shown = show ? await findShow(env.DB, show) : undefined;
      if (shown && 'ambiguous' in shown) return problem(`"${show}" could be ${shown.ambiguous.map((each) => each.name).join(', ')}.`);
      if (shown && 'missing' in shown) return problem(`Real Alpha doesn't follow a show called "${show}".`);
      const result = await searchMoments(env, {
        query,
        ...(found && { person: found.found }),
        ...(company && { company: await findCompany(env.DB, company) }),
        ...(shown && { show: shown.found.id }),
        ...(since && { since }),
        ...(limit && { limit }),
      });
      if (result.total === 0) return text({ matches: 0, moments: [], tip: 'Nothing matched. Try fewer or broader words, or drop a filter.' });
      return text({ matches: result.total, moments: result.moments });
    },
  );

  server.registerTool(
    'get_moment',
    {
      title: 'Get one moment',
      description:
        "One moment in full, by its slug (from search results) or its realalpha.app/s/ link: the speaker and what they do, the show and date, their quote, the summary and takeaways, its topics, the big questions it answers and how, and the episode's other best minutes.",
      inputSchema: z.object({
        slug: z.string().min(1).max(200).describe('The moment\'s slug, like "ai-is-widening-the-gap-between-startups-and-incumbents", or its page\'s link'),
      }),
      annotations: { title: 'Get one moment', ...READ_ONLY },
    },
    async ({ slug }) => {
      const id = slugOf(slug);
      if (!SLUG.test(id)) return problem(`"${slug}" isn't a moment's slug: they look like "ai-is-widening-the-gap-between-startups-and-incumbents".`);
      const moment = await getMoment(env, id);
      return moment ? text(moment) : problem(`There's no moment "${id}" on Real Alpha. Find one with search_moments.`);
    },
  );

  server.registerTool(
    'what_did_they_say',
    {
      title: 'What did they say?',
      description:
        'What one person said in the interviews Real Alpha cut, newest first: every moment where they are talking, or only those on a topic, best match first. Also says who they are and links their page on Real Alpha, which lists all of it.',
      inputSchema: z.object({
        person: z.string().min(2).max(100).describe('Their name: "Jensen Huang", "Demis Hassabis", or a surname when only one person has it'),
        topic: z
          .string()
          .max(100)
          .optional()
          .describe(`A topic or a few words: one of Real Alpha's topics (${topics.map((each) => each.label).join(', ')}) or anything else, like "open source"`),
        limit: z.number().int().min(1).max(MOST).optional().describe(`How many moments to return, 10 if not given, ${MOST} at most`),
      }),
      annotations: { title: 'What did they say?', ...READ_ONLY },
    },
    async ({ person, topic, limit }) => {
      const found = await findPerson(env.DB, person);
      if ('ambiguous' in found) return which(person, found.ambiguous);
      if ('missing' in found) return problem(`No one called "${person}" is in Real Alpha's moments. Try their full name.`);
      const who = found.found;
      const result = await momentsOf(env, who, topic, limit);
      if (result.all === 0) return problem(`Real Alpha hasn't cut a moment with ${who.name} talking yet.`);
      // Someone on none of our lists has a page once one of their moments quotes them, and goes by the name it spells
      // ("Inès Ångström", asked about as "Ines Angstrom").
      const quoted = who.list === 'speakers' ? result.moments.find((moment) => moment.speaker && who.keys.includes(nameKey(moment.speaker))) : undefined;
      const name = quoted?.speaker ?? who.name;
      const page = who.list === 'speakers' ? quoted?.speaker_page : who.page;
      return text({
        person: { name, ...(who.role && { role: who.role }), ...(who.company && { company: who.company }), ...(page && { page }) },
        moments_in_all: result.all,
        ...(topic && { on_this_topic: result.matching }),
        moments: result.moments,
        ...(topic && result.matching === 0 && { tip: `None of ${name}'s moments is about "${topic}". Leave out the topic to see them all.` }),
      });
    },
  );

  server.registerTool(
    'answers_to',
    {
      title: 'How AI leaders answer a big question',
      description: `How the people building AI answer one of the big questions people ask about it, from the moments Real Alpha cut: grouped by which way they answer, the biggest group first, each with what the speaker says, who they are, the show and date. The questions: ${questions
        .map((question) => `${question.id} (${question.question})`)
        .join('; ')}.`,
      inputSchema: z.object({
        question: z.enum(questions.map((question) => question.id) as [string, ...string[]]).describe('The question\'s id, like "is-ai-a-bubble"'),
      }),
      annotations: { title: 'How AI leaders answer a big question', ...READ_ONLY },
    },
    async ({ question }) => {
      const asked = questionById.get(question)!;
      const result = await answersTo(env, asked);
      if (result.answered_by === 0) return text({ ...result, tip: 'No moment Real Alpha has cut answers this one yet.' });
      return text(result);
    },
  );

  server.registerTool(
    'transcript_excerpt',
    {
      title: 'Read a minute of an episode',
      description:
        "About a minute of an episode's transcript, from a second into the video, for an episode Real Alpha cut: the lines with their times and, where the transcript says, who is talking, plus the link that plays the episode from there. Use it to check the exact words around a moment's quote (a moment's `episode_url` has the video id and second).",
      inputSchema: z.object({
        video: z.string().min(11).max(200).describe('The YouTube video id, like "dQw4w9WgXcQ", or a realalpha.app/v/ or YouTube link'),
        second: z.number().min(0).max(86_400).describe('Seconds into the video: 1910 for 31:50'),
      }),
      annotations: { title: 'Read a minute of an episode', ...READ_ONLY },
    },
    async ({ video, second }) => {
      const id = video.trim().match(VIDEO_ID)?.[1];
      if (!id) return problem(`"${video}" isn't a YouTube video id: they're 11 letters, digits, - and _, like "dQw4w9WgXcQ".`);
      const excerpt = await transcriptExcerpt(env, id, second);
      if (!excerpt) return problem(`Real Alpha has no transcript of ${id}: only the episodes it cut have one. Find them with search_moments.`);
      if ('past_the_end' in excerpt) return problem(`The episode is only ${excerpt.past_the_end} long.`);
      return text(excerpt);
    },
  );

  server.registerTool(
    'latest_moments',
    {
      title: 'Latest moments',
      description: "The newest moments Real Alpha cut, newest episode first: each episode's best minutes, from every show or only one.",
      inputSchema: z.object({
        n: z.number().int().min(1).max(MOST).optional().describe(`How many, 10 if not given, ${MOST} at most`),
        show: z.string().max(100).optional().describe('Only from this show: "Lenny\'s Podcast"'),
      }),
      annotations: { title: 'Latest moments', ...READ_ONLY },
    },
    async ({ n, show }) => {
      const shown = show ? await findShow(env.DB, show) : undefined;
      if (shown && 'ambiguous' in shown) return problem(`"${show}" could be ${shown.ambiguous.map((each) => each.name).join(', ')}.`);
      if (shown && 'missing' in shown) return problem(`Real Alpha doesn't follow a show called "${show}".`);
      return text({ moments: await latestMoments(env, n ?? 10, shown?.found.id) });
    },
  );

  return server;
}

/**
 * /mcp, and /mcp/ for clients given the address with a slash: POSTs are MCP messages, for the handler, once the address
 * is under its rate limit. Any other look at either, a browser's, a crawler's or a link checker's, gets the page about
 * the server, /mcp/, with the 301 every page's address without its slash has (worker/redirects.test.ts). Only a GET
 * that asks for an event stream is an MCP client's, which the stateless handler turns away with a 405.
 */
export async function answerMcp(request: Request, env: McpEnv, ctx?: { waitUntil(work: Promise<unknown>): void }): Promise<Response> {
  const url = new URL(request.url);
  const looking = request.method === 'GET' || request.method === 'HEAD';
  if (looking && !request.headers.get('Accept')?.includes('text/event-stream')) {
    return url.pathname === ROUTE
      ? new Response(null, { status: 301, headers: { Location: `${ROUTE}/${url.search}` } })
      : env.ASSETS.fetch(request);
  }
  if (request.method === 'POST' && env.MCP_LIMIT) {
    // Until realalpha.app moves to this account, requests through proxy/ all come from Cloudflare's own address, so
    // they share one count a minute in each Cloudflare location.
    const key = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.MCP_LIMIT.limit({ key });
    if (!success) {
      return Response.json(
        { jsonrpc: '2.0', error: { code: -32000, message: `Too many requests: ${RATE_LIMIT} a minute. Try again in a minute.` }, id: null },
        { status: 429, headers: { 'Retry-After': '60', 'Access-Control-Allow-Origin': '*' } },
      );
    }
  }
  const db = env.DB;
  if (!db) return Response.json({ jsonrpc: '2.0', error: { code: -32603, message: 'No database here.' }, id: null }, { status: 503 });
  // The handler answers one exact path, so /mcp/ comes to it as /mcp.
  const asked = url.pathname === ROUTE ? request : new Request(new URL(`${ROUTE}${url.search}`, url), request);
  const handler = createMcpHandler(() => serverFor({ ...env, DB: db }), {
    route: ROUTE,
    // Any site's page may call it: it's public and reads nothing a browser holds (no cookies, no accounts), so a
    // browser's Origin protects nothing here, and MCP playgrounds on other sites (Smithery's, Glama's) need it.
    allowedOriginHostnames: '*',
  });
  // Cloudflare's context, or in the tests one that finishes nothing later.
  const context = { waitUntil: (work: Promise<unknown>) => ctx?.waitUntil(work), passThroughOnException() {}, props: {} };
  return handler(asked, env, context as unknown as Parameters<typeof handler>[2]);
}
