/**
 * Hey! En Route, the app: screens, navigation, and the bridge that lets the
 * site's own driving mode run inside it.
 */
import { api } from './api.js';
import { SITE } from './config.js';
import { store, loadConfig, loadMe } from './store.js';
import { $, $$, load, dist, toast, problem } from './ui.js';
import explore from './views/explore.js';
import city from './views/city.js';
import routes from './views/routes.js';
import route from './views/route.js';
import alerts from './views/alerts.js';
import account from './views/account.js';

const views = [
	[ /^#?\/?(explore)?$/, explore, 'explore' ],
	[ /^#\/city\/(\d+)$/, city, 'explore' ],
	[ /^#\/routes$/, routes, 'routes' ],
	[ /^#\/route\/(\d+)$/, route, 'routes' ],
	[ /^#\/alerts$/, alerts, 'alerts' ],
	[ /^#\/account$/, account, 'account' ],
];

const main = $( '#app' );

async function show() {
	const hash = location.hash || '#/explore';
	let match = null;
	let view = explore;
	let tab = 'explore';
	for ( const [ re, fn, t ] of views ) {
		match = hash.match( re );
		if ( match ) { view = fn; tab = t; break; }
	}
	$$( '.app-tabs a' ).forEach( ( a ) => a.setAttribute( 'aria-current', a.dataset.tab === tab ? 'page' : 'false' ) );
	main.scrollTop = 0;
	window.scrollTo( 0, 0 );
	try {
		// Each screen gets a fresh container, so its handlers go when it does.
		const box = document.createElement( 'div' );
		box.className = 'app-view';
		main.replaceChildren( box );
		await view( box, match ? match.slice( 1 ) : [] );
	} catch ( e ) {
		console.error( e ); // eslint-disable-line no-console
		main.innerHTML = problem( 'That screen didn’t load. Check your connection and try again.' );
	}
	main.focus( { preventScroll: true } );
	updateBadge();
}

/* Try again after a problem. */
document.addEventListener( 'click', ( e ) => {
	if ( e.target.closest( '[data-retry]' ) ) { show(); }
} );

/* The unread count on the Alerts tab. */
function updateBadge() {
	const n = store.me ? store.me.unread : 0;
	const badge = $( '.app-tabs [data-tab="alerts"] .app-badge' );
	if ( badge ) { badge.textContent = n > 9 ? '9+' : String( n ); badge.hidden = ! n; }
}

window.addEventListener( 'hashchange', show );
window.addEventListener( 'hen:signedout', () => {
	store.me = null;
	toast( 'You’ve been signed out. Sign in again to see your routes.' );
	if ( /route|alerts/.test( location.hash ) ) { location.hash = '#/account'; }
} );

/* ------------------------------------------------------------------
 * Driving mode comes from the site (assets/drive.js), so it's always the
 * same as the website's. It expects a few globals from the site's pages.
 * ---------------------------------------------------------------- */

export async function prepareDriving() {
	const cfg = store.config || {};
	window.hen = window.hen || {};
	window.hen.api = ( path, method, body ) => api( path, method, body );
	window.henConfig = { tiles: cfg.tiles, urls: cfg.urls || {} };
	window.henUnits = { dist };
	const assets = cfg.assets || {};
	await Promise.all( [ load( assets.leaflet_css ), load( assets.leaflet_js ) ] ).catch( () => {} );
	await load( assets.drive_js );
}

/* Directions menus (from the site's styles): one open at a time. */
document.addEventListener( 'click', ( e ) => {
	$$( 'details.hen-dirs[open]' ).forEach( ( d ) => { if ( ! d.contains( e.target ) ) { d.open = false; } } );
} );

/* ------------------------------------------------------------------
 * Start
 * ---------------------------------------------------------------- */

async function start() {
	const cfg = await loadConfig();
	if ( cfg && cfg.assets ) {
		// The site's component styles, so cards, alerts and driving mode look the same.
		load( cfg.assets.core_css ).catch( () => {} );
		load( cfg.assets.app_css ).catch( () => {} );
	}
	if ( ! cfg ) {
		main.innerHTML = problem( 'Couldn’t reach ' + SITE.replace( /^https?:\/\//, '' ) + '. Check your connection and try again.' );
		document.addEventListener( 'click', ( e ) => { if ( e.target.closest( '[data-retry]' ) ) { location.reload(); } }, { once: true } );
		return;
	}
	await loadMe();
	show();
	// Offline use and notifications.
	if ( 'serviceWorker' in navigator ) {
		navigator.serviceWorker.register( 'sw.js?site=' + encodeURIComponent( SITE ) ).catch( () => {} );
	}
}

start();
