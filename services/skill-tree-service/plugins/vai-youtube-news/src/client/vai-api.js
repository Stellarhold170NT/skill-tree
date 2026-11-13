/**
 * vai-youtube-news api adapter: implements the qiaomu reader api surface
 * backed by the local vai-crawler REST service + browser-local state.
 * Read/favorite/settings live in localStorage; content comes from vai-crawler.
 */
import { READING_DEFAULTS } from '../reading-settings.js';

// Mac dinh tro ve chinh host dang mo DSH UI (browser), cong crawler 8600.
// Vi du: mo http://10.0.10.195:3080 -> goi http://10.0.10.195:8600.
// Co the ghi de qua localStorage key 'vai_yt_api_base'.
const DEFAULT_BASE = typeof location !== 'undefined' && location.hostname
	? `${location.protocol}//${location.hostname}:8600`
	: 'http://localhost:8600';
const CHANNEL_KEY = 'ai-engineer';
const CHANNEL_NAME = 'AI Engineer';
const STORE_KEYS = {
	read: 'vai_yt_read',
	favorite: 'vai_yt_fav',
	settings: 'vai_yt_settings',
	base: 'vai_yt_api_base',
};

function apiBase() {
	return localStorage.getItem(STORE_KEYS.base) || DEFAULT_BASE;
}

async function http(path, options) {
	const response = await fetch(apiBase() + path, options);
	if (!response.ok) throw new Error(`vai-crawler HTTP ${response.status}`);
	return response.json();
}

function mapGet(key) {
	try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}

function mapSet(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}

function publishedMs(value) {
	if (typeof value === 'number') return value;
	const ms = Date.parse(value ?? '');
	return Number.isNaN(ms) ? 0 : ms;
}

function summarize(text, limit = 180) {
	const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
	return flat.length > limit ? `${flat.slice(0, limit)}…` : flat;
}

