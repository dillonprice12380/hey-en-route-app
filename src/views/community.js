/**
 * Community: City and Route Circles, messages, connections, and who can
 * see you. Each opens the website's own page inside the app, so posting,
 * replying, "Helpful", joining circles, connection requests, messages,
 * reports and blocks all work exactly as on the site.
 */
import { signedIn } from '../api.js';
import { store, loadMe } from '../store.js';
import { esc, loading } from '../ui.js';
import { appHref } from '../site.js';
import { siteRow } from './account.js';

export default async function community( main ) {
	const urls = ( store.config && store.config.urls ) || {};
	const head = '<header class="app-head"><h1 class="app-title">Community</h1><p class="app-lede">City and Route Circles: real experience from people who’ve been, are going, or live there.</p></header>';

	if ( ! signedIn() ) {
		main.innerHTML = head +
			'<div class="app-card"><p>Anyone can read the circles. Sign in to join them, post, reply, and connect with travellers on a similar path.</p>' +
			'<p><a class="hen-btn hen-btn--primary hen-btn--small" href="#/account">Sign in</a> <a class="hen-btn hen-btn--small" href="' + esc( appHref( urls.join ) ) + '">Create a free account</a></p></div>' +
			( urls.circles ? '<ul class="app-list">' + siteRow( urls.circles, 'Browse the circles' ) + '</ul>' : '' );
		return;
	}

	main.innerHTML = head + loading();
	const me = await loadMe( true );
	if ( ! me ) { main.innerHTML = head + '<p class="app-empty">Couldn’t load your account.</p>'; return; }
	if ( ! me.community ) {
		main.innerHTML = head + '<p class="app-empty">The community is switched off on Hey! En Route right now.</p>';
		return;
	}
	const view = ( key ) => ( me.views || [] ).find( ( v ) => v.key === key );
	const row = ( key, note ) => {
		const v = view( key );
		return v ? siteRow( v.url, v.label, v.count, note ) : '';
	};
	main.innerHTML = head +
		'<ul class="app-list">' +
			row( 'messages', 'With members you’ve connected with' ) +
			row( 'connections', 'Requests, connections and blocked members' ) +
			row( 'circles', 'The circles you’ve joined' ) +
			( urls.circles ? siteRow( urls.circles, 'Find a circle', 0, 'Every City and Route Circle' ) : '' ) +
		'</ul>' +
		'<h2 class="app-sub">How others see you</h2>' +
		'<ul class="app-list">' +
			row( 'profile', 'Display name, photo, bio and travel profile' ) +
			row( 'privacy', 'Who can find you, see your profile and message you' ) +
		'</ul>' +
		'<p class="app-fine">City Circles are on each city’s guide (the City Circle tab); Route Circles are on the pages between two cities.</p>';
}
