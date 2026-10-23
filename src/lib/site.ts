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
/** The domain of our own email addresses: hello@, sponsors@, weekly@ and the rest. */
export const MAIL_DOMAIN = 'realalpha.tv';
