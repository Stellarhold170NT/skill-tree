/**
 * vai-youtube-news client half: registers the news panel (sidebar icon +
 * `main` page). Data comes from the local vai-crawler REST service via
 * ./vai-api.js; the AI companion uses Harness native sessions (qiaomu
 * native-chat bridge, no host service needed).
 */
import { NativeConversation } from './NativeConversation.jsx';
import { nativeChatBridge } from './native-chat.js';
import { ReaderIcon } from './ReaderPage.jsx';
import { ReaderPanel } from './ReaderBoundary.jsx';
import { createVaiApi } from './vai-api.js';

const PLUGIN_ID = 'vai-youtube-news';
export const PANEL_ID = 'vai-youtube-news';

export const inject = ['slots'];

/**
 * Register the news panel.
 * @param ctx - browser Cordis root with the slots service.
 */
export async function apply(ctx) {
	const api = { ...createVaiApi(), ...nativeChatBridge(ctx) };

	ctx.slots.inject('main', () => ctx.slots.register({
		name: 'main',
		key: PANEL_ID,
		children: { 'qiaomu-rss.chat': { kind: 'single', scope: 'session' } },
		inject: () => ({ api }),
	}, ReaderPanel));
	ctx.slots.inject('qiaomu-rss.chat', () => ctx.slots.register({ name: 'qiaomu-rss.chat' }, NativeConversation));
	ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
		name: 'sidebar.panellist',
		id: PANEL_ID,
		order: 23,
		label: "Học tập",
	}, ReaderIcon));
}
