// Copied from Real Alpha's site (app/worker/mcp.ts) by its scripts/mcp-repo.mjs.
/**
 * The MCP server at https://realalpha.app/mcp, "ask what AI leaders said": AI assistants (Claude, ChatGPT, Cursor, VS
 * Code and the rest) connect to it over Streamable HTTP, with no account and no key, and search the moments Real Alpha
 * cuts from long interviews with the people building AI, read what one person said, see how they answer the big
 * questions (src/lib/questions.ts), and read a minute of an episode's transcript. It only reads (worker/moments.ts), and
 * every result carries its page on realalpha.app, so an assistant that answers from it links back to us. Each tool also
 * says what it answers (an outputSchema, with the same JSON as structuredContent) and the lines ChatGPT shows while it
 * runs, as OpenAI's plugin directory asks (marketing/launch/directories/mcp/chatgpt-app.md).
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
  /**
   * The token OpenAI's plugin portal shows to prove we own realalpha.app, served alone at OPENAI_CHALLENGE
   * (src/lib/mcp.ts) once the secret is set (marketing/launch/directories/mcp/chatgpt-app.md).
   */
  OPENAI_APPS_CHALLENGE?: string;
}

// What to do with the results comes first: OpenAI asks for the most important part in the first 512 characters
// (developers.openai.com/apps-sdk/build/mcp-server).
const INSTRUCTIONS = `Real Alpha (${SITE}) has the minutes worth hearing from long interviews with the people building AI: founders, CEOs and researchers, on shows like Lenny's Podcast, Dwarkesh Podcast, No Priors and BG2. Use it to find what a named person actually said, with the show and date, instead of paraphrasing from memory. When you use a moment, quote or paraphrase its \`quote\`, name the speaker, show and date, and link its \`url\` (the \`cite\` field has a ready line).

Each moment is a few minutes of one episode, with the speaker's own words, a summary and its page. Results are short excerpts and links: for the full context, send people to the moment's page, which plays the episode from that minute.`;

/** Read-only, no side effects, and nothing outside Real Alpha's own catalog. */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

/**
 * The line ChatGPT shows while a tool runs and once it's done (developers.openai.com/apps-sdk/reference › _meta fields
 * on tool descriptor, 64 characters at most each). Other clients ignore them.
 */
const saying = (invoking: string, invoked: string) => ({ 'openai/toolInvocation/invoking': invoking, 'openai/toolInvocation/invoked': invoked });

// What each tool answers, as its outputSchema: clients that read structuredContent, ChatGPT among them, get the same JSON
// as the text, which the others read. The SDK checks every answer against these, so a field moments.ts adds goes here too.
const MOMENT = {
  slug: z.string().describe("The moment's id, for get_moment"),
  title: z.string(),
  speaker: z.string().optional().describe("Who's talking"),
  speaker_role: z.string().optional().describe('What they do'),
  speaker_page: z.string().optional().describe('Their page on realalpha.app, with every moment of theirs'),
  show: z.string(),
  show_page: z.string(),
  episode: z.string(),
  date: z.string().describe('When the episode came out, YYYY-MM-DD'),
  quote: z.string().optional().describe('Their words, as said in the episode'),
  summary: z.string(),
  starts_at: z.string().describe('Where in the episode it starts, like 31:50'),
  length: z.string(),
  url: z.string().describe("The moment's page, which plays the episode from it: the link to cite"),
  episode_url: z.string().describe("The episode's page, from the moment on"),
  cite: z.string().describe('A line to credit it by'),
};
const MOMENTS = z.array(z.object(MOMENT));
const TIP = z.string().optional().describe('What to try when nothing matched');

