/** Alerts: travel alerts on the member's routes, then their notifications. */
import { api, signedIn } from '../api.js';
import { store, loadMe } from '../store.js';
import { esc, siteLink, loading, problem } from '../ui.js';

export default async function alerts( main ) {
	if ( ! signedIn() ) {
		main.innerHTML = '<header class="app-head"><h1 class="app-title">Alerts</h1></header><div class="app-card"><p>Sign in to see travel alerts for your routes and your notifications.</p><a class="hen-btn hen-btn--primary" href="#/account">Sign in</a></div>';
		return;
	}
	main.innerHTML = '<header class="app-head"><h1 class="app-title">Alerts</h1></header>' + loading();
	const [ a, n ] = await Promise.all( [ api( 'app/alerts' ), api( 'notices' ) ] );
	if ( ! a.ok && ! n.ok ) { main.innerHTML = problem( a.body.message ); return; }

	let html = '<header class="app-head"><h1 class="app-title">Alerts</h1></header><h2 class="app-sub">Travel alerts on your routes</h2>';
	if ( a.ok && ! a.body.plus ) {
		html += '<div class="app-card"><p>Weather warnings, wildfires, emergencies and road closures on your routes, as they happen, come with Hey! En Route Plus.</p>' + siteLink( store.config.urls.plus, 'See Hey! En Route Plus', 'hen-btn hen-btn--primary hen-btn--small' ) + '</div>';
	} else if ( a.ok && a.body.alerts.length ) {
		html += a.body.alerts.map( ( x ) =>
			'<article class="hen-alert hen-alert--' + x.level + '" id="alert-' + x.id + '">' +
			'<p class="hen-alert__meta"><span class="hen-alert__level">' + esc( x.label ) + '</span> ' + esc( [ x.kind, x.near ? 'near ' + x.near : '', x.ends ? 'until ' + x.ends : '' ].filter( Boolean ).join( ' · ' ) ) + '</p>' +
			'<h4 class="hen-alert__title">' + esc( x.title ) + '</h4>' +
			'<p class="hen-muted">On ' + esc( x.trips.join( ', ' ) ) + '</p>' +
			( x.summary ? '<p>' + esc( x.summary ) + '</p>' : '' ) +
			( x.advice ? '<p class="hen-alert__advice"><strong>What to do:</strong> ' + esc( x.advice ) + '</p>' : '' ) +
			( x.details || x.area ? '<details><summary>Details</summary>' + ( x.area ? '<p><strong>Area:</strong> ' + esc( x.area ) + '</p>' : '' ) + ( x.details ? '<p class="hen-alert__details">' + esc( x.details ) + '</p>' : '' ) + '</details>' : '' ) +
			'<p class="hen-fine">Source: ' + esc( x.credit ) + ( x.url ? ' · ' + siteLink( x.url, 'More' ) : '' ) + '</p></article>'
		).join( '' );
	} else {
		html += '<p class="hen-muted">No alerts on your routes right now. Routes with a start date are checked every few minutes.</p>';
	}
	html += '<p class="hen-fine">From public weather, wildfire, emergency and road feeds. Not an emergency service: always follow local authorities.</p>';

	html += '<h2 class="app-sub">Notifications</h2>';
	if ( n.ok && n.body.items.length ) {
		html += '<ul class="app-list">' + n.body.items.map( ( x ) =>
			'<li class="app-row app-row--static' + ( x.unread ? ' is-unread' : '' ) + '"><span>' + ( x.url ? siteLink( x.url, x.text ) : esc( x.text ) ) + '<br><span class="hen-muted">' + esc( x.ago ) + ' ago</span></span></li>' ).join( '' ) + '</ul>';
		if ( n.body.unread ) { api( 'notices', 'POST', { all: true } ).then( () => loadMe( true ) ); }
	} else {
		html += '<p class="hen-muted">Nothing yet.</p>';
	}
	main.innerHTML = html;
}
