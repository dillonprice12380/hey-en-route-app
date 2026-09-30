/** My routes: the member's routes, and starting a new one. */
import { api, signedIn } from '../api.js';
import { store } from '../store.js';
import { $, esc, siteLink, toast, loading, problem } from '../ui.js';

export default async function routes( main ) {
	if ( ! signedIn() ) {
		main.innerHTML = '<header class="app-head"><h1 class="app-title">My routes</h1></header>' +
			'<div class="app-card"><p>Sign in to see your routes, plan stops and use driving mode.</p><a class="hen-btn hen-btn--primary" href="#/account">Sign in</a></div>';
		return;
	}
	main.innerHTML = '<header class="app-head"><h1 class="app-title">My routes</h1></header>' + loading();
	const res = await api( 'trips' );
	if ( ! res.ok ) { main.innerHTML = problem( res.body.message ); return; }
	const { plus, trips } = res.body;
	main.innerHTML = '<header class="app-head app-head--row"><h1 class="app-title">My routes</h1>' +
		( plus ? '<button type="button" class="hen-btn hen-btn--primary hen-btn--small" data-new>New route</button>' : '' ) + '</header>' +
		( plus ? '' : '<div class="app-card"><p>Build your own routes, with drive times, costs, driving mode and travel alerts, with Hey! En Route Plus.</p>' + siteLink( store.config.urls.plus, 'See Hey! En Route Plus', 'hen-btn hen-btn--primary' ) + '</div>' ) +
		( trips.length
			? '<ul class="app-list">' + trips.map( ( t ) => '<li><a class="app-row" href="#/route/' + t.id + '"><span><strong>' + esc( t.title ) + '</strong><br><span class="hen-muted">' + t.stops + ( 1 === t.stops ? ' stop' : ' stops' ) + '</span></span><span class="app-chevron" aria-hidden="true">›</span></a></li>' ).join( '' ) + '</ul>'
			: '<p class="app-empty">No routes yet. Find a city in Explore and add it to a route, or start one here.</p>' );
	const add = $( '[data-new]', main );
	if ( add ) {
		add.addEventListener( 'click', async () => {
			const title = window.prompt( 'Name your route', 'My road trip' );
			if ( null === title ) { return; }
			add.disabled = true;
			const made = await api( 'trips', 'POST', { title: title.trim() || 'My road trip' } );
			if ( made.ok ) { location.hash = '#/route/' + made.body.id; } else { add.disabled = false; toast( made.body.message || 'Couldn’t start a route.' ); }
		} );
	}
}