const text = (value: Record<string, unknown>) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value, null, 1) }],
  structuredContent: value,
});
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
        'Search the moments Real Alpha cut from long interviews with the people building AI. Use it when someone asks what AI founders, CEOs or researchers have said about a subject. Matches the words of `query` against what each moment is about, the speaker\'s quote and its takeaways, best match first. Filter by who is talking (`person`), a company (someone from it talking, or it being discussed), a show, or how recent. Each result has the speaker, what they do, the show, the date, their quote, and the moment\'s page to cite. It only covers the episodes Real Alpha has cut, so no match doesn\'t mean nobody said it.',
      inputSchema: z.object({
        query: z.string().min(1).max(200).describe('What to look for, in a few words: "AI bubble", "coding agents replacing engineers", "scaling laws"'),
        person: z.string().max(100).optional().describe('Only moments where this person is talking, by name: "Sam Altman", "Dario Amodei"'),
        company: z.string().max(100).optional().describe('Only moments from someone at this company, or about it: "Anthropic", "Nvidia"'),
        show: z.string().max(100).optional().describe('Only moments from this show: "Lenny\'s Podcast", "Dwarkesh Podcast", "No Priors"'),
        since: z.string().regex(DATE, 'A date like 2026-01-31').optional().describe('Only episodes out on or after this date, YYYY-MM-DD'),
        limit: z.number().int().min(1).max(MOST).optional().describe(`How many moments to return, 8 if not given, ${MOST} at most`),
      }),
      outputSchema: z.object({
        matches: z.number().int().describe('How many moments matched, of which `moments` has the best'),
        moments: MOMENTS,
        tip: TIP,
      }),
      annotations: { title: 'Search what AI leaders said', ...READ_ONLY },
      _meta: saying('Searching what AI leaders said…', 'Searched what AI leaders said'),
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
        "One moment in full, by its slug (from search results) or its realalpha.app/s/ link: the speaker and what they do, the show and date, their quote, the summary and takeaways, its topics, the big questions it answers and how, and the episode's other best minutes. Use it to read a moment closely before quoting it, or when someone shares a realalpha.app/s/ link.",
      inputSchema: z.object({
        slug: z.string().min(1).max(200).describe('The moment\'s slug, like "ai-is-widening-the-gap-between-startups-and-incumbents", or its page\'s link'),
      }),
      outputSchema: z.object({
        ...MOMENT,
        takeaways: z.array(z.string()).describe("The moment's main points"),
        topics: z.array(z.string()),
        answers: z
          .array(z.object({ question: z.string(), question_id: z.string().describe('For answers_to'), stance: z.string(), says: z.string() }))
          .describe('The big questions it answers, which way, and what the speaker says'),
        more_from_the_episode: z.array(z.object({ title: z.string(), starts_at: z.string(), url: z.string() })).describe("The episode's other best minutes"),
      }),
      annotations: { title: 'Get one moment', ...READ_ONLY },
      _meta: saying('Opening the moment…', 'Opened the moment'),
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
        'What one person said in the interviews Real Alpha cut, newest first: every moment where they are talking, or only those on a topic, best match first. Also says who they are and links their page on Real Alpha, which lists all of it. Use it when someone asks about one named person\'s views. It only knows people Real Alpha has cut a moment with, and asks for the full name when a name could be more than one person.',
      inputSchema: z.object({
        person: z.string().min(2).max(100).describe('Their name: "Jensen Huang", "Demis Hassabis", or a surname when only one person has it'),
        topic: z
          .string()
          .max(100)
          .optional()
          .describe(`A topic or a few words: one of Real Alpha's topics (${topics.map((each) => each.label).join(', ')}) or anything else, like "open source"`),
        limit: z.number().int().min(1).max(MOST).optional().describe(`How many moments to return, 10 if not given, ${MOST} at most`),
      }),
      outputSchema: z.object({
        person: z.object({ name: z.string(), role: z.string().optional(), company: z.string().optional(), page: z.string().optional() }),
        moments_in_all: z.number().int().describe('How many moments Real Alpha has with them talking'),
        on_this_topic: z.number().int().optional().describe('How many of those are about the topic'),
        moments: MOMENTS,
        tip: TIP,
      }),
      annotations: { title: 'What did they say?', ...READ_ONLY },
      _meta: saying('Looking up what they said…', 'Looked up what they said'),
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
      description: `How the people building AI answer one of the big questions people ask about it, from the moments Real Alpha cut: grouped by which way they answer, the biggest group first, each with what the speaker says, who they are, the show and date. Use it when someone asks where AI leaders stand on one of these questions; for any other question, search_moments. The questions: ${questions
        .map((question) => `${question.id} (${question.question})`)
        .join('; ')}.`,
      inputSchema: z.object({
        question: z.enum(questions.map((question) => question.id) as [string, ...string[]]).describe('The question\'s id, like "is-ai-a-bubble"'),
      }),
      outputSchema: z.object({
        question: z.string(),
        page: z.string().optional().describe("The question's page on realalpha.app, once enough moments answer it"),
        answered_by: z.number().int().describe('How many moments answer it'),
        groups: z
          .array(
            z.object({
              stance: z.string().describe('Which way they answer'),
              count: z.number().int(),
              moments: z.array(z.object({ says: z.string().describe("The speaker's answer, in a few words"), ...MOMENT })),
            }),
          )
          .describe('The moments by which way they answer, the biggest group first'),
        tip: TIP,
      }),
      annotations: { title: 'How AI leaders answer a big question', ...READ_ONLY },
      _meta: saying('Gathering how AI leaders answer it…', 'Gathered how AI leaders answer it'),
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
        "About a minute of an episode's transcript, from a second into the video, for an episode Real Alpha cut: the lines with their times and, where the transcript says, who is talking, plus the link that plays the episode from there. Use it to check the exact words around a moment's quote (a moment's `episode_url` has the video id and second). Only the episodes Real Alpha cut have a transcript, never more than about a minute of one at a time, and a machine transcript can misspell names.",
      inputSchema: z.object({
        video: z.string().min(11).max(200).describe('The YouTube video id, like "dQw4w9WgXcQ", or a realalpha.app/v/ or YouTube link'),
        second: z.number().min(0).max(86_400).describe('Seconds into the video: 1910 for 31:50'),
      }),
      outputSchema: z.object({
        episode: z.string(),
        show: z.string(),
        date: z.string().describe('When the episode came out, YYYY-MM-DD'),
        from: z.string().describe('Where the excerpt starts, like 31:40'),
        lines: z.array(z.object({ at: z.string(), speaker: z.string().optional(), text: z.string() })),
        transcript: z.string().describe('Where the transcript comes from'),
        url: z.string().describe('The episode playing from that second'),
        moment: z.object({ title: z.string(), url: z.string() }).optional().describe('The moment the second falls in, if any'),
        cite: z.string(),
      }),
      annotations: { title: 'Read a minute of an episode', ...READ_ONLY },
      _meta: saying('Reading the transcript…', 'Read the transcript'),
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
      description:
        "The newest moments Real Alpha cut, newest episode first: each episode's best minutes, from every show or only one. Use it when someone asks what AI leaders have said lately, or what's new on a show.",
      inputSchema: z.object({
        n: z.number().int().min(1).max(MOST).optional().describe(`How many, 10 if not given, ${MOST} at most`),
        show: z.string().max(100).optional().describe('Only from this show: "Lenny\'s Podcast"'),
      }),
      outputSchema: z.object({ moments: MOMENTS }),
      annotations: { title: 'Latest moments', ...READ_ONLY },
      _meta: saying('Getting the latest moments…', 'Got the latest moments'),
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
