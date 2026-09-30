/**
 * Talking to the site: every call goes to its REST API, with this device's
 * app key once the member has signed in.
 */
import { API } from './config.js';

const KEY = 'hen_key';

export function getKey() {
	try { return localStorage.getItem( KEY ) || ''; } catch ( e ) { return ''; }
}

export function setKey( key ) {
	try {
		if ( key ) { localStorage.setItem( KEY, key ); } else { localStorage.removeItem( KEY ); }
	} catch ( e ) { /* Private mode: signed in for this visit only. */ }
}

export const signedIn = () => !! getKey();

/**
 * Calls the site. Resolves to { ok, status, body } and never throws, so views
 * can show a friendly message instead of breaking.
 */
export async function api( path, method = 'GET', body ) {
	const headers = { Accept: 'application/json' };
	if ( body !== undefined ) { headers[ 'Content-Type' ] = 'application/json'; }
	const key = getKey();
	if ( key ) { headers[ 'X-Hen-Token' ] = key; }
	try {
		const res = await fetch( API + path, { method, headers, body: body !== undefined ? JSON.stringify( body ) : undefined, credentials: 'omit' } );
		const data = await res.json().catch( () => ( {} ) );
		// A key the site no longer accepts (signed out elsewhere, or expired).
		if ( 401 === res.status && key && ! path.startsWith( 'app/login' ) ) {
			setKey( '' );
			window.dispatchEvent( new CustomEvent( 'hen:signedout' ) );
		}
		return { ok: res.ok, status: res.status, body: data || {} };
	} catch ( e ) {
		return { ok: false, status: 0, body: { message: navigator.onLine ? 'Couldn’t reach Hey! En Route. Try again in a moment.' : 'You’re offline.' } };
	}
}

/** A GET kept on the device for a while (the city list, the app's settings). */
export async function cached( path, maxAgeMs ) {
	const k = 'hen_c_' + path;
	try {
		const hit = JSON.parse( localStorage.getItem( k ) || 'null' );
		if ( hit && Date.now() - hit.t < maxAgeMs ) { return hit.v; }
	} catch ( e ) { /* ignore */ }
	const res = await api( path );
	if ( res.ok ) {
		try { localStorage.setItem( k, JSON.stringify( { t: Date.now(), v: res.body } ) ); } catch ( e ) { /* full */ }
		return res.body;
	}
	// Offline: an old copy is better than nothing.
	try { const old = JSON.parse( localStorage.getItem( k ) || 'null' ); if ( old ) { return old.v; } } catch ( e ) { /* ignore */ }
	return null;
}
