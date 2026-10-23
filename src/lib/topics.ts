// Copied from Real Alpha's site (app/src/lib/topics.ts) by its scripts/mcp-repo.mjs.
// The parts of AI someone can follow: the topics the sheet that opens after a signup offers (PicksSheet.astro), in the
// order it shows them, under their groups. Each topic's `about` says what belongs in it: the model that tags each
// segment with these topics reads it (scripts/topics/prompt.mjs), so the homepage can put the segments a device picked
// first (src/pages/index.astro). It's plain TypeScript, like directory.ts, so the Workers (worker/picks.ts,
// ingest/cut.ts) and Node scripts can read it too.
//
// An id is never part of another one, so Kit's Liquid can test a subscriber's topics with `contains`
// (worker/picks.test.ts checks). Ids are kept once people have picked them: rename the label instead.

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
