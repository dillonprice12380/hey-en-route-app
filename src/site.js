/**
 * The website's own pages, inside the app.
 *
 * Any page of heyenroute.com (a full city guide, a circle and its
 * discussions, a member's messages, connections, profile, privacy and
 * notification settings, listings and their reviews, events, curated
 * routes, compare, Plus…) opens here as #/p/<address>. The site builds the
 * page as the signed-in member and sends its content; the site's own
 * scripts then run on it. So every feature works exactly as on the website,
 * and anything new on the website appears in the app too.
 *
 * Links to the site stay in the app, forms are sent from the app, and the
 * site's scripts navigate through window.henHost.
 */
import { getKey, setKey } from './api.js';
import { API, SITE } from './config.js';
import { store, loadMe } from './store.js';
import { load, units } from './ui.js';

const ORIGIN = new URL( SITE ).origin;

/** Is this address on the site? */
export function isSite( url ) {
	try { return new URL( url, SITE ).origin === ORIGIN; } catch ( e ) { return false; }
}

/** The app's address for a site address, or '' to open it outside the app. */
export function appHref( url ) {
	let u;
	try { u = new URL( url, SITE ); } catch ( e ) { return ''; }
	if ( u.origin !== ORIGIN ) { return ''; }
	const p = u.pathname;
	// Files, calendars, feeds and staff screens open outside.
	if ( /\/wp-(admin|login\.php)|\/feed\/?$|\.(ics|pdf|zip|csv|xml|jpe?g|png|gif|webp|svg|mp4)$/i.test( p ) || u.searchParams.has( 'hen_ics' ) || u.searchParams.has( 'hen_ics_city' ) ) {
		return /wp-login\.php/.test( p ) ? '#/account' : '';
	}
	if ( u.searchParams.has( 'hen_signout' ) ) { return '#/signout'; }
	const urls = ( store.config && store.config.urls ) || {};
	if ( urls.account && p === new URL( urls.account ).pathname ) {
		const view = u.searchParams.get( 'view' );
		const tab = u.searchParams.get( 'tab' );
		// The app's own screens for routes and signing in.
		if ( 'routes' === view ) {
			const r = u.searchParams.get( 'route' );
			return r ? '#/route/' + parseInt( r, 10 ) : '#/routes';
		}
		if ( ! getKey() && ! [ 'forgot', 'reset', 'join' ].includes( tab ) ) { return '#/account'; }
		if ( 'forgot' === tab ) { return '#/account?forgot=1'; }
	}
	return '#/p/' + encodeURIComponent( p + u.search + u.hash );
}

/** Opens a site address in the app, or anything else outside it. */
export function openUrl( url, replace = false ) {
	const h = appHref( url );
	if ( h ) {
		if ( replace ) { location.replace( h ); } else { location.hash = h; }
	} else {
		window.open( new URL( url, SITE ).href, '_blank', 'noopener' );
	}
}

/* ------------------------------------------------------------------
 * Every call to the site carries this device's key (the site's own
 * scripts use fetch, and don't know about it).
 * ---------------------------------------------------------------- */

const nativeFetch = window.fetch.bind( window );
window.fetch = ( input, init = {} ) => {
	const url = 'string' === typeof input ? input : ( input && input.url ) || '';
	const key = getKey();
	if ( key && isSite( url ) ) {
		const headers = new Headers( init.headers || ( 'string' !== typeof input && input.headers ) || undefined );
		headers.set( 'X-Hen-Token', key );
		init = Object.assign( {}, init, { headers, credentials: 'omit' } );
	}
	return nativeFetch( input, init );
};

/* ------------------------------------------------------------------
 * The page on screen, and what the site's scripts can ask of the app.
 * ---------------------------------------------------------------- */

export const current = { url: '', hash: '', render: null };

window.henHost = {
	go: ( url ) => openUrl( url ),
	reload: () => { if ( current.render ) { current.render(); } },
	hash: () => current.hash,
	url: () => current.url || SITE + '/',
	// The site changed its address without leaving the page (filters, map view).
	replace: ( url ) => {
		const h = appHref( url );
		if ( h && h.startsWith( '#/p/' ) ) {
			current.url = new URL( url, SITE ).href;
			history.replaceState( null, '', h );
		}
	},
};

