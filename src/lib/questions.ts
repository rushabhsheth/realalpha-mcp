// Copied from Real Alpha's site (app/src/lib/questions.ts) by its scripts/mcp-repo.mjs.
// The big questions about AI that people search for, each answered on its own page (/q/<id>/) by the moments we cut
// where someone building AI answers it: grouped by how they answer (`stances`), newest first. They come from the
// keyword research of 2026-10-22 (Ahrefs, US): debate questions builders answer, with search volume and low difficulty,
// and Google showing an AI Overview for most, so dated, attributed claims are what gets cited.
//
// A model reads each segment's title, summary, takeaways and quote, and says which of these it really answers and which
// way (scripts/questions/prompt.mjs reads `about` and each stance's `about`). `npm run questions` asks about the
// segments cut so far, and the ingest Worker's Cut workflow asks about each new cut. A question gets its page once
// PAGE_FROM moments answer it (src/lib/question-pages.ts). Plain TypeScript, like topics.ts, so the Worker and Node
// scripts read it too.
//
// An id is a page's address, so keep it once the page is live: change the wording instead.

export interface Stance {
  id: string;
  /** The heading over its moments on the page */
  label: string;
  /**
   * What the people in it say, as a verb phrase after a number, for the page's opening sentence: "say it isn't a
   * bubble". After one, its first word takes an s: "says it isn't a bubble".
   */
  says: string;
  /** What counts as answering this way, for the model */
  about: string;
}

export interface Question {
  /** The page's address, /q/<id>/, worded as people search */
  id: string;
  /** The page's heading, the question itself */
  question: string;
  /** The page's <title>, which matches the question as people search it */
  title: string;
  /** The searches it answers, with their monthly US volume, as of the research */
  searches: string;
  /** What counts as answering it, for the model */
  about: string;
  /** The ways a moment can answer it, in the order a tie between their counts puts them on the page */
  stances: Stance[];
}

/** How many moments a question needs before it gets a page. */
export const PAGE_FROM = 5;

