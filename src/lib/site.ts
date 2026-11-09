// Copied from Real Alpha's site (app/src/lib/site.ts) by its scripts/mcp-repo.mjs.
/**
 * The site's address, for everything that builds a link or checks a host: realalpha.app since 2026-10-17. realalpha.tv,
 * where the site started, sends every page there, and the stats still count it as the live site, since their weeks go
 * back before the move. Email stays at realalpha.tv (Google Workspace, and Kit's sending domain).
 */
export const HOST = 'realalpha.app';
export const SITE = `https://${HOST}`;
/** The publication on Substack, whose posts the news section carries in full (src/lib/long-reads.ts, worker/long-reads.ts). */
export const READ_SITE = 'https://read.realalpha.app';
/** Where the site was until 2026-10-17. Its pages answer with a 301 to the same path here (wrangler.jsonc › routes). */
export const OLD_HOST = 'realalpha.tv';
/** Every address the live site has answered on, so the stats can leave out previews on workers.dev and local ones. */
export const LIVE_HOSTS = [HOST, OLD_HOST];
/**
 * Real Alpha's own channels elsewhere, the footer's Follow links (the user's ask of 2026-11-05). Add another only once
 * it's confirmed as ours (handbook/accounts.md).
 */
export const CHANNELS = [
  { name: 'X', url: 'https://x.com/RealAlphaApp' },
  { name: 'YouTube', url: 'https://www.youtube.com/@RealAlphaApp' },
  { name: 'Instagram', url: 'https://www.instagram.com/realalphaapp/' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/realalphaapp' },
];
/**
 * The same channels as the sameAs of the site's Organization in its structured data (src/lib/seo.ts,
 * src/lib/news-desk.ts), so search engines tie the brand to its accounts.
 */
export const PROFILES = CHANNELS.map((channel) => channel.url);
/**
 * What Real Alpha is, in the words AI assistants file a site like it under when people ask for one ("AI podcast
 * summarizers", "podcast highlights": the citation check's list questions, 2026-11-06), so an answer can name it there:
 * the Organization's description in the structured data (src/lib/seo.ts), /llms.txt and the homepage's Markdown copy.
 */
export const WHAT_IT_IS =
  'Real Alpha is a podcast highlights site for AI. Instead of summarizing a whole episode, it picks the few minutes worth hearing from each long interview with the people building AI and plays them from that second, with a summary and the transcript.';
/** The homepage's description, in the same words, for search results and link previews (src/pages/index.astro). */
export const HOME_DESCRIPTION =
  'AI podcast highlights: the best few minutes of each long interview with the people building AI, played from the second the answer starts.';
/** The domain of our own email addresses: hello@, sponsors@, weekly@ and the rest. */
export const MAIL_DOMAIN = 'realalpha.tv';

/** The Android app's ID on Google Play (mobile/app.json), which the web manifest's related_applications names too. */
export const ANDROID_APP = 'app.realalpha';
/**
 * The Android app's listing on Google Play, and the switch for every offer of the app on the site: the nav's Get the
 * app on Android, the home-screen card's offer, the one after a moment, the rows in Settings and Saved, the laptop
 * nav's QR code, the footer's link and the /app page's badge and iPhone waitlist, and realalpha.app/app sending Android
 * phones to Play (src/lib/app-links.ts, src/lib/app-offer.ts, worker/app-link.ts). Empty until the listing is live.
 */
export const PLAY_LISTING = '';
/**
 * Play's opt-in page for the Android app's closed test (marketing/launch/play-store/closed-test.md), which
 * subscribers on Android are offered in Settings and Saved, and the thank-you note mentions, until PLAY_LISTING is
 * filled in. Empty turns the beta's offers off.
 */
export const ANDROID_BETA = 'https://play.google.com/apps/testing/app.realalpha';
/** The Google Group a tester joins before the opt-in page lets them in, when the closed test admits testers by group. */
export const ANDROID_BETA_GROUP = 'https://groups.google.com/g/real-alpha-testers';
/**
 * The switch for the house cards in the homepage's phone feed (src/lib/house.ts): Real Alpha's own cards, in the slot
 * the monetization plan's sponsored card will take, so its place, its pace and what it costs the feed are known before
 * a sponsor pays for it. Off until the user turns it on, after wave 1's first week by the plan, so the first-screen
 * test (src/lib/first-screen.ts) and wave 1's numbers stay clean. While it's off, the homepage carries no house cards
 * and loads no script for them, nothing is drawn for the holdout, and the feed's events carry no `ads`. Turned on,
 * /privacy shows its paragraphs about them, so change the date at the top of that page in the same push.
 */
export const HOUSE_CARDS = false;

/**
 * The switch for the reaction rows (src/lib/reactions.ts): "Your take?" with Useful, Surprising, Funny and Disagree, in
 * a bar above a phone's tabs on a moment's or an episode's page once a segment has played 30 seconds, and at the foot of
 * each phone feed card. On since 2026-11-06 as a two-week test of whether people react at all (the user's pick of option
 * B on the canvas "Reactions on a moment"), read in `npm run stats` › Reactions. Off, the pages carry no row and load
 * no script for it, and /privacy drops its paragraph, so change the date at the top of that page in the same push.
 */
export const REACTIONS = true;

/**
 * The homepage's laptop test (src/lib/laptop-home.ts): A, the homepage as it is, against B, a front page of desks, and
 * C, a briefing, a third of browsers each. On since 2026-11-03, the user's ask ("so we want to do a/b/c test a being
 * the current default and the newspaper version as b and the other one as c"). It first ran from about 01:00 to 03:00
 * UTC on 2026-10-27, then was off by the user's call ("set the default homepage to 100%, we will run a/b test later").
 * Off, every browser gets the homepage as it is, and the script before the intro (src/pages/index.astro) clears the
 * arms browsers kept (localStorage `ra-laptop`, sessionStorage `ra-laptop-visit`), so the next test draws afresh. The
 * layouts and the previews of each arm (/?laptop=feed, /?laptop=front, /?laptop=brief) stay either way. On, /privacy
 * shows its paragraphs about the test, so change the date at the top of that page in the push that flips this.
 */
export const LAPTOP_TEST = true;
/**
 * Whether a segment's or an episode's page stops the video 30 seconds in, for a visit that came in on it, and brings up
 * the sign-in wall (src/lib/signup-wall.ts): on since 2026-11-03, the user's "lets do A and publish today", option A on
 * the canvas "Wall at 30 seconds". Off, those pages go back to giving the first moment whole and asking at the next.
 */
export const WALL_AT_30 = true;
/**
 * The share of phones held out of the house cards while they're on, so `npm run stats` › House cards against the
 * holdout can tell what they cost: a half for the first test, two weeks or so, then the standing tenth (0.1). Each
 * phone keeps its draw (src/lib/house-rules.ts › armOf), so shrinking it moves phones from the holdout to the cards and
 * never back.
 */
export const HOUSE_HOLDOUT = 0.5;
