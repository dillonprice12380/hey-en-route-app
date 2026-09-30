/**
 * One route: its stops and drives on a map, what it costs, travel alerts,
 * what's along the way, editing the stops, and driving mode.
 */
import { api } from '../api.js';
import { store, loadCities } from '../store.js';
import { prepareDriving } from '../app.js';
import { $, esc, dist, duration, dirsMenu, siteLink, toast, load, loading, problem } from '../ui.js';

const modeName = ( m ) => ( { car: 'Car', train: 'Train', bus: 'Bus', ferry: 'Ferry', flight: 'Flight' } )[ m ] || 'Travel';
const money = ( n ) => '$' + Math.round( n ).toLocaleString();

export default async function route( outer, [ id ] ) {
	outer.innerHTML = loading();
	const res = await api( 'trips/' + id );
	if ( ! res.ok ) {
		outer.innerHTML = problem( 403 === res.status || 401 === res.status ? 'That route isn’t yours, or you’ve been signed out.' : res.body.message );
		return;
	}
	let data = res.body;
	prepareDriving().catch( () => {} ); // Ready before they tap "Driving mode".
	// This screen's own container, so its handlers go when the screen does.
	const main = document.createElement( 'div' );
	outer.replaceChildren( main );

	function draw() {
		const s = data.summary;
		const ids = s.stops.map( ( x ) => x.id ).join( ',' );
		main.innerHTML =
			'<p class="app-back"><a href="#/routes">‹ My routes</a></p>' +
			'<header class="app-head"><h1 class="app-title">' + esc( data.title ) + '</h1>' +
			'<p class="app-lede">' + [ s.stops.length + ( 1 === s.stops.length ? ' stop' : ' stops' ), s.km ? dist( s.km ) : '', s.minutes ? duration( s.minutes ) + ' travelling' : '', s.nights + ( 1 === s.nights ? ' night' : ' nights' ) ].filter( Boolean ).join( ' · ' ) + '</p></header>' +
			'<div class="app-actions">' +
				( s.stops.length ? '<button type="button" class="hen-btn hen-btn--primary" data-hen-drive data-stops="' + ids + '" data-trip="' + data.id + '" data-title="' + esc( data.title ) + '">Driving mode</button>' : '' ) +
				( s.gmaps ? '<a class="hen-btn hen-btn--ghost" href="' + esc( s.gmaps ) + '" target="_blank" rel="noopener">Whole route in Google Maps</a>' : '' ) +
			'</div>' +
			'<div class="app-map" data-map aria-label="Map of the route"></div>' +
			'<label class="app-field"><span>Setting off</span><input type="date" data-start value="' + esc( data.opts.start ) + '"></label>' +
			'<p class="hen-fine app-fine-top">With a start date, you’re told about weather, fires, emergencies and road closures on this route as they happen.</p>' +
			'<ol class="app-stops" data-stops>' + s.stops.map( ( st, n ) => {
				const leg = n && s.legs[ n - 1 ];
				return ( leg ? '<li class="app-leg">' + esc( modeName( leg.mode ) ) + ( leg.minutes ? ' · ' + duration( leg.minutes ) : '' ) + ( leg.km ? ' · ' + dist( leg.km ) : '' ) + ( leg.estimated ? ' <span class="hen-muted">(estimate)</span>' : '' ) + '</li>' : '' ) +
					'<li class="app-stop" data-i="' + n + '"><span class="app-stop__num">' + ( n + 1 ) + '</span><div class="app-stop__main">' +
					'<a href="#/city/' + st.id + '"><strong>' + esc( st.name ) + '</strong></a> <span class="hen-muted">' + esc( st.place ) + '</span>' +
					( st.arrive ? '<br><span class="hen-muted">' + esc( st.arrive ) + ( st.leave && st.leave !== st.arrive ? ' → ' + esc( st.leave ) : '' ) + '</span>' : '' ) +
					'<div class="app-stop__tools"><span class="app-nights"><button type="button" class="hen-btn hen-btn--icon" data-nights="-1" aria-label="One night fewer in ' + esc( st.name ) + '">−</button> ' + st.nights + ( 1 === st.nights ? ' night' : ' nights' ) + ' <button type="button" class="hen-btn hen-btn--icon" data-nights="1" aria-label="One more night in ' + esc( st.name ) + '">+</button></span>' +
					dirsMenu( st.dirs, st.name ) + '</div>' +
					( st.places && st.places.length ? '<ul class="app-planned">' + st.places.map( ( p ) => '<li>' + ( p.road ? '<span class="hen-builder__road">on the drive onward</span> ' : '' ) + siteLink( p.url, p.title ) + ' <span class="hen-muted">' + esc( p.kind ) + '</span></li>' ).join( '' ) + '</ul>' : '' ) +
					'</div><div class="app-stop__move">' +
					'<button type="button" class="hen-btn hen-btn--icon" data-move="-1" aria-label="Move ' + esc( st.name ) + ' earlier"' + ( n ? '' : ' disabled' ) + '>↑</button>' +
					'<button type="button" class="hen-btn hen-btn--icon" data-move="1" aria-label="Move ' + esc( st.name ) + ' later"' + ( n < s.stops.length - 1 ? '' : ' disabled' ) + '>↓</button>' +
					'<button type="button" class="hen-btn hen-btn--icon" data-remove aria-label="Remove ' + esc( st.name ) + '">×</button></div></li>';
			} ).join( '' ) + '</ol>' +
			'<form class="app-add" data-add><label class="app-field"><span>Add a stop</span><input list="app-cities" placeholder="Type a city…" autocomplete="off"></label><button class="hen-btn hen-btn--primary hen-btn--small" type="submit">Add</button><datalist id="app-cities"></datalist></form>' +
			( undefined !== s.total_cost ? '<dl class="app-facts"><div><dt>Stays</dt><dd>' + money( s.stay_cost ) + '</dd></div>' + ( s.fuel_cost ? '<div><dt>Fuel</dt><dd>' + money( s.fuel_cost ) + '</dd></div>' : '' ) + '<div><dt>Estimated total</dt><dd><strong>' + money( s.total_cost ) + '</strong></dd></div></dl>' : '' ) +
			'<section data-alerts></section>' +
			'<section data-along></section>' +
			'';
		drawMap();
		drawAlerts( ids );
		drawAlong( ids );
		fillCities();
	}

	/* Saving: the site sends back the route, worked out again. */
	async function save( changes ) {
		main.classList.add( 'is-busy' );
		const r = await api( 'trips/' + data.id, 'POST', changes );
		main.classList.remove( 'is-busy' );
		if ( r.ok ) { data = r.body; draw(); return true; }
		toast( 402 === r.status ? 'Editing routes comes with Hey! En Route Plus.' : ( r.body.message || 'Couldn’t save that.' ) );
		return false;
	}
	const stopsNow = () => data.stops.map( ( x ) => ( { city: x.city, nights: x.nights, note: x.note || '', places: x.places || [] } ) );

	main.addEventListener( 'click', ( e ) => {
		const li = e.target.closest( '.app-stop' );
		if ( ! li ) { return; }
		const i = +li.dataset.i;
		const list = stopsNow();
		const nights = e.target.closest( '[data-nights]' );
		const move = e.target.closest( '[data-move]' );
		if ( nights ) {
			list[ i ].nights = Math.max( 0, Math.min( 60, list[ i ].nights + +nights.dataset.nights ) );
		} else if ( move ) {
			const j = i + +move.dataset.move;
			if ( j < 0 || j >= list.length ) { return; }
			[ list[ i ], list[ j ] ] = [ list[ j ], list[ i ] ];
		} else if ( e.target.closest( '[data-remove]' ) ) {
			if ( ! window.confirm( 'Remove this stop?' ) ) { return; }
			list.splice( i, 1 );
		} else {
			return;
		}
		save( { stops: list } );
	} );
	main.addEventListener( 'change', ( e ) => {
		if ( e.target.matches( '[data-start]' ) ) { save( { opts: { start: e.target.value } } ); }
	} );
	main.addEventListener( 'submit', async ( e ) => {
		if ( ! e.target.matches( '[data-add]' ) ) { return; }
		e.preventDefault();
		const input = $( 'input', e.target );
		const name = input.value.trim().toLowerCase();
		const cities = await loadCities();
		const c = cities.find( ( x ) => ( x.name + ', ' + x.place ).toLowerCase() === name ) || cities.find( ( x ) => x.name.toLowerCase() === name ) || cities.find( ( x ) => x.name.toLowerCase().startsWith( name ) );
		if ( ! c ) { toast( 'No city called “' + input.value + '” on Hey! En Route.' ); return; }
		save( { stops: stopsNow().concat( [ { city: c.id, nights: 1, note: '', places: [] } ] ) } );
	} );

	async function fillCities() {
		const list = $( '#app-cities', main );
		const cities = await loadCities();
		if ( list ) { list.innerHTML = cities.map( ( c ) => '<option value="' + esc( c.name + ', ' + c.place ) + '"></option>' ).join( '' ); }
	}

	/* The map: the real roads where the site knows them. */
	async function drawMap() {
		const el = $( '[data-map]', main );
		await load( store.config.assets.leaflet_css ).catch( () => {} );
		await load( store.config.assets.leaflet_js ).catch( () => {} );
		if ( ! window.L || ! el || ! el.isConnected ) { if ( el ) { el.hidden = true; } return; }
		const s = data.summary;
		const map = L.map( el, { scrollWheelZoom: false, attributionControl: true } );
		L.tileLayer( store.config.tiles.url, { attribution: store.config.tiles.attribution, maxZoom: 18 } ).addTo( map );
		const on = s.stops.filter( ( x ) => null !== x.lat );
		let line = [];
		on.forEach( ( st, i ) => {
			const leg = i ? ( s.legs || [] ).find( ( l ) => l.from === on[ i - 1 ].id && l.to === st.id && l.path ) : null;
			line = leg ? line.concat( leg.path ) : line.concat( [ [ st.lat, st.lng ] ] );
			L.marker( [ st.lat, st.lng ], { icon: L.divIcon( { className: 'app-pin', html: '<span>' + ( i + 1 ) + '</span>', iconSize: [ 26, 26 ], iconAnchor: [ 13, 13 ] } ), title: st.name } ).addTo( map );
		} );
		if ( line.length > 1 ) { L.polyline( line, { color: '#1b6a66', weight: 4 } ).addTo( map ); }
		if ( on.length ) { map.fitBounds( on.map( ( x ) => [ x.lat, x.lng ] ).concat( line ), { padding: [ 24, 24 ], maxZoom: 10 } ); } else { map.setView( [ 39, -96 ], 3 ); }
	}

	/* Travel alerts on the route (Plus). */
	async function drawAlerts( ids ) {
		const box = $( '[data-alerts]', main );
		if ( ! ids || ! box ) { return; }
		const r = await api( 'alerts/route?stops=' + encodeURIComponent( ids ) );
		if ( ! r.ok || ! box.isConnected ) { return; }
		if ( ! r.body.plus ) {
			box.innerHTML = '<h2 class="app-sub">Travel alerts</h2><div class="app-card"><p>Weather warnings, wildfires, emergencies and road closures on your route, as they happen, come with Hey! En Route Plus.</p>' + siteLink( store.config.urls.plus, 'See Hey! En Route Plus', 'hen-btn hen-btn--primary hen-btn--small' ) + '</div>';
			return;
		}
		const list = r.body.alerts || [];
		box.innerHTML = '<h2 class="app-sub">Travel alerts</h2>' + ( list.length
			? list.map( ( a ) => '<article class="hen-alert hen-alert--' + a.level + '"><h4 class="hen-alert__title">' + esc( a.title ) + '</h4>' + ( a.ends ? '<p class="hen-alert__meta">until ' + esc( a.ends ) + '</p>' : '' ) + ( a.advice ? '<p class="hen-alert__advice"><strong>What to do:</strong> ' + esc( a.advice ) + '</p>' : '' ) + '</article>' ).join( '' )
			: '<p class="hen-muted">Nothing on this route right now.</p>' );
	}

	/* Along the way: the towns on the drive, and places right by the road. */
	async function drawAlong( ids ) {
		const box = $( '[data-along]', main );
		if ( ! ids || ! box ) { return; }
		const r = await api( 'drive?stops=' + encodeURIComponent( ids ) + '&trip=' + data.id );
		if ( ! r.ok || ! box.isConnected ) { return; }
		const d = r.body;
		const road = d.places.filter( ( p ) => ! p.town );
		if ( ! d.towns.length && ! road.length ) { box.innerHTML = ''; return; }
		box.innerHTML = '<h2 class="app-sub">Along the way</h2>' +
			( d.towns.length ? '<p class="hen-muted">Towns on the drive</p><ul class="app-chips">' + d.towns.map( ( t ) => '<li><a href="#/city/' + t.id + '">' + esc( t.t ) + ' <span class="hen-muted">' + t.n + '</span></a></li>' ).join( '' ) + '</ul>' : '' ) +
			( road.length ? '<p class="hen-muted">On the road</p><ul class="app-list">' + road.slice( 0, 12 ).map( ( p ) => '<li class="app-row app-row--static"><span>' + siteLink( p.u, p.t ) + '<br><span class="hen-muted">' + esc( p.cat ) + '</span></span>' + dirsMenu( p.dirs, p.t ) + '</li>' ).join( '' ) + '</ul>' : '' );
	}

	draw();
}
