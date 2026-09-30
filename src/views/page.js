/**
 * A page of the website, inside the app (#/p/<address>): the full city
 * guides, circles and discussions, messages, connections, profile, privacy,
 * notification and account settings, listings, reviews, events and the rest.
 * See site.js.
 */
import { SITE } from '../config.js';
import { store } from '../store.js';
import { esc, loading, problem, toast } from '../ui.js';
import { current, ensureSite, fetchPage, follow, initSite, isSite, openUrl } from '../site.js';

export default async function page( main, [ enc ] ) {
	const address = decodeURIComponent( enc || '/' );
	const url = new URL( address, SITE );
	const hash = url.hash;
	url.hash = '';

	const render = async ( data ) => {
		if ( ! data ) {
			main.innerHTML = loading();
			data = await fetchPage( url.href );
		}
		if ( data.redirect ) {
			const before = location.hash;
			follow( data.redirect );
			if ( location.hash === before ) { toast( 'Done.' ); }
			return;
		}
		if ( data.error ) {
			main.innerHTML = problem( data.error );
			return;
		}
		await ensureSite( data.config );
		current.url = data.url || url.href;
		current.hash = hash;
		let title = ( data.title || '' ).replace( /\s[–|-]\s[^–|-]+$/, '' );
		// Account pages: the section's name ("Messages"), not "My Account".
		const view = new URL( data.url || url.href ).searchParams.get( 'view' );
		const named = view && store.me && ( store.me.views || [] ).find( ( v ) => v.key === view );
		if ( named ) { title = named.label; } else if ( 'onboarding' === view ) { title = 'Your travel profile'; }
		document.title = title ? title + ' · Hey! En Route' : 'Hey! En Route';
		main.innerHTML =
			'<div class="app-pagebar"><button type="button" class="app-pagebar__back" data-back aria-label="Back">‹</button><span class="app-pagebar__title">' + esc( title ) + '</span></div>' +
			( data.plain && older( store.config && store.config.version, '3.14.0' ) ? '<p class="app-note">This page shows as a visitor sees it until Hey! En Route’s site is updated.</p>' : '' ) +
			'<div class="app-page ' + esc( data.body || '' ) + '">' + ( data.html || '' ) + '</div>';
		const box = main.querySelector( '.app-page' );
		initSite( box );
		if ( hash && ! /^#tab-/.test( hash ) ) {
			const target = document.getElementById( decodeURIComponent( hash.slice( 1 ) ) );
			if ( target ) { setTimeout( () => target.scrollIntoView( { block: 'start' } ), 50 ); }
		}
	};
	current.render = () => render();
	current.form = render;
	await render();
}

/** Is version a older than b ("3.13.0" < "3.14.0")? */
function older( a, b ) {
	const x = String( a || '0' ).split( '.' ).map( Number );
	const y = String( b ).split( '.' ).map( Number );
	for ( let i = 0; i < 3; i++ ) {
		if ( ( x[ i ] || 0 ) !== ( y[ i ] || 0 ) ) { return ( x[ i ] || 0 ) < ( y[ i ] || 0 ); }
	}
	return false;
}

/* Back: to where the member came from in the app. */
document.addEventListener( 'click', ( e ) => {
	if ( e.target.closest( '[data-back]' ) ) {
		if ( history.length > 1 ) { history.back(); } else { location.hash = '#/explore'; }
	}
} );

/*
 * Links and forms in site pages. These run after the site's own handlers
 * (window, bubbling), so anything the site's scripts handle is left alone.
 */
window.addEventListener( 'click', ( e ) => {
	if ( e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey ) { return; }
	const a = e.target.closest( 'a[href]' );
	if ( ! a || ! a.closest( '.app-page, .hen-dialog, dialog, .hen-toast, .hen-toasts' ) ) { return; }
	const href = a.getAttribute( 'href' );
	if ( ! href || /^(mailto|tel|sms|geo|maps|webcal|javascript):/i.test( href ) ) { return; }
	// A link within the page.
	if ( href.startsWith( '#' ) ) {
		e.preventDefault();
		const target = document.getElementById( decodeURIComponent( href.slice( 1 ) ) );
		if ( target ) { target.scrollIntoView( { behavior: 'smooth', block: 'start' } ); }
		return;
	}
	const abs = new URL( href, current.url || SITE );
	if ( ! isSite( abs.href ) ) { return; } // Other websites open as usual.
	e.preventDefault();
	const here = new URL( current.url || SITE );
	if ( abs.pathname === here.pathname && abs.search === here.search && abs.hash ) {
		const target = document.getElementById( decodeURIComponent( abs.hash.slice( 1 ) ) );
		if ( target ) { target.scrollIntoView( { behavior: 'smooth', block: 'start' } ); return; }
	}
	openUrl( abs.href );
} );

window.addEventListener( 'submit', async ( e ) => {
	const form = e.target;
	if ( e.defaultPrevented || ! form.closest( '.app-page, .hen-dialog, dialog' ) ) { return; }
	let action = new URL( form.getAttribute( 'action' ) || current.url || SITE, current.url || SITE );
	if ( ! isSite( action.href ) ) { return; }
	// Replies and reviews go through the site's app handler (see app-pages.php).
	if ( /\/wp-comments-post\.php$/.test( action.pathname ) ) {
		action = new URL( SITE + '/?hen_comment=1' );
	}
	e.preventDefault();
	const data = new FormData( form );
	if ( e.submitter && e.submitter.name ) { data.append( e.submitter.name, e.submitter.value ); }
	if ( 'post' !== ( form.getAttribute( 'method' ) || 'get' ).toLowerCase() ) {
		for ( const [ k, v ] of data ) { if ( 'string' === typeof v ) { action.searchParams.append( k, v ); } }
		openUrl( action.href );
		return;
	}
	const button = e.submitter || form.querySelector( '[type=submit]' );
	if ( button ) { button.disabled = true; }
	const answer = await fetchPage( action.href, data );
	if ( button ) { button.disabled = false; }
	if ( answer.error ) {
		toast( answer.error );
		return;
	}
	if ( answer.redirect ) {
		const before = location.hash;
		follow( answer.redirect );
		// Back on the same page (a message like "Saved"): show it again.
		if ( location.hash === before && current.render ) { current.render(); }
		return;
	}
	if ( current.form ) { current.form( answer ); }
} );

/* Which tab a site page belongs under. */
export function tabFor( address ) {
	const u = new URL( address, SITE );
	const urls = ( store.config && store.config.urls ) || {};
	const view = u.searchParams.get( 'view' ) || '';
	if ( urls.account && u.pathname === new URL( urls.account ).pathname ) {
		return [ 'circles', 'connections', 'messages' ].includes( view ) ? 'community' : 'account';
	}
	if ( /\/circles?\//.test( u.pathname ) || ( urls.circles && u.pathname === new URL( urls.circles ).pathname ) || /#(tab-)?circle/.test( u.hash ) ) {
		return 'community';
	}
	if ( urls.plus && u.pathname === new URL( urls.plus ).pathname ) { return 'account'; }
	return 'explore';
}
