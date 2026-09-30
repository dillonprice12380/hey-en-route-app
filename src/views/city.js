/** A city: how it scores, its cost, save it, add it to a route, directions. */
import { api, signedIn } from '../api.js';
import { store, loadMe } from '../store.js';
import { $, esc, dirsMenu, toast, loading, problem } from '../ui.js';
import { appHref } from '../site.js';

export default async function city( main, [ id ] ) {
	main.innerHTML = loading();
	const res = await api( 'app/city/' + id );
	if ( ! res.ok ) {
		main.innerHTML = problem( 404 === res.status ? 'That city isn’t on Hey! En Route.' : res.body.message );
		return;
	}
	const c = res.body;
	const saved = !! ( store.me && store.me.saved && store.me.saved.includes( c.id ) );
	main.innerHTML =
		'<p class="app-back"><a href="#/explore">‹ Explore</a></p>' +
		'<figure class="app-hero"><img src="' + esc( c.image ) + '" alt="" referrerpolicy="no-referrer"></figure>' +
		'<header class="app-head"><p class="app-kicker">' + esc( c.place ) + '</p><h1 class="app-title">' + esc( c.name ) + '</h1>' +
		( c.nick ? '<p class="app-lede">' + esc( c.nick.split( ';' ).slice( 0, 2 ).join( ' · ' ) ) + '</p>' : '' ) + '</header>' +
		'<div class="app-actions">' +
			'<button type="button" class="hen-btn hen-btn--small" data-save aria-pressed="' + saved + '">' + ( saved ? 'Saved' : 'Save' ) + '</button>' +
			'<button type="button" class="hen-btn hen-btn--primary hen-btn--small" data-add>Add to a route</button>' +
			dirsMenu( c.dirs, c.name, true ) +
		'</div>' +
		( c.scores.length ? '<ul class="app-scores">' + c.scores.map( ( s ) => '<li><span class="app-score">' + s.value.toFixed( 1 ) + '</span>' + esc( s.label ) + '</li>' ).join( '' ) + '</ul>' : '' ) +
		'<dl class="app-facts">' +
			( c.day ? '<div><dt>A day, mid-range</dt><dd>About $' + c.day.toLocaleString() + '</dd></div>' : '' ) +
			( c.season ? '<div><dt>Best time to go</dt><dd>' + esc( c.season ) + '</dd></div>' : '' ) +
		'</dl>' +
		( c.places.length ? '<h2 class="app-sub">Places to go</h2><ul class="app-list">' + c.places.map( ( p ) => '<li><a class="app-row" href="' + esc( appHref( p.u ) || p.u ) + '"><span><strong>' + esc( p.t ) + '</strong><br><span class="hen-muted">' + esc( p.cat ) + '</span></span><span class="app-chevron" aria-hidden="true">›</span></a></li>' ).join( '' ) + '</ul>' : '' ) +
		'<div class="app-actions app-actions--guide">' +
			'<a class="hen-btn hen-btn--primary" href="' + esc( appHref( c.url ) ) + '">The full ' + esc( c.name ) + ' guide</a>' +
			'<a class="hen-btn" href="' + esc( appHref( c.circle || c.url + '#tab-circle' ) ) + '">' + esc( c.name ) + ' City Circle</a>' +
		'</div>' +
		'<div data-sheet></div>';

	const needSignIn = () => {
		toast( 'Sign in to save cities and build routes.' );
		location.hash = '#/account';
	};

	$( '[data-save]', main ).addEventListener( 'click', async ( e ) => {
		if ( ! signedIn() ) { needSignIn(); return; }
		const btn = e.currentTarget;
		const on = 'true' !== btn.getAttribute( 'aria-pressed' );
		btn.disabled = true;
		const r = await api( 'save', 'POST', { kind: 'city', id: c.id, on } );
		btn.disabled = false;
		if ( r.ok ) {
			btn.setAttribute( 'aria-pressed', String( on ) );
			btn.textContent = on ? 'Saved' : 'Save';
			await loadMe( true );
		} else {
			toast( r.body.message || 'Couldn’t save that.' );
		}
	} );

	// "Add to a route": pick one of theirs, or start a new one.
	$( '[data-add]', main ).addEventListener( 'click', async () => {
		if ( ! signedIn() ) { needSignIn(); return; }
		const sheet = $( '[data-sheet]', main );
		sheet.innerHTML = '<div class="app-sheet">' + loading( 'Your routes…' ) + '</div>';
		sheet.scrollIntoView( { behavior: 'smooth', block: 'end' } );
		const r = await api( 'trips' );
		if ( ! r.ok ) { sheet.innerHTML = problem( r.body.message ); return; }
		if ( ! r.body.plus ) {
			sheet.innerHTML = '<div class="app-sheet"><p>Building your own routes comes with Hey! En Route Plus.</p>' + siteLink( store.config.urls.plus, 'See Hey! En Route Plus', 'hen-btn hen-btn--primary' ) + '</div>';
			return;
		}
		sheet.innerHTML = '<div class="app-sheet"><h2 class="app-sub">Add ' + esc( c.name ) + ' to…</h2><ul class="app-list">' +
			r.body.trips.map( ( t ) => '<li><button type="button" class="app-row" data-trip="' + t.id + '"><span><strong>' + esc( t.title ) + '</strong><br><span class="hen-muted">' + t.stops + ( 1 === t.stops ? ' stop' : ' stops' ) + '</span></span><span aria-hidden="true">+</span></button></li>' ).join( '' ) +
			'<li><button type="button" class="app-row" data-trip="new"><span><strong>A new route</strong><br><span class="hen-muted">Starting in ' + esc( c.name ) + '</span></span><span aria-hidden="true">+</span></button></li></ul></div>';
		sheet.onclick = async ( e ) => {
			const b = e.target.closest( '[data-trip]' );
			if ( ! b ) { return; }
			b.disabled = true;
			if ( 'new' === b.dataset.trip ) {
				const made = await api( 'trips', 'POST', { title: c.name + ' trip', city: c.id } );
				if ( made.ok ) { location.hash = '#/route/' + made.body.id; } else { toast( made.body.message || 'Couldn’t start a route.' ); }
				return;
			}
			const added = await api( 'trips/' + b.dataset.trip + '/add', 'POST', { city: c.id } );
			if ( added.ok ) {
				toast( 'Added to ' + added.body.title + '.' );
				location.hash = '#/route/' + b.dataset.trip;
			} else {
				b.disabled = false;
				toast( added.body.message || 'Couldn’t add it.' );
			}
		};
	} );
}
