// Copied from Real Alpha's site (app/src/lib/site.ts) by its scripts/mcp-repo.mjs.
/**
 * The site's address, for everything that builds a link or checks a host: realalpha.app since 2026-10-17. realalpha.tv,
 * where the site started, sends every page there, and the stats still count it as the live site, since their weeks go
 * back before the move. Email stays at realalpha.tv (Google Workspace, and Kit's sending domain).
 */
export const HOST = 'realalpha.app';
export const SITE = `https://${HOST}`;
/** Where the site was until 2026-10-17. Its pages answer with a 301 to the same path here (proxy/index.ts). */
export const OLD_HOST = 'realalpha.tv';
/** Every address the live site has answered on, so the stats can leave out previews on workers.dev and local ones. */
export const LIVE_HOSTS = [HOST, OLD_HOST];
/**
 * Real Alpha's own profiles elsewhere, the sameAs of the site's Organization in its structured data (src/lib/seo.ts,
 * src/lib/news-desk.ts), so search engines tie the brand to its accounts. Both are in Typefully's "Real Alpha" social
 * set (the user's yes of 10-23); add another only once it's confirmed as ours.
 */
export const PROFILES = ['https://x.com/RealAlphaApp', 'https://www.linkedin.com/company/realalphaapp'];
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
 * The homepage's laptop test (src/lib/laptop-home.ts): the homepage as it is against a front page of desks and a
 * briefing. Off since 2026-10-27, the user's call ("set the default homepage to 100%, we will run a/b test later"),
 * after it ran from about 01:00 to 03:00 UTC that morning: every browser gets the homepage as it is, and the script
 * before the intro (src/pages/index.astro) clears the arms browsers kept (localStorage `ra-laptop`, sessionStorage
 * `ra-laptop-visit`), so the next test draws afresh. The layouts and their previews (/?laptop=front, /?laptop=brief)
 * stay. Turned on, /privacy shows its paragraphs about the test, so change the date at the top of that page in the
 * same push.
 */
export const LAPTOP_TEST = false;
/**
 * The share of phones held out of the house cards while they're on, so `npm run stats` › House cards against the
 * holdout can tell what they cost: a half for the first test, two weeks or so, then the standing tenth (0.1). Each
 * phone keeps its draw (src/lib/house-rules.ts › armOf), so shrinking it moves phones from the holdout to the cards and
 * never back.
 */
export const HOUSE_HOLDOUT = 0.5;