export const questions: readonly Question[] = [
  {
    id: 'is-ai-a-bubble',
    question: 'Is AI a bubble?',
    title: 'Is AI a bubble? What the people building it say',
    searches: 'ai bubble 62k, is ai a bubble 3k, when will the ai bubble burst 1.4k',
    about:
      'whether the money going into AI (valuations, startup rounds, the spending on data centers and chips) is a bubble that will burst or deflate, or is backed by demand and revenue that will pay for it',
    stances: [
      { id: 'no', label: 'Not a bubble', says: "say it isn't a bubble", about: 'the spending or the valuations are backed by real demand, revenue or usage, so it is not a bubble' },
      {
        id: 'partly',
        label: 'Partly a bubble',
        says: 'say it partly is',
        about: 'some of it is froth or overbuilt, or a shakeout is coming, while the technology and the demand are real',
      },
      { id: 'yes', label: 'A bubble', says: 'say it is a bubble', about: 'spending, valuations or expectations run well ahead of what AI will earn, and a fall is coming' },
    ],
  },
  {
    id: 'which-jobs-will-ai-replace',
    question: 'Which jobs will AI replace, and which are safe?',
    title: 'Which jobs will AI replace? What the people building it say',
    searches: 'what jobs will ai replace 2.5k, what jobs are safe from ai 2.3k, will ai replace lawyers, accountants, doctors 1–2k each',
    about:
      'what AI does to people’s jobs: which jobs or kinds of work it takes over, which change, which stay with people or grow, and what that means for employment. Talk about AI doing tasks counts only when it says what happens to the people who did them',
    stances: [
      { id: 'replaced', label: 'Jobs AI will replace', says: 'say AI will take over jobs', about: 'names jobs or work AI will take over, or says jobs will be lost or hiring will shrink' },
      { id: 'changed', label: 'Jobs that change', says: 'say jobs will change more than vanish', about: 'jobs will change rather than disappear: people do different work, with AI as their tool' },
      { id: 'safe', label: 'Jobs that are safe or grow', says: 'say some work stays with people or grows', about: 'names work AI won’t take, or says AI creates jobs or more demand for people' },
    ],
  },
  {
    id: 'will-ai-replace-software-engineers',
    question: 'Will AI replace software engineers?',
    title: 'Will AI replace software engineers? What the people building it say',
    searches: 'will ai replace software engineers, will ai replace programmers',
    about:
      'whether AI coding agents take over programmers’ work: fewer software engineers, different ones, or more of them. A segment about coding agents counts only when it says what happens to the people who write software',
    stances: [
      { id: 'fewer', label: 'Fewer engineers', says: 'say AI will replace engineers', about: 'AI will write most code and companies will need fewer engineers, or hire fewer' },
      { id: 'changed', label: 'The job changes', says: 'say the job changes', about: 'engineers stay but the job changes: they direct agents, review, design or own outcomes' },
      { id: 'more', label: 'More engineers', says: 'say we will need more engineers', about: 'cheaper software means more of it and more demand for engineers, or engineers stay essential' },
    ],
  },
  {
    id: 'will-ai-replace-doctors',
    question: 'Will AI replace doctors?',
    title: 'Will AI replace doctors? What the people building it say',
    searches: 'will ai replace doctors 1–2k',
    about: 'whether AI takes over what doctors and other clinicians do: diagnosis, treatment and care. It must say what happens to the doctors, not only what AI can diagnose',
    stances: [
      { id: 'yes', label: 'AI will do doctors’ work', says: 'say AI will do much of it', about: 'AI will do much of what doctors do, or patients will turn to AI instead of doctors' },
      { id: 'changed', label: 'Doctors with AI', says: 'say doctors will work with AI', about: 'doctors stay, with AI as a tool that changes how they work' },
      { id: 'no', label: 'Doctors stay', says: 'say doctors stay', about: 'AI won’t replace doctors, or there will be more need for them' },
    ],
  },
  {
    id: 'will-ai-replace-lawyers',
    question: 'Will AI replace lawyers?',
    title: 'Will AI replace lawyers? What the people building it say',
    searches: 'will ai replace lawyers 1–2k',
    about: 'whether AI takes over what lawyers do. It must say what happens to lawyers or legal work, not only that AI can read contracts',
    stances: [
      { id: 'yes', label: 'AI will do lawyers’ work', says: 'say AI will do much of it', about: 'AI will do much of what lawyers do, or firms will need fewer of them' },
      { id: 'changed', label: 'Lawyers with AI', says: 'say lawyers will work with AI', about: 'lawyers stay, with AI changing how they work and bill' },
      { id: 'no', label: 'Lawyers stay', says: 'say lawyers stay', about: 'AI won’t replace lawyers, or there will be more legal work' },
    ],
  },
  {
    id: 'is-saas-dead',
    question: 'Is SaaS dead?',
    title: 'Is SaaS dead? What the people building AI say',
    searches: 'saas is dead 400 US, 3.5k worldwide',
    about:
      'whether AI kills, shrinks or reshapes software-as-a-service companies: per-seat pricing, systems of record, and incumbents against AI-native startups and agents',
    stances: [
      { id: 'dying', label: 'SaaS is dying', says: 'say SaaS is dying', about: 'AI and agents will replace SaaS products or make them worth far less' },
      { id: 'changing', label: 'SaaS changes', says: 'say SaaS will change', about: 'SaaS survives but changes: pricing moves off seats, agents sit on top, the winners shift' },
      { id: 'surviving', label: 'SaaS survives', says: 'say SaaS survives', about: 'SaaS companies keep their place, or AI makes them stronger' },
    ],
  },
  {
    id: 'when-will-we-get-agi',
    question: 'When will we get AGI?',
    title: 'When will we get AGI? What the people building it say',
    searches: 'when will agi arrive, agi timeline, superintelligence',
    about:
      'when AI will match people at most work (AGI) or go beyond them (superintelligence): a timeline, how close it is, what is still missing, or whether the idea of a date makes sense',
    stances: [
      { id: 'soon', label: 'Within a few years', says: 'say it comes within a few years', about: 'AGI or human-level AI comes by about 2030, or is nearly here' },
      { id: 'later', label: 'Further off', says: 'say it is further off', about: 'it is a decade or more away, or key pieces are still missing' },
      { id: 'no-date', label: 'No single moment', says: 'say there is no single moment', about: 'AGI is ill-defined, gradual or the wrong question, with no date' },
    ],
  },
  {
    id: 'is-openai-profitable',
    question: 'How does OpenAI make money, and is it profitable?',
    title: 'Is OpenAI profitable? What the people building AI say',
    searches: 'is openai profitable 1.3k, how does openai make money',
    about:
      'OpenAI’s business: where its revenue comes from (ChatGPT subscriptions, the API, enterprise deals, ads), what it spends on compute, and whether or when it makes a profit. It must be about OpenAI itself, not AI labs in general',
    stances: [
      { id: 'how', label: 'How OpenAI makes money', says: 'say how it earns', about: 'how OpenAI earns: its products, customers and revenue, without judging whether it pays off' },
      { id: 'pays-off', label: 'It will pay off', says: 'say it will pay off', about: 'OpenAI’s spending will pay off, or it will be very profitable' },
      { id: 'doubts', label: 'Doubts', says: 'doubt it pays off', about: 'OpenAI loses money, may not earn back what it spends, or its business is at risk' },
    ],
  },
  {
    id: 'ai-predictions',
    question: 'What will AI look like in the next few years?',
    title: 'AI predictions for the next few years, from the people building it',
    searches: 'ai predictions 1k, ai trends 2026 2.2k, future of ai 4.6k',
    about:
      'a concrete prediction about AI: what models, products, companies, work or the world will look like, with a time frame or a clear claim about what comes next. A wish, a plan for the speaker’s own company or a general hope doesn’t count',
    stances: [
      { id: 'near', label: 'In a year or two', says: 'look a year or two out', about: 'the prediction is for the next year or two, through 2028' },
      { id: 'mid', label: 'Within five years', says: 'look about five years out', about: 'the prediction is for about the next five years, to around 2031' },
      { id: 'far', label: 'Ten years and more', says: 'look a decade or more out', about: 'the prediction is for ten years or more, or for the long run' },
    ],
  },
];

/** The question with this id. */
export const questionById = new Map(questions.map((question) => [question.id, question]));
