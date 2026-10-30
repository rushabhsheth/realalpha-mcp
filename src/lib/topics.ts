// Copied from Real Alpha's site (app/src/lib/topics.ts) by its scripts/mcp-repo.mjs.
// The parts of AI someone can follow: the topics the sheet that opens after a signup offers (PicksSheet.astro), in the
// order it shows them, under their groups. Each topic's `about` says what belongs in it: the model that tags each
// segment with these topics reads it (scripts/topics/prompt.mjs), so the homepage can put the segments a device picked
// first (src/pages/index.astro). It's plain TypeScript, like directory.ts, so the Workers (worker/picks.ts,
// ingest/cut.ts) and Node scripts can read it too.
//
// Beside them, the desks inside Real Alpha (the user's ask of 2026-10-26, from the Claude Doc "One kitchen, many
// Alphas"): Investing and Startups (ids markets and founders), with topics of their own that segments are tagged with
// too (deskTopics), and the sheet's one question above the parts of AI, "What do you follow?" (deskChoices): AI & Tech,
// Investing or Startups, whose answers are kept with the topics someone picks. A show can belong to a desk (shows.desk,
// ingest/migrations/0074_show_desks.sql), and its moments then stay off the home's feed for anyone who hasn't picked
// it (src/lib/desks.ts).
//
// An id is never part of another one, so Kit's Liquid can test a subscriber's topics with `contains`
// (worker/subscribers.test.ts checks, the desks' ids too). Ids are kept once people have picked them: rename the label
// instead.

export const topicGroups = [
  'Models & research',
  'Agents & apps',
  'Compute',
  'Science & robots',
  'Safety & society',
  'Business of AI',
] as const;

export interface Topic {
  id: string;
  label: string;
  group: (typeof topicGroups)[number];
  about: string;
}

export const topics: readonly Topic[] = [
  { id: 'frontier-models', label: 'Frontier models', group: 'Models & research', about: 'GPT, Claude, Gemini and the race between the labs' },
  { id: 'open-weights', label: 'Open-weight models', group: 'Models & research', about: 'Llama, DeepSeek, Qwen, Mistral: models anyone can download and run' },
  { id: 'reasoning-rl', label: 'Reasoning & RL', group: 'Models & research', about: 'reinforcement learning, post-training and reasoning models' },
  { id: 'scaling-laws', label: 'Scaling laws', group: 'Models & research', about: 'what more compute and data buy, and what training runs cost' },
  { id: 'agi', label: 'AGI & superintelligence', group: 'Models & research', about: 'timelines, takeoff and models that improve themselves' },
  { id: 'interpretability', label: 'Interpretability', group: 'Models & research', about: "what goes on inside a model, and reading its chain of thought" },
  { id: 'evals', label: 'Evals & benchmarks', group: 'Models & research', about: 'measuring what models can do, and reward hacking' },
  { id: 'training-data', label: 'Training data', group: 'Models & research', about: 'synthetic data, RL environments and buying data' },
  { id: 'world-models', label: 'World models', group: 'Models & research', about: 'models that predict video and simulate the world' },

  { id: 'ai-agents', label: 'AI agents', group: 'Agents & apps', about: 'agents that work on their own for hours: computer use, browsing, long tasks' },
  { id: 'coding-agents', label: 'Coding agents', group: 'Agents & apps', about: 'Claude Code, Cursor, Codex and vibe coding' },
  { id: 'ai-products', label: 'Building AI products', group: 'Agents & apps', about: 'product, design and launching AI apps' },
  { id: 'enterprise-ai', label: 'Enterprise AI', group: 'Agents & apps', about: 'how companies adopt, buy and deploy AI' },
  { id: 'consumer-ai', label: 'Consumer AI', group: 'Agents & apps', about: 'assistants, companions and AI apps for everyone' },
  { id: 'voice-ai', label: 'Voice AI', group: 'Agents & apps', about: 'speech models and voice agents' },
  { id: 'image-video', label: 'Image & video models', group: 'Agents & apps', about: 'Midjourney, Runway, Sora, Veo and generated media' },
  { id: 'data-infra', label: 'Data & databases', group: 'Agents & apps', about: 'databases, search, text-to-SQL and data platforms for AI' },

  { id: 'chips', label: 'Chips & GPUs', group: 'Compute', about: 'Nvidia, TPUs, AMD and chip startups' },
  { id: 'data-centers', label: 'Data centers & energy', group: 'Compute', about: 'the buildout, and the power it needs' },
  { id: 'inference', label: 'Inference & cost', group: 'Compute', about: 'serving models, local hardware and the price of tokens' },

  { id: 'robotics', label: 'Robotics', group: 'Science & robots', about: 'humanoids, robot learning and robot data' },
  { id: 'self-driving', label: 'Self-driving', group: 'Science & robots', about: 'Waymo, Tesla and autonomy' },
  { id: 'ai-science', label: 'Science & math', group: 'Science & robots', about: 'AI that proves theorems, runs experiments and makes discoveries' },
  { id: 'biology', label: 'Biology & drugs', group: 'Science & robots', about: 'protein models, virtual cells and drug discovery' },
  { id: 'healthcare', label: 'Health & medicine', group: 'Science & robots', about: 'diagnosis, care and the cost of medicine' },

  { id: 'ai-safety', label: 'Safety & alignment', group: 'Safety & society', about: 'alignment, rogue agents and the risks of powerful AI' },
  { id: 'policy', label: 'Policy & regulation', group: 'Safety & society', about: 'governments, laws and rules for AI' },
  { id: 'us-china', label: 'US–China race', group: 'Safety & society', about: 'Chinese labs, export controls and distillation' },
  { id: 'security', label: 'Cybersecurity', group: 'Safety & society', about: 'AI that finds exploits, and AI for defense' },
  { id: 'jobs', label: 'Jobs & the economy', group: 'Safety & society', about: 'work, productivity and growth' },

  { id: 'ai-startups', label: 'AI startups', group: 'Business of AI', about: 'starting, building and growing an AI company' },
  { id: 'investing', label: 'Investing in AI', group: 'Business of AI', about: 'venture capital, fundraising, valuations and the bubble question' },
  { id: 'big-tech', label: "Big Tech's AI bets", group: 'Business of AI', about: 'what Meta, Google, Microsoft, Apple and Amazon are doing' },
  { id: 'business-models', label: 'AI business models', group: 'Business of AI', about: 'pricing, margins, ads and who captures the value' },
  { id: 'talent', label: 'Talent & hiring', group: 'Business of AI', about: 'hiring researchers, talent wars and building teams' },
];