/** The settings the site's scripts read (window.henConfig), kept as one object. */
function setConfig( cfg ) {
	window.henConfig = window.henConfig || {};
	const app = store.config || {};
	const merged = Object.assign( { rest: API, tiles: app.tiles, urls: app.urls || {}, i18n: {} }, window.henConfig, cfg || {} );
	Object.assign( window.henConfig, merged, {
		loggedIn: !! getKey(),
		plus: !! ( store.me && store.me.plus ),
	} );
}

let ready = null;
/** Loads the site's styles and scripts, once. */
export function ensureSite( cfg ) {
	setConfig( cfg || ( store.config && store.config.script ) );
	if ( ! ready ) {
		const a = ( store.config && store.config.assets ) || {};
		ready = ( async () => {
			// The theme's styles go before the app's own, so the app's layout wins.
			if ( a.theme_css && ! document.querySelector( 'link[data-site-theme]' ) ) {
				const link = document.createElement( 'link' );
				link.rel = 'stylesheet';
				link.href = a.theme_css;
				link.dataset.siteTheme = '1';
				const mine = document.querySelector( 'link[href$="css/app.css"]' );
				document.head.insertBefore( link, mine || null );
			}
			await Promise.all( [ load( a.core_css ), load( a.app_css ), load( a.leaflet_css ), load( a.leaflet_js ) ] ).catch( () => {} );
			// The site's scripts show distances the way the app does.
			try {
				const u = JSON.parse( localStorage.getItem( 'hen-units' ) || '{}' );
				u.dist = units();
				localStorage.setItem( 'hen-units', JSON.stringify( u ) );
			} catch ( e ) { /* Private mode. */ }
			await load( a.core_js ).catch( () => {} );
			await load( a.site_js ).catch( () => {} );
			await Promise.all( [ a.trips_js, a.browse_js, a.map_js, a.drive_js, a.theme_js ].map( ( u ) => load( u ).catch( () => {} ) ) );
		} )();
	}
	return ready;
}

/** Runs the site's scripts over a page the app just put in place. */
export function initSite( box ) {
	const run = ( fn, arg ) => { try { if ( 'function' === typeof fn ) { fn( arg ); } } catch ( e ) { console.error( e ); } }; // eslint-disable-line no-console
	run( window.henInit, box );
	run( window.henAppInit );
	run( window.henTripsInit );
	run( window.henBrowseInit );
	run( window.henMapInit, box );
	run( window.herInit, box );
}

/**
 * Asks the site for a page, or sends it a form. Resolves to the site's
 * answer: { html, title, url, config } for a page, { redirect } when the site
 * sends the member somewhere else, or { error }.
 */
export async function fetchPage( url, form ) {
	const u = new URL( url, SITE );
	u.hash = '';
	u.searchParams.set( 'hen_app', '1' );
	let res;
	try {
		res = await window.fetch( u.href, form ? { method: 'POST', body: form } : {} );
	} catch ( e ) {
		return { error: navigator.onLine ? 'Couldn’t reach Hey! En Route. Try again in a moment.' : 'You’re offline.' };
	}
	const data = await res.json().catch( () => null );
	if ( ! data ) { return { error: 'That page didn’t load. Try again in a moment.' }; }
	// Signing in, joining or a new password on a site form: the app's key comes with the answer.
	if ( data.key ) {
		setKey( data.key );
		await loadMe( true );
	}
	if ( 401 === res.status && getKey() ) {
		setKey( '' );
		window.dispatchEvent( new CustomEvent( 'hen:signedout' ) );
	}
	return data;
}

/** Follows a redirect from the site: in the app when it's the site, else outside. */
export function follow( url ) {
	const h = appHref( url );
	if ( h ) {
		location.replace( h );
		return true;
	}
	window.open( url, '_blank', 'noopener' );
	return false;
}