function escapeHtml(text) {
	return String(text ?? '')
		.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function fmtClock(seconds) {
	const s = Math.max(0, Math.floor(seconds));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function toEntry(row) {
	const read = mapGet(STORE_KEYS.read);
	const favorite = mapGet(STORE_KEYS.favorite);
	const publishedAt = publishedMs(row.publish_date);
	return {
		key: row.video_id,
		channelKey: CHANNEL_KEY,
		channelName: CHANNEL_NAME,
		title: row.title ?? '(không tiêu đề)',
		summary: summarize(row.description),
		publishedAt,
		url: `https://www.youtube.com/watch?v=${row.video_id}`,
		image: row.thumbnail_url || undefined,
		read: read[row.video_id] !== undefined,
		favorite: favorite[row.video_id] !== undefined,
		hasBody: true,
	};
}

function explanationsToMarkdown(detail) {
	const parts = [];
	for (const section of detail.explanations ?? []) {
		parts.push(`## ${section.heading ?? ''}\n\n${section.content ?? ''}`);
	}
	const terms = detail.terms ?? [];
	if (terms.length) {
		const lines = terms.map((term) => {
			const at = term.first_seen_seconds != null ? ` (mốc ${fmtClock(term.first_seen_seconds)})` : '';
			return `- **${term.term ?? ''}**${at} — ${term.definition ?? ''}`;
		});
		parts.push(`## Thuật ngữ\n\n${lines.join('\n')}`);
	}
	return parts.join('\n\n');
}

async function versionsFor(key) {
	let detail;
	try {
		detail = await http(`/api/videos/${encodeURIComponent(key)}`);
	} catch {
		return {
			original: { available: false, status: 'missing' },
			translation: { available: false, status: 'missing' },
			rewrite: { available: false, status: 'missing' },
		};
	}
	const video = detail.video ?? {};
	const transcript = detail.has_transcript
		? await http(`/api/videos/${encodeURIComponent(key)}/transcript?max_segments=500`).catch(() => null)
		: null;
	const bodyParts = [];
	if (video.description) bodyParts.push(`<p>${escapeHtml(video.description)}</p>`);
	if (transcript?.segments?.length) {
		const paragraphs = transcript.segments
			.map((segment) => `[${fmtClock(segment.start_seconds)}] ${escapeHtml(segment.text)}`)
			.join('<br>');
		bodyParts.push(`<h2>Transcript</h2><p>${paragraphs}</p>`);
	}
	const rewriteMarkdown = explanationsToMarkdown(detail);
	return {
		original: { available: bodyParts.length > 0, title: video.title, html: bodyParts.join('\n') },
		translation: { available: false, status: 'missing' },
		rewrite: {
			available: Boolean(rewriteMarkdown),
			status: rewriteMarkdown ? 'ok' : 'missing',
			title: 'Giải thích AI (vai-crawler)',
			markdown: rewriteMarkdown || undefined,
			source: 'vai-crawler',
		},
	};
}

async function pollJob(jobId, { timeoutMs = 180_000, intervalMs = 3_000 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const job = await http(`/api/jobs/${encodeURIComponent(jobId)}`);
		if (job.status === 'done') return job;
		if (job.status === 'error') throw new Error(job.error || 'job thất bại');
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
	throw new Error('job quá thời gian chờ');
}

export function createVaiApi() {
	return {
		async listChannels() {
			const data = await http('/api/videos?limit=100');
			const read = mapGet(STORE_KEYS.read);
			const entries = (data.items ?? []).map(toEntry);
			return {
				channels: [{
					key: CHANNEL_KEY,
					kind: 'feed',
					name: CHANNEL_NAME,
					unread: entries.filter((entry) => !read[entry.key]).length,
					total: entries.length,
				}],
			};
		},

		async listEntries(request = {}) {
			const data = await http('/api/videos?limit=100');
			let entries = (data.items ?? []).map(toEntry);
			if (request.filter === 'unread') entries = entries.filter((entry) => !entry.read);
			if (request.filter === 'favorites') entries = entries.filter((entry) => entry.favorite);
			const search = String(request.search ?? '').trim().toLowerCase();
			if (search) entries = entries.filter((entry) => entry.title.toLowerCase().includes(search));
			return { entries, hasMore: false };
		},

		async getArticle(key) {
			const [detail, versions] = await Promise.all([
				http(`/api/videos/${encodeURIComponent(key)}`),
				versionsFor(key),
			]);
			const video = detail.video ?? {};
			return {
				article: {
					key,
					channelKey: CHANNEL_KEY,
					channelName: CHANNEL_NAME,
					title: video.title ?? '',
					summary: summarize(video.description),
					publishedAt: publishedMs(video.publish_date),
					url: `https://www.youtube.com/watch?v=${key}`,
					image: video.thumbnail_url || undefined,
					read: mapGet(STORE_KEYS.read)[key] !== undefined,
					favorite: mapGet(STORE_KEYS.favorite)[key] !== undefined,
					hasBody: true,
				},
				videoPlayerUrl: `https://www.youtube.com/embed/${key}`,
				html: versions.original.html ?? '',
				truncated: false,
				versions,
			};
		},

		async refresh() {
			const { job_id: jobId } = await http('/api/crawl', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}',
			});
			try {
				const job = await pollJob(jobId, { timeoutMs: 600_000, intervalMs: 4_000 });
				const processed = job.result?.processed?.length ?? 0;
				return { feeds: 1, entries: processed };
			} catch (error) {
				return { error: error.message };
			}
		},

		async generateVersion(key, kind) {
			if (kind !== 'rewrite') throw new Error('chỉ hỗ trợ bản "Giải thích AI"');
			const existing = (await versionsFor(key)).rewrite;
			if (existing.available) return { ...existing, generatedAt: Date.now() };
			const { job_id: jobId } = await http(`/api/explain/${encodeURIComponent(key)}`, { method: 'POST' });
			await pollJob(jobId, { timeoutMs: 1_200_000, intervalMs: 5_000 });
			const version = (await versionsFor(key)).rewrite;
			if (!version.available) throw new Error('vai-crawler chưa trả về giải thích');
			return { ...version, generatedAt: Date.now() };
		},

		async getVersionContent(request = {}) {
			const versions = await versionsFor(request.key);
			return versions[request.kind] ?? { available: false, status: 'missing' };
		},

		async setRead(keys, read) {
			const map = mapGet(STORE_KEYS.read);
			for (const key of keys ?? []) {
				if (read) map[key] = Date.now();
				else delete map[key];
			}
			mapSet(STORE_KEYS.read, map);
			return { ok: true };
		},

		async setFavorite(key, favorite) {
			const map = mapGet(STORE_KEYS.favorite);
			if (favorite) map[key] = Date.now();
			else delete map[key];
			mapSet(STORE_KEYS.favorite, map);
			return { ok: true };
		},

		async getSettings() {
			let settings;
			try { settings = JSON.parse(localStorage.getItem(STORE_KEYS.settings) || '{}'); } catch { settings = {}; }
			return { settings: { ...READING_DEFAULTS, aiAssist: true, origin: '', ...settings, defaultVersion: 'rewrite' } };
		},

		async saveSettings(request = {}) {
			const current = await this.getSettings();
			const next = { ...current.settings, ...(request.patch ?? {}) };
			localStorage.setItem(STORE_KEYS.settings, JSON.stringify(next));
			return { ok: true };
		},

		async listSubscriptions() {
			return {
				subscriptions: [{
					id: CHANNEL_KEY,
					name: CHANNEL_NAME,
					url: 'https://www.youtube.com/@aiDotEngineer',
					group: '',
				}],
			};
		},
		async addSubscription() { return { ok: true }; },
		async removeSubscription() { return { ok: true }; },
		async updateSubscription() { return { ok: true }; },
		async opmlPreview() { return { entries: [] }; },
		async opmlImport() { throw new Error('không hỗ trợ nhập OPML — kenh cố định AI Engineer'); },
		async opmlExport() {
			return '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0"><body>'
				+ `<outline text="${CHANNEL_NAME}" type="rss" xmlUrl="https://www.youtube.com/feeds/videos.xml?channel_id=UCLKPca3kwwd-B59HNr-_lvA"/>`
				+ '</body></opml>';
		},

		async searchArticles() { return { entries: [], hasMore: false }; },

		async searchPodcastShows() { return { shows: [] }; },
		async listPodcastEpisodes() { return { episodes: [], hasMore: false }; },
		async importPodcastTranscript() { throw new Error('không hỗ trợ podcast trong phiên bản này'); },

		async getCollectionSettings() { return { enabled: false, verified: false }; },
		async configureCollection() { throw new Error('Link collection không khả dụng trong vai-youtube-news'); },
		async submitCollection() { throw new Error('Link collection không khả dụng trong vai-youtube-news'); },
		async listCollectionJobs() { return { jobs: [], hasMore: false, nextCursor: '' }; },
		async collectionSnapshot() { return { enabled: false, pending: 0, jobs: [] }; },
		async acknowledgeCollection() { return { ok: true }; },
		async openCollectionResult() { throw new Error('Link collection không khả dụng trong vai-youtube-news'); },

		async setReadingContext() { return { ok: true }; },
		async prepareChat() { return {}; },
	};
}
