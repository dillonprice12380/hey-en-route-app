/**
 * Where the app gets everything from.
 *
 * SITE is the Hey! En Route WordPress site. For testing against another copy
 * of the site, open the app once with ?site=https://staging.example.com and
 * it remembers it on this device (?site=reset goes back to the default).
 */
export const DEFAULT_SITE = 'https://heyenroute.com';

function pickSite() {
	const params = new URLSearchParams( location.search );
	const asked = params.get( 'site' );
	try {
		if ( 'reset' === asked ) {
			localStorage.removeItem( 'hen_site' );
		} else if ( asked && /^https?:\/\/[^/\s]+/i.test( asked ) ) {
			localStorage.setItem( 'hen_site', asked.replace( /\/+$/, '' ) );
		}
		return localStorage.getItem( 'hen_site' ) || DEFAULT_SITE;
	} catch ( e ) {
		return DEFAULT_SITE;
	}
}

export const SITE = pickSite();
export const API = SITE + '/wp-json/hen/v1/';