/** The desks' ids, as shows.desk keeps them (ingest/migrations/0074_show_desks.sql, 0077_more_desks.sql). */
export type Desk = 'markets' | 'founders' | 'sports' | 'news' | 'science';

/** A desk besides the AI and tech home: what it covers, and how its shows are cut and shown. */
export interface DeskInfo {
  id: Desk;
  label: string;
  about: string;
  /** What one of its shows is, in a sentence on the show's page: "a sports talk and interview show" */
  noun?: string;
  /**
   * Its shows are measured against the lower views bar (scripts/views/score.mjs › DESK_BIG), for a desk whose shows
   * are smaller than the home's
   */
  lowBar?: true;
  /**
   * The most of its shows' videos the cloud starts cutting in any 24 hours (ingest/cut.ts › deskRoom), and of one
   * show's, and for Politics & News of one side's (shows.lean), for a desk whose shows publish a lot
   */
  caps?: { day: number; show: number; lean?: number };
  /**
   * Kept apart from sponsors, for a desk whose shows aren't brand-safe (Particle's suitability_tier): no Presented-by on
   * its pages, and its shows only on the /best/ lists kept apart with it (src/lib/show-ranking.ts › LISTS, apart), which
   * have no Presented-by either
   */
  apart?: true;
  /**
   * Its shows must have a YouTube channel (`npm run directory` refuses one without), the user's call for Sports on
   * 2026-10-26 ("only then go with shows and episodes that have a video"), then for Politics & News ("even for politics
   * and news we want video only"), and Science's too. Every cut is of a YouTube video, with its podcast feed only for
   * the transcript, so an episode with no video is never cut.
   */
  videoOnly?: true;
  /**
   * The parts of AI whose moments also lead the feed of someone who picked the desk: an AI-in-science moment stays on
   * the AI home, and comes first for Science's readers too (deskPicksOf).
   */
  alsoTopics?: readonly string[];
}

/**
 * The desks besides the AI and tech home, each with what it covers. The cut asks a desk show's episodes for the desk's
 * insiders (scripts/segments/cut.mjs › DESK_RULES), and a moment is the desk's when its show is (shows.desk) or it's
 * tagged with one of the desk's topics. Sports and Politics & News came on 2026-10-26 too, the user's ask ("i want to
 * try out sports and politics and news as desks as well, basically go full on inshorts way"), with guardrails: talk
 * and interview shows only, a lineup balanced across left, center and right (shows.lean), daily caps, and no sponsors.
 * Science came the same night ("lets add science desk as well"): shows with their own video only, no pseudoscience,
 * and findings with their caveats (scripts/segments/cut.mjs › DESK_RULES, CAVEAT_VOICE).
 */
