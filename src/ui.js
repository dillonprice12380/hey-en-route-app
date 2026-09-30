/** Small helpers shared by the views. */
import { SITE } from './config.js';
import { appHref } from './site.js';

export const $ = ( sel, root ) => ( root || document ).querySelector( sel );
export const $$ = ( sel, root ) => Array.from( ( root || document ).querySelectorAll( sel ) );

export const esc = ( s ) => String( s == null ? '' : s ).replace( /[&<>"']/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } )[ c ] );

/** Miles or kilometres, as the member chose (miles by default). */
export function units() {
	try { return localStorage.getItem( 'hen_units' ) || 'mi'; } catch ( e ) { return 'mi'; }
}
export function dist( km ) {
	km = Math.max( 0, km || 0 );
	return 'km' === units() ? ( km < 10 ? km.toFixed( 1 ) : Math.round( km ).toLocaleString() ) + ' km' : Math.round( km * 0.621371 ).toLocaleString() + ' mi';
}
export function duration( min ) {
	min = Math.max( 1, Math.round( min || 0 ) );
	return min < 60 ? min + ' min' : Math.floor( min / 60 ) + ' h' + ( min % 60 ? ' ' + ( min % 60 ) + ' min' : '' );
}
export function haversine( a, b ) {
	const r = 6371, rad = Math.PI / 180;
	const dLat = ( b.lat - a.lat ) * rad, dLng = ( b.lng - a.lng ) * rad;
	const h = Math.sin( dLat / 2 ) ** 2 + Math.cos( a.lat * rad ) * Math.cos( b.lat * rad ) * Math.sin( dLng / 2 ) ** 2;
	return 2 * r * Math.asin( Math.min( 1, Math.sqrt( h ) ) );
}

/** A link to the site that opens in the browser (outside the app). */
export const siteLink = ( url, text, cls = '' ) => {
	// Pages of the site open inside the app; anywhere else in the browser.
	const inApp = appHref( url || SITE );
	return '<a href="' + esc( inApp || url || SITE ) + '"' + ( inApp ? '' : ' target="_blank" rel="noopener"' ) + ( cls ? ' class="' + esc( cls ) + '"' : '' ) + '>' + esc( text ) + '</a>';
};

/** "Directions" with Google Maps, Waze and Apple Maps (same menu as the site). */
export function dirsMenu( dirs, name, big ) {
	if ( ! dirs ) { return ''; }
	return '<details class="hen-dirs' + ( big ? '' : ' hen-dirs--small' ) + '"><summary class="' + ( big ? 'hen-btn hen-btn--ghost' : 'hen-linkbtn' ) + '" aria-label="Directions to ' + esc( name ) + '">Directions</summary><ul class="hen-dirs__menu">' +
		Object.keys( dirs ).map( ( app ) => '<li><a href="' + esc( dirs[ app ][ 1 ] ) + '" target="_blank" rel="noopener">' + esc( dirs[ app ][ 0 ] ) + '</a></li>' ).join( '' ) +
		'</ul></details>';
}

/** A short message that fades. */
export function toast( text ) {
	let box = $( '.app-toasts' );
	if ( ! box ) {
		box = document.createElement( 'div' );
		box.className = 'app-toasts';
		box.setAttribute( 'role', 'status' );
		document.body.appendChild( box );
	}
	const t = document.createElement( 'p' );
	t.className = 'app-toast';
	t.textContent = text;
	box.appendChild( t );
	setTimeout( () => t.remove(), 3500 );
}

/** Loads a script or stylesheet from the site once. */
const loaded = {};
export function load( url ) {
	if ( ! url ) { return Promise.resolve(); }
	if ( ! loaded[ url ] ) {
		loaded[ url ] = new Promise( ( resolve, reject ) => {
			const css = /\.css(\?|$)/.test( url );
			const el = document.createElement( css ? 'link' : 'script' );
			if ( css ) { el.rel = 'stylesheet'; el.href = url; } else { el.src = url; el.async = true; }
			el.onload = resolve;
			el.onerror = () => { delete loaded[ url ]; reject( new Error( 'load ' + url ) ); };
			( css ? document.head : document.body ).appendChild( el );
		} );
	}
	return loaded[ url ];
}

/** Placeholder while a view loads. */
export const loading = ( text = 'Loading…' ) => '<p class="app-loading" role="status"><span class="app-spinner" aria-hidden="true"></span>' + esc( text ) + '</p>';

/** A friendly problem message with a retry. */
export const problem = ( text ) => '<div class="app-problem"><p>' + esc( text || 'Something went wrong.' ) + '</p><button type="button" class="hen-btn hen-btn--small" data-retry>Try again</button></div>';
