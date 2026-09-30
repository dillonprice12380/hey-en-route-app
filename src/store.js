/**
 * What the app knows: the site's settings, the signed-in member, the cities.
 */
import { api, cached, signedIn, setKey } from './api.js';

export const store = {
	config: null,
	me: null,
	cities: null,
};

const HOUR = 3600e3;

/** The site's settings (names, map tiles, push key, where its scripts are). */
export async function loadConfig() {
	store.config = await cached( 'app/config', 6 * HOUR );
	return store.config;
}

/** The signed-in member (null when signed out). */
export async function loadMe( fresh = false ) {
	if ( ! signedIn() ) { store.me = null; return null; }
	if ( store.me && ! fresh ) { return store.me; }
	const res = await api( 'app/me' );
	if ( res.ok ) { store.me = res.body; }
	return store.me;
}

/** Every city on the site (a light list, kept for a day). */
export async function loadCities() {
	if ( ! store.cities ) { store.cities = ( await cached( 'cities', 24 * HOUR ) ) || []; }
	return store.cities;
}

export async function signIn( login, password ) {
	const device = /iphone|ipad/i.test( navigator.userAgent ) ? 'iPhone app' : /android/i.test( navigator.userAgent ) ? 'Android app' : 'App';
	const res = await api( 'app/login', 'POST', { login, password, device } );
	if ( res.ok && res.body.key ) {
		setKey( res.body.key );
		store.me = res.body.me;
	}
	return res;
}

export async function signOut() {
	await api( 'app/logout', 'POST', {} );
	setKey( '' );
	store.me = null;
	// Forget this member's routes and alerts kept for offline use.
	if ( 'caches' in window ) { caches.delete( 'hen-api' ).catch( () => {} ); }
}