export const desks: readonly DeskInfo[] = [
  { id: 'markets', label: 'Investing', about: 'public markets and the economy, AI stocks and chips as investments, and venture and private markets', lowBar: true },
  { id: 'founders', label: 'Startups', about: 'starting, building and running companies', lowBar: true },
  {
    id: 'sports',
    label: 'Sports',
    about: 'athletes, coaches and the people who run sport, in their own words',
    noun: 'a sports talk and interview show',
    caps: { day: 3, show: 1 },
    apart: true,
    videoOnly: true,
  },
  {
    id: 'news',
    label: 'Politics & News',
    about: 'politics and the news, from shows on the left, the center and the right',
    noun: 'a politics and news show',
    caps: { day: 3, show: 1, lean: 1 },
    apart: true,
    videoOnly: true,
  },
  {
    id: 'science',
    label: 'Science',
    about: 'physics, space, life and the mind, from the scientists doing the work',
    noun: 'a science interview show',
    lowBar: true,
    caps: { day: 3, show: 1 },
    videoOnly: true,
    alsoTopics: ['ai-science', 'biology'],
  },
];

/** Whether a value is a desk's id, as shows.desk keeps it. */
export const isDesk = (value: unknown): value is Desk => desks.some((desk) => desk.id === value);

/** A desk by its id. */
export const deskOf = (id: string | undefined): DeskInfo | undefined => desks.find((desk) => desk.id === id);

/**
 * The day the sheet first asked "What do you follow?" (UTC), from which `npm run stats` and the daily report
 * count the signups who picked each desk (scripts/feed-stats/desks.mjs). Set to the day it went live.
 */
export const DESKS_ASKED = '2026-10-27';

/**
 * The answers to the sheet's one question above the parts of AI, "What do you follow?", in its order. Each is kept as a
 * topic someone picked (subscribers.topics, Kit's topics field), so it counts as a vote for its desk (`npm run stats` ›
 * Desks) and lets that desk's moments into their feed. AI & Tech is the home, which everyone's feed has: its count is
 * the baseline the desks' are set against (the user's call of 2026-10-26, in place of a Tech of its own).
 */
export const deskChoices: readonly { id: string; label: string; desk?: Desk }[] = [
  { id: 'desk-ai-tech', label: 'AI & Tech' },
  { id: 'desk-markets', label: 'Investing', desk: 'markets' },
  { id: 'desk-founders', label: 'Startups', desk: 'founders' },
  { id: 'desk-science', label: 'Science', desk: 'science' },
  { id: 'desk-sports', label: 'Sports', desk: 'sports' },
  { id: 'desk-news', label: 'Politics & News', desk: 'news' },
];

export interface DeskTopic {
  id: string;
  label: string;
  desk: Desk;
  about: string;
}

/**
 * The desks' topics, which the model tags segments with beside the parts of AI (scripts/topics/prompt.mjs), whatever
 * show they're from: an AI startup's fundraising story is the Startups desk's too. Not offered in the sheet, where the
 * desk itself is the pick.
 */
export const deskTopics: readonly DeskTopic[] = [
  { id: 'public-markets', label: 'Markets & the economy', desk: 'markets', about: 'stocks, bonds, rates, inflation, the Fed and where the economy is heading' },
  { id: 'ai-stocks', label: 'AI stocks & chips', desk: 'markets', about: 'Nvidia, the hyperscalers and the AI trade as investments: earnings, valuations and whether it is a bubble' },
  { id: 'private-markets', label: 'Venture & private markets', desk: 'markets', about: 'how venture funds, private equity and private credit invest, raise money and pay it back' },
  { id: 'fundraising', label: 'Fundraising', desk: 'founders', about: 'raising money for a company: rounds, terms, pitching and picking investors' },
  { id: 'growth', label: 'Growth', desk: 'founders', about: 'finding customers: sales, marketing, pricing and product-market fit' },
  { id: 'hiring', label: 'Hiring & teams', desk: 'founders', about: 'hiring, firing, culture and managing people as a company grows' },
  { id: 'company-histories', label: 'Company histories', desk: 'founders', about: 'how a company was built: its founding, its near-death moments and its turning points' },
];

/** Every topic a segment can carry: the parts of AI, then the desks'. */
export const segmentTopics: readonly { id: string; label: string; about: string }[] = [...topics, ...deskTopics];

/**
 * The desk answers a moment matches, by their ids in the picks (deskChoices): its show's desk, and the desks of its
 * topics. The homepage adds them to a card's topics, and the alerts to a moment's, so someone who picked a desk gets
 * its moments first, as a topic they follow.
 */
export function deskPicksOf(topicIds: readonly string[], showDesk?: string): string[] {
  const its = new Set<string | undefined>([
    showDesk,
    ...topicIds.map((id) => deskTopics.find((topic) => topic.id === id)?.desk),
    ...desks.filter((desk) => desk.alsoTopics?.some((id) => topicIds.includes(id))).map((desk) => desk.id),
  ]);
  return deskChoices.filter((choice) => choice.desk && its.has(choice.desk)).map((choice) => choice.id);
}

/** A desk's answer in the picks: 'desk-markets' for the Investing desk. */
export const deskPick = (desk: Desk): string => deskChoices.find((choice) => choice.desk === desk)!.id;
