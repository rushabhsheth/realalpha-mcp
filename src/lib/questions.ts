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

/** The headings the list of questions (/q/) groups them under, in its order. */
export const themes = [
  'Money and markets',
  'Work and jobs',
  'Agents and software',
  'Models and the race',
  'Chips and power',
  'Risk and rules',
  'Science and robots',
  'What comes next',
] as const;

export interface Question {
  /** The page's address, /q/<id>/, worded as people search */
  id: string;
  /** Its heading on the list of questions */
  theme: (typeof themes)[number];
  /**
   * A broader question its moments count for too, when its stances run the same way as that one's, side by side: "Will
   * AI replace accountants?" counts on "Which jobs will AI replace?", its first stance on the other's first and so on.
   */
  countsFor?: string;
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
    theme: 'Money and markets',
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
    theme: 'Work and jobs',
    question: 'Which jobs will AI replace, and which are safe?',
    title: 'Which jobs will AI replace? What the people building it say',
    searches: 'what jobs will ai replace 2.5k, what jobs are safe from ai 2.3k, will ai replace jobs 600',
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
    countsFor: 'which-jobs-will-ai-replace',
    theme: 'Work and jobs',
    question: 'Will AI replace software engineers?',
    title: 'Will AI replace software engineers? What the people building it say',
    searches: 'will ai replace software engineers 800, will ai replace programmers 700',
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
    countsFor: 'which-jobs-will-ai-replace',
    theme: 'Work and jobs',
    question: 'Will AI replace doctors?',
    title: 'Will AI replace doctors? What the people building it say',
    searches: 'will ai replace doctors 1.1k, will ai replace radiologists 450, will ai replace nurses 450',
    about: 'whether AI takes over what doctors and other clinicians do: diagnosis, treatment and care. It must say what happens to the doctors, not only what AI can diagnose',
    stances: [
      { id: 'yes', label: 'AI will do doctors’ work', says: 'say AI will do much of it', about: 'AI will do much of what doctors do, or patients will turn to AI instead of doctors' },
      { id: 'changed', label: 'Doctors with AI', says: 'say doctors will work with AI', about: 'doctors stay, with AI as a tool that changes how they work' },
      { id: 'no', label: 'Doctors stay', says: 'say doctors stay', about: 'AI won’t replace doctors, or there will be more need for them' },
    ],
  },
  {
    id: 'will-ai-replace-lawyers',
    countsFor: 'which-jobs-will-ai-replace',
    theme: 'Work and jobs',
    question: 'Will AI replace lawyers?',
    title: 'Will AI replace lawyers? What the people building it say',
    searches: 'will ai replace lawyers 1.9k',
    about: 'whether AI takes over what lawyers do. It must say what happens to lawyers or legal work, not only that AI can read contracts',
    stances: [
      { id: 'yes', label: 'AI will do lawyers’ work', says: 'say AI will do much of it', about: 'AI will do much of what lawyers do, or firms will need fewer of them' },
      { id: 'changed', label: 'Lawyers with AI', says: 'say lawyers will work with AI', about: 'lawyers stay, with AI changing how they work and bill' },
      { id: 'no', label: 'Lawyers stay', says: 'say lawyers stay', about: 'AI won’t replace lawyers, or there will be more legal work' },
    ],
  },
  {
    id: 'is-saas-dead',
    theme: 'Money and markets',
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
    theme: 'Models and the race',
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
    theme: 'Money and markets',
    question: 'How does OpenAI make money, and is it profitable?',
    title: 'Is OpenAI profitable? What the people building AI say',
    searches: 'is openai profitable 1.3k, how does openai make money 900',
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
    theme: 'What comes next',
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
  // Added 2026-10-22 at the user's ask for a much longer list, from a second round of Ahrefs research (US monthly
  // searches), weighted to what we cut most: agents, enterprise AI, coding, security, data centers, robotics, open
  // models. A question gets its page only once PAGE_FROM moments answer it.
  {
    id: 'are-ai-agents-ready',
    theme: 'Agents and software',
    question: 'Are AI agents ready for real work?',
    title: 'Are AI agents ready for real work? What the people building them say',
    searches: 'what can ai agents do 350, future of ai agents 200, are ai agents overhyped 70',
    about:
      'whether AI agents (software that works on its own for minutes or hours: using apps and browsers, writing code, running tasks) do real work today, and what still holds them back',
    stances: [
      { id: 'ready', label: 'Ready now', says: 'say they’re ready now', about: 'agents already do real work reliably, in production, with little watching' },
      { id: 'some', label: 'Ready for some work', says: 'say they’re ready for some work', about: 'agents work for narrow or well-checked tasks, while longer or riskier work still needs people' },
      { id: 'not-yet', label: 'Not yet', says: 'say they’re not ready yet', about: 'agents still fail too often, need people watching every step, or are mostly hype' },
    ],
  },
  {
    id: 'is-ai-paying-off',
    theme: 'Money and markets',
    question: 'Is AI paying off for companies?',
    title: 'Is AI paying off for companies? What the people building it say',
    searches: 'ai roi 1.3k, why do ai projects fail 60',
    about:
      'whether companies get a return on what they spend on AI: real savings or revenue, or pilots that never reach production and value that is still to come',
    stances: [
      { id: 'yes', label: 'It’s paying off', says: 'say it’s paying off', about: 'companies already see real savings, revenue or output from AI' },
      { id: 'partly', label: 'Pays off in places', says: 'say it pays off in places', about: 'some uses pay off while many projects stall, or the payoff takes changing how work is done' },
      { id: 'not-yet', label: 'Not yet', says: 'say it isn’t paying off yet', about: 'most projects don’t reach production or don’t earn back their cost yet' },
    ],
  },
  {
    id: 'is-ai-dangerous',
    theme: 'Risk and rules',
    question: 'Is AI dangerous?',
    title: 'Is AI dangerous? What the people building it say',
    searches: 'will ai take over the world 7.5k, is ai dangerous 6.2k, ai safety 3.2k',
    about:
      'whether powerful AI poses serious risks to people: losing control of it, misuse such as bioweapons or cyberattacks, or harm at scale, and how worried to be',
    stances: [
      { id: 'serious', label: 'A serious risk', says: 'say it’s a serious risk', about: 'the risks are serious, could be catastrophic, and are not handled yet' },
      { id: 'manageable', label: 'Real but manageable', says: 'say the risks are real but manageable', about: 'there are real risks that care, testing, safeguards or rules can handle' },
      { id: 'overblown', label: 'Overblown', says: 'say the fears are overblown', about: 'the fears are exaggerated, or the danger is far off' },
    ],
  },
  {
    id: 'will-ai-make-cyberattacks-worse',
    theme: 'Risk and rules',
    question: 'Will AI make cyberattacks worse?',
    title: 'Will AI make cyberattacks worse? What the people building it say',
    searches: 'ai cyber attacks 1.4k worldwide, will ai replace cybersecurity 150',
    about:
      'whether AI helps attackers more than defenders: faster exploits, AI agents that break in, or AI that finds and fixes the holes first',
    stances: [
      { id: 'attackers', label: 'Attackers gain', says: 'say attackers gain more', about: 'AI makes attacks faster, cheaper or more common than defenses can keep up with' },
      { id: 'both', label: 'Both sides gain', says: 'say both sides gain', about: 'AI speeds up attackers and defenders alike, and it’s a race' },
      { id: 'defenders', label: 'Defenders gain', says: 'say defenders gain more', about: 'AI lets defenders find, fix and respond faster than attackers gain' },
    ],
  },
  {
    id: 'can-anyone-compete-with-nvidia',
    theme: 'Chips and power',
    question: 'Can anyone compete with Nvidia?',
    title: 'Can anyone compete with Nvidia? What the people building AI say',
    searches: 'nvidia competitors 2.9k, ai chips 1.8k',
    about:
      'whether Nvidia keeps its lead in AI chips against TPUs, AMD, the big clouds’ own chips and chip startups, and what keeps customers with it',
    stances: [
      { id: 'holds', label: 'Nvidia keeps its lead', says: 'say Nvidia keeps its lead', about: 'Nvidia’s chips, systems and software keep it far ahead' },
      { id: 'shares', label: 'Rivals win some work', says: 'say rivals win some work', about: 'other chips take real share for some jobs, such as inference or one cloud’s own models, while Nvidia stays the leader' },
      { id: 'fades', label: 'The lead fades', says: 'say the lead fades', about: 'competition, custom chips or cheaper hardware will erode Nvidia’s lead' },
    ],
  },
  {
    id: 'is-there-a-gpu-shortage',
    theme: 'Chips and power',
    question: 'Is there still a GPU shortage?',
    title: 'Is there still a GPU shortage? What the people building AI say',
    searches: 'gpu shortage 2.9k',
    about: 'whether there is enough compute for AI (GPUs, data-center space, inference capacity) or whether a glut is coming',
    stances: [
      { id: 'short', label: 'Still short', says: 'say compute is still short', about: 'demand for GPUs and capacity still outruns supply' },
      { id: 'easing', label: 'Easing', says: 'say the shortage is easing', about: 'supply is catching up, or the shortage has moved to power, space or memory' },
      { id: 'glut', label: 'A glut ahead', says: 'say a glut is coming', about: 'too much capacity is being built, and prices will fall' },
    ],
  },
  {
    id: 'is-there-enough-power-for-ai',
    theme: 'Chips and power',
    question: 'Is there enough power for AI?',
    title: 'Is there enough power for AI? What the people building it say',
    searches: 'data center power 1.2k, ai energy consumption 1.1k, ai data centers 35k',
    about:
      'whether electricity, grid connections and sites can keep up with AI data centers, and what that means for the build-out and for power prices',
    stances: [
      { id: 'bottleneck', label: 'Power is the bottleneck', says: 'say power is the bottleneck', about: 'electricity, grid connections or permits are what limit AI now' },
      { id: 'solvable', label: 'Tight but solvable', says: 'say it’s tight but solvable', about: 'power is tight, but new generation, efficiency or siting will meet the demand' },
      { id: 'enough', label: 'Not the problem', says: 'say power isn’t the problem', about: 'there is enough power, or the worries are exaggerated' },
    ],
  },
  {
    id: 'is-moores-law-dead',
    theme: 'Chips and power',
    question: 'Is Moore’s law dead?',
    title: 'Is Moore’s law dead? What the people building AI say',
    searches: 'is moore’s law dead 500',
    about: 'whether computing keeps getting faster and cheaper at the old pace, through chips, packaging, whole systems or software',
    stances: [
      { id: 'dead', label: 'It’s over', says: 'say it’s over', about: 'chips no longer get faster and cheaper at the old pace' },
      { id: 'new-ways', label: 'Lives on in new ways', says: 'say it lives on in new ways', about: 'gains now come from systems, packaging, specialized chips or software instead of shrinking transistors' },
      { id: 'alive', label: 'Still going', says: 'say it’s still going', about: 'computing keeps getting faster and cheaper at the old pace or faster' },
    ],
  },
  {
    id: 'is-ai-progress-slowing',
    theme: 'Models and the race',
    question: 'Is AI progress slowing down?',
    title: 'Is AI progress slowing down? What the people building it say',
    searches: 'ai scaling laws 150, ai data wall 100, is ai plateauing 60, has ai hit a wall 30',
    about:
      'whether models keep getting better at the same pace: scaling laws, running out of training data, reasoning and reinforcement learning as the next lever, or a plateau',
    stances: [
      { id: 'slowing', label: 'Slowing down', says: 'say progress is slowing', about: 'returns from scale are falling, data is running out, or models have plateaued' },
      { id: 'shifting', label: 'Shifting to new methods', says: 'say it’s shifting to new methods', about: 'one way of scaling slows while another, such as reasoning, RL or synthetic data, keeps progress going' },
      { id: 'faster', label: 'Speeding up', says: 'say progress is speeding up', about: 'models are improving as fast as ever or faster' },
    ],
  },
  {
    id: 'is-open-source-ai-catching-up',
    theme: 'Models and the race',
    question: 'Is open-source AI catching up?',
    title: 'Is open-source AI catching up? What the people building it say',
    searches: 'open source ai 9.2k, open source vs closed source ai 150',
    about:
      'whether open-weight models anyone can download (Llama, DeepSeek, Qwen, Mistral) catch up with the closed frontier models, and whether that decides who wins',
    stances: [
      { id: 'close', label: 'Close behind', says: 'say open models are close behind', about: 'open models trail by months or are good enough for most work' },
      { id: 'behind', label: 'Behind but useful', says: 'say they’re behind but useful', about: 'open models lag the frontier but serve real uses, such as running in-house or at lower cost' },
      { id: 'falling', label: 'Falling behind', says: 'say they’re falling behind', about: 'the gap is widening, or closed models will keep the edge that matters' },
    ],
  },
  {
    id: 'is-china-catching-up-in-ai',
    theme: 'Models and the race',
    question: 'Is China catching up in AI?',
    title: 'Is China catching up in AI? What the people building it say',
    searches: 'deepseek vs chatgpt 16k, chinese ai models 700, us china ai race 100',
    about: 'whether Chinese labs and chipmakers are catching up with the US: DeepSeek, Qwen, distillation, export controls and talent',
    stances: [
      { id: 'level', label: 'Level or ahead', says: 'say China is level or ahead', about: 'Chinese AI matches or leads the US in what matters' },
      { id: 'close', label: 'Close behind', says: 'say China is close behind', about: 'China trails by months, or leads in some areas and trails in others' },
      { id: 'behind', label: 'Well behind', says: 'say China is well behind', about: 'chips, export controls or talent keep China well behind the US' },
    ],
  },
  {
    id: 'is-ai-overhyped',
    theme: 'Models and the race',
    question: 'Is AI overhyped?',
    title: 'Is AI overhyped? What the people building it say',
    searches: 'is ai overhyped 450',
    about:
      'whether what AI can do lives up to what is claimed for it: capabilities and impact, not whether the money spent on it is a bubble',
    stances: [
      { id: 'overhyped', label: 'Overhyped', says: 'say it’s overhyped', about: 'claims about AI run well ahead of what it does' },
      { id: 'both', label: 'Overhyped now, underhyped later', says: 'say it’s overhyped now and underhyped later', about: 'it is overhyped in the short run and underrated in the long run, or hyped in some areas and underrated in others' },
      { id: 'underhyped', label: 'Underhyped', says: 'say it’s underhyped', about: 'people still underestimate what AI can do or how much it will change' },
    ],
  },
  {
    id: 'will-ai-replace-google-search',
    theme: 'Agents and software',
    question: 'Will AI replace Google search?',
    title: 'Will AI replace Google search? What the people building it say',
    searches: 'will chatgpt replace google 100',
    about: 'whether people stop searching Google and ask AI assistants instead, and what happens to Google and to the traffic websites get',
    stances: [
      { id: 'yes', label: 'AI replaces search', says: 'say AI replaces search', about: 'people will ask assistants and agents instead of searching' },
      { id: 'both', label: 'They coexist', says: 'say they coexist', about: 'search and assistants live side by side, or search turns into AI answers' },
      { id: 'no', label: 'Google holds on', says: 'say Google holds on', about: 'Google keeps its place, or wins with AI of its own' },
    ],
  },
  {
    id: 'is-vibe-coding-the-future',
    theme: 'Agents and software',
    question: 'Is vibe coding the future?',
    title: 'Is vibe coding the future? What the people building AI say',
    searches: 'is vibe coding the future 150 (450 worldwide)',
    about: 'whether building software by telling an AI what you want, without reading the code, works for real products, and who it is for',
    stances: [
      { id: 'yes', label: 'It’s the future', says: 'say it’s the future', about: 'most software will be built this way, by more people than ever' },
      { id: 'some', label: 'For some software', says: 'say it’s for some software', about: 'it works for prototypes, personal tools or small apps, while serious software still needs engineers reading the code' },
      { id: 'no', label: 'Not for real products', says: 'say it’s not for real products', about: 'code nobody reads breaks, can’t be maintained or isn’t safe' },
    ],
  },
  {
    id: 'is-a-computer-science-degree-worth-it',
    theme: 'Work and jobs',
    question: 'Is a computer science degree still worth it?',
    title: 'Is a computer science degree still worth it in the AI era?',
    searches: 'is a computer science degree worth it 500, is computer science still worth it 60, should i learn to code 50',
    about: 'whether learning to code or studying computer science still pays off when AI writes code, and what young people should learn',
    stances: [
      { id: 'yes', label: 'Still worth it', says: 'say it’s still worth it', about: 'computer science and coding stay valuable, maybe more than ever' },
      { id: 'different', label: 'Worth it, but different', says: 'say it’s worth it but different', about: 'it pays off only with new skills: directing AI, judgment, systems, a domain' },
      { id: 'no', label: 'Learn something else', says: 'say learn something else', about: 'coding skills lose their value, so other skills matter more' },
    ],
  },
  {
    id: 'are-ai-wrappers-a-real-business',
    theme: 'Money and markets',
    question: 'Are AI wrappers a real business?',
    title: 'Are AI wrappers a real business? What the people building AI say',
    searches: 'ai wrapper 500 (2.8k worldwide)',
    about: 'whether startups built on other companies’ models can last, or get squeezed by the labs and copied',
    stances: [
      { id: 'yes', label: 'Real businesses', says: 'say they’re real businesses', about: 'products on top of models can build lasting businesses through workflow, data, distribution or brand' },
      { id: 'some', label: 'Some will last', says: 'say some will last', about: 'the ones with a real moat survive, the thin ones don’t' },
      { id: 'no', label: 'The labs will eat them', says: 'say the labs will eat them', about: 'the model makers will copy or absorb what they do' },
    ],
  },
  {
    id: 'how-do-ai-companies-make-money',
    theme: 'Money and markets',
    question: 'How do AI companies make money?',
    title: 'How do AI companies make money? What the people building them say',
    searches: 'how do ai companies make money 350',
    about:
      'how AI companies earn and whether it is a good business: subscriptions and seats, paying per use or per outcome, ads, and whether margins hold as compute costs and model prices change',
    stances: [
      { id: 'good', label: 'A good business', says: 'say it’s a good business', about: 'AI companies earn well, with margins that hold or grow' },
      { id: 'changing', label: 'The model is changing', says: 'say the model is changing', about: 'pricing moves from seats to usage or outcomes, or who captures the money shifts' },
      { id: 'hard', label: 'Margins are hard', says: 'say margins are hard', about: 'compute costs, falling prices or competition squeeze what AI companies keep' },
    ],
  },
  {
    id: 'should-ai-be-regulated',
    theme: 'Risk and rules',
    question: 'Should AI be regulated?',
    title: 'Should AI be regulated? What the people building it say',
    searches: 'ai regulation 3.3k, should ai be regulated 300',
    about: 'whether and how governments should make rules for AI: safety laws, licensing, export controls, state laws, or leaving it to the market',
    stances: [
      { id: 'yes', label: 'Regulate it now', says: 'say regulate it now', about: 'strong rules are needed now, before the risks arrive' },
      { id: 'light', label: 'Light, targeted rules', says: 'say light, targeted rules', about: 'some rules for specific harms, without slowing the technology down' },
      { id: 'no', label: 'Hold off', says: 'say hold off', about: 'regulation now would do more harm than good, or helps rivals abroad' },
    ],
  },
  {
    id: 'will-ai-cure-diseases',
    theme: 'Science and robots',
    question: 'Will AI cure diseases?',
    title: 'Will AI cure diseases? What the people building it say',
    searches: 'ai drug discovery 900, will ai cure cancer 600',
    about: 'whether AI finds new drugs and cures (protein models, virtual cells, AI scientists, faster trials) and how soon patients see it',
    stances: [
      { id: 'soon', label: 'Within a few years', says: 'say within a few years', about: 'AI will lead to new treatments or cures within a few years' },
      { id: 'slowly', label: 'Slowly, step by step', says: 'say it comes slowly', about: 'AI helps, but biology, data and trials mean it takes a decade or more' },
      { id: 'overhyped', label: 'Overhyped for now', says: 'say it’s overhyped for now', about: 'claims about AI curing disease run ahead of the evidence' },
    ],
  },
  {
    id: 'when-will-humanoid-robots-be-useful',
    theme: 'Science and robots',
    question: 'When will humanoid robots be useful?',
    title: 'When will humanoid robots be useful? What the people building them say',
    searches: 'humanoid robots 5.7k, will robots replace humans 100, when will humanoid robots be available 70',
    about:
      'when robots, humanoid or not, do useful work in factories, warehouses and homes, and what still holds them back: data, hardware, safety and cost',
    stances: [
      { id: 'soon', label: 'Within a few years', says: 'say within a few years', about: 'general-purpose robots will do real work in many places within a few years' },
      { id: 'factories-first', label: 'Factories first, homes later', says: 'say factories first, homes later', about: 'robots arrive in constrained jobs like factories and warehouses well before homes' },
      { id: 'far', label: 'A long way off', says: 'say they’re a long way off', about: 'useful general robots are a decade or more away' },
    ],
  },
  {
    id: 'are-self-driving-cars-safe',
    theme: 'Science and robots',
    question: 'Are self-driving cars safe?',
    title: 'Are self-driving cars safe? What the people building them say',
    searches: 'waymo vs tesla 1.1k, are self driving cars safe 900, tesla robotaxi 23k',
    about: 'whether self-driving cars are safe and ready to spread (Waymo, Tesla and others), and what it takes to drive with no one at the wheel',
    stances: [
      { id: 'safer', label: 'Safer than people', says: 'say they’re safer than people', about: 'self-driving cars already drive more safely than people' },
      { id: 'getting-there', label: 'Getting there', says: 'say they’re getting there', about: 'they are safe in some places or conditions and spreading carefully' },
      { id: 'not-yet', label: 'Not yet', says: 'say they’re not ready', about: 'they are not safe enough yet, or the hard cases are unsolved' },
    ],
  },
  {
    id: 'will-ai-boost-economic-growth',
    theme: 'Money and markets',
    question: 'Will AI boost economic growth?',
    title: 'Will AI boost economic growth? What the people building it say',
    searches: 'ai and the economy 150, will ai increase productivity 90',
    about: 'how much AI raises productivity and growth across the economy, and how soon it shows up in the numbers',
    stances: [
      { id: 'big', label: 'A big boost', says: 'say a big boost', about: 'AI will raise growth sharply, well beyond past technologies' },
      { id: 'modest', label: 'A modest boost', says: 'say a modest boost', about: 'AI will help growth, but slowly or less than claimed' },
      { id: 'little', label: 'Little so far', says: 'say little so far', about: 'there is little sign of it in productivity or growth yet' },
    ],
  },
  {
    id: 'will-ai-replace-accountants',
    countsFor: 'which-jobs-will-ai-replace',
    theme: 'Work and jobs',
    question: 'Will AI replace accountants?',
    title: 'Will AI replace accountants? What the people building it say',
    searches: 'will ai replace accountants 2.2k, will ai replace financial advisors 500',
    about: 'whether AI takes over what accountants, bookkeepers, auditors and finance teams do. It must say what happens to those people or that work, not only that AI can read invoices',
    stances: [
      { id: 'yes', label: 'AI will do their work', says: 'say AI will do much of it', about: 'AI will do much of what accountants and finance teams do, or firms will need fewer of them' },
      { id: 'changed', label: 'Accountants with AI', says: 'say accountants will work with AI', about: 'the people stay, with AI changing how they work' },
      { id: 'no', label: 'Accountants stay', says: 'say accountants stay', about: 'AI won’t replace them, or there will be more of this work' },
    ],
  },
  {
    id: 'will-ai-replace-teachers',
    countsFor: 'which-jobs-will-ai-replace',
    theme: 'Work and jobs',
    question: 'Will AI replace teachers?',
    title: 'Will AI replace teachers? What the people building it say',
    searches: 'will ai replace teachers 600, ai tutors 250',
    about: 'whether AI tutors take over what teachers do, and what happens to schools and learning. It must say what happens to teachers or teaching',
    stances: [
      { id: 'yes', label: 'AI will do their work', says: 'say AI will do much of it', about: 'AI tutors will do much of what teachers do' },
      { id: 'changed', label: 'Teachers with AI', says: 'say teachers will work with AI', about: 'teachers stay, with AI tutoring alongside them' },
      { id: 'no', label: 'Teachers stay', says: 'say teachers stay', about: 'AI won’t replace teachers, or makes them matter more' },
    ],
  },
  {
    id: 'will-ai-replace-customer-service',
    countsFor: 'which-jobs-will-ai-replace',
    theme: 'Work and jobs',
    question: 'Will AI replace customer service jobs?',
    title: 'Will AI replace customer service jobs? What the people building it say',
    searches: 'will ai replace customer service 150, will ai replace sales 150',
    about: 'whether AI agents take over customer support and sales work, and what happens to the people who did it',
    stances: [
      { id: 'yes', label: 'AI will do most of it', says: 'say AI will do most of it', about: 'AI agents handle most support or sales work, and teams shrink' },
      { id: 'changed', label: 'People with AI', says: 'say people will work with AI', about: 'AI takes the routine cases while people handle the hard ones or new work' },
      { id: 'no', label: 'People stay', says: 'say people stay', about: 'customers still want people, or AI won’t cut these jobs' },
    ],
  },
];

/** The question with this id. */
export const questionById = new Map(questions.map((question) => [question.id, question]));
