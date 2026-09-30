/**
 * The app's service worker: opens instantly and works offline for what the
 * member has seen, and shows travel alerts pushed by the site.
 *
 * The site sends an empty "wake up" push; this asks the site what's new
 * (by this device's push address) and shows it.
 */
const VERSION = 'hen-app-6';
const SHELL = [
	'./',
	'index.html',
	'manifest.webmanifest',
	'css/app.css',
	'src/app.js',
	'src/api.js',
	'src/config.js',
	'src/store.js',
	'src/ui.js',
	'src/views/explore.js',
	'src/views/city.js',
	'src/views/routes.js',
	'src/views/route.js',
	'src/views/alerts.js',
	'src/views/account.js',
	'src/views/reset.js',
	'src/views/page.js',
	'src/views/community.js',
	'src/site.js',
	'icons/icon-192.png',
	'icons/icon-512.png',
];
const SITE = new URL( location ).searchParams.get( 'site' ) || 'https://heyenroute.com';
const APP = new URL( './', location ).href;

self.addEventListener( 'install', ( e ) => {
	e.waitUntil( caches.open( VERSION ).then( ( c ) => c.addAll( SHELL ) ).then( () => self.skipWaiting() ) );
} );

self.addEventListener( 'activate', ( e ) => {
	e.waitUntil(
		caches.keys().then( ( keys ) => Promise.all( keys.filter( ( k ) => k !== VERSION && k !== 'hen-api' && k !== 'hen-site' ).map( ( k ) => caches.delete( k ) ) ) )
			.then( () => self.clients.claim() )
	);
} );

self.addEventListener( 'fetch', ( e ) => {
	const req = e.request;
	if ( 'GET' !== req.method ) { return; }
	const url = new URL( req.url );

	// The app itself: from the cache at once, refreshed in the background.
	if ( url.origin === location.origin ) {
		e.respondWith(
			caches.open( VERSION ).then( ( c ) => c.match( req, { ignoreSearch: true } ).then( ( hit ) => {
				const fresh = fetch( req ).then( ( res ) => { if ( res.ok ) { c.put( req, res.clone() ); } return res; } ).catch( () => hit );
				return hit || fresh;
			} ) )
		);
		return;
	}

	// The site's data: fresh when online, the last copy when offline.
	if ( url.href.startsWith( SITE + '/wp-json/hen/v1/' ) && ! url.pathname.includes( '/app/reset' ) ) {
		e.respondWith(
			fetch( req ).then( ( res ) => {
				if ( res.ok ) { const copy = res.clone(); caches.open( 'hen-api' ).then( ( c ) => c.put( req, copy ) ); }
				return res;
			} ).catch( () => caches.open( 'hen-api' ).then( ( c ) => c.match( req ) ) )
		);
		return;
	}

	// The site's scripts and styles (driving mode, maps): cached for offline.
	if ( url.href.startsWith( SITE + '/wp-content/' ) ) {
		e.respondWith(
			caches.open( 'hen-site' ).then( ( c ) => c.match( req ).then( ( hit ) => {
				const fresh = fetch( req ).then( ( res ) => { if ( res.ok || 'opaque' === res.type ) { c.put( req, res.clone() ); } return res; } ).catch( () => hit );
				return hit || fresh;
			} ) )
		);
	}
} );

self.addEventListener( 'push', ( e ) => {
	const fallback = { title: 'Hey! En Route', body: 'You have a new travel alert.', tag: 'hen' };
	e.waitUntil(
		self.registration.pushManager.getSubscription()
			.then( ( sub ) => fetch( SITE + '/wp-json/hen/v1/push/latest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify( { endpoint: sub ? sub.endpoint : '' } ) } ) )
			.then( ( r ) => r.json() )
			.catch( () => fallback )
			.then( ( d ) => {
				d = d && d.title ? d : fallback;
				return self.registration.showNotification( d.title, { body: d.body, tag: d.tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: APP + '#/alerts' } } );
			} )
	);
} );

self.addEventListener( 'notificationclick', ( e ) => {
	e.notification.close();
	e.waitUntil(
		self.clients.matchAll( { type: 'window', includeUncontrolled: true } ).then( ( list ) => {
			const open = list.find( ( c ) => c.url.startsWith( APP ) );
			if ( open ) { open.navigate( e.notification.data.url ); return open.focus(); }
			return self.clients.openWindow( e.notification.data.url );
		} )
	);
} );
