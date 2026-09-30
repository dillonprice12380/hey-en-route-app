/** Explore: find a city by name, or the ones near you. */
import { loadCities, store } from '../store.js';
import { $, esc, dist, haversine, loading } from '../ui.js';

let lastQuery = '';
let near = null; // { lat, lng } once "Near me" has been used this visit.

export default async function explore( main ) {
	main.innerHTML = '<header class="app-head"><h1 class="app-title">Where to next?</h1><p class="app-lede">Find a city, see how it scores, and plan the drive there.</p></header>' +
		'<form class="app-search" role="search" data-search><label class="screen-reader-text" for="app-q">Search cities</label>' +
		'<input id="app-q" type="search" placeholder="Search cities, states or countries" autocomplete="off" value="' + esc( lastQuery ) + '">' +
		'<button type="button" class="hen-btn hen-btn--small" data-near>Near me</button></form>' +
		'<div data-results>' + loading( 'Loading cities…' ) + '</div>';
	const cities = await loadCities();
	const input = $( '#app-q', main );
	const out = $( '[data-results]', main );

	function draw() {
		const q = input.value.trim().toLowerCase();
		lastQuery = input.value;
		let list = cities;
		if ( q ) {
			list = cities.filter( ( c ) => ( c.name + ' ' + c.place ).toLowerCase().includes( q ) )
				.sort( ( a, b ) => ( b.name.toLowerCase().startsWith( q ) - a.name.toLowerCase().startsWith( q ) ) || a.name.localeCompare( b.name ) );
		}
		if ( near ) {
			list = list.filter( ( c ) => null !== c.lat ).map( ( c ) => Object.assign( {}, c, { km: haversine( near, c ) } ) ).sort( ( a, b ) => a.km - b.km );
		} else if ( ! q ) {
			// Nothing typed: the cities members have saved first, then A–Z.
			const saved = new Set( ( store.me && store.me.saved ) || [] );
			list = list.slice().sort( ( a, b ) => ( saved.has( b.id ) - saved.has( a.id ) ) || a.name.localeCompare( b.name ) );
		}
		const shown = list.slice( 0, 60 );
		out.innerHTML = shown.length
			? '<p class="app-count">' + ( near ? 'Nearest to you' : q ? list.length + ' found' : cities.length + ' cities' ) + '</p><ul class="app-list">' + shown.map( ( c ) =>
				'<li><a class="app-row" href="#/city/' + c.id + '"><span><strong>' + esc( c.name ) + '</strong><br><span class="hen-muted">' + esc( c.place ) + '</span></span>' +
				( undefined !== c.km ? '<span class="app-row__meta">' + dist( c.km ) + '</span>' : '<span class="app-chevron" aria-hidden="true">›</span>' ) + '</a></li>' ).join( '' ) + '</ul>'
			: '<p class="app-empty">No cities match “' + esc( input.value ) + '”.</p>';
	}

	input.addEventListener( 'input', draw );
	$( '[data-search]', main ).addEventListener( 'submit', ( e ) => { e.preventDefault(); input.blur(); } );
	$( '[data-near]', main ).addEventListener( 'click', ( e ) => {
		const btn = e.currentTarget;
		if ( near ) { near = null; btn.textContent = 'Near me'; draw(); return; }
		if ( ! navigator.geolocation ) { return; }
		btn.disabled = true;
		btn.textContent = 'Finding you…';
		navigator.geolocation.getCurrentPosition( ( pos ) => {
			near = { lat: pos.coords.latitude, lng: pos.coords.longitude };
			btn.disabled = false;
			btn.textContent = 'All cities';
			draw();
		}, () => {
			btn.disabled = false;
			btn.textContent = 'Near me';
			out.insertAdjacentHTML( 'afterbegin', '<p class="app-note">Location is off for this app. Allow it in your browser or phone settings to see cities near you.</p>' );
		}, { timeout: 15000, maximumAge: 600000 } );
	} );
	draw();
}
