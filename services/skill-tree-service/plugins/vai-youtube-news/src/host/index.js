/**
 * vai-youtube-news host half: no host behavior — crawling and the REST API
 * live in the external vai-crawler service; this package exists so DSH
 * serves the client bundle (news panel inside the DSH web UI).
 * Derived from joeseesun/qiaomu-rss-dsh (GPL-3.0) — see LICENSE-GPL3-qiaomu.
 */
export const name = 'vai-youtube-news';
export const inject = [];

export function apply() {
	// intentionally empty
}
