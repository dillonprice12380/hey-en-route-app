/**
 * Choose a new password: where the link in the reset email opens
 * (#/reset?key=…&login=…). The member stays in the app throughout, and is
 * signed in once the new password is saved.
 */
import { api, setKey } from '../api.js';
import { store } from '../store.js';
import { $, esc, toast } from '../ui.js';

export default async function reset( main ) {
	const q = new URLSearchParams( ( location.hash.split( '?' )[ 1 ] ) || '' );
	const link = { key: q.get( 'key' ) || '', login: q.get( 'login' ) || '' };
	const head = '<header class="app-head"><h1 class="app-title">Choose a new password</h1></header>';

	const bad = ( text ) => {
		main.innerHTML = head + '<p class="app-error" role="alert">' + esc( text ) + '</p>' +
			'<p class="app-links"><a href="#/account">Back to sign in</a>, and use <strong>Forgot your password?</strong> to get a new link.</p>';
	};
	if ( ! link.key || ! link.login ) { bad( 'That reset link isn’t complete. Open it from the email again.' ); return; }

	const check = await api( 'app/reset?key=' + encodeURIComponent( link.key ) + '&login=' + encodeURIComponent( link.login ) );
	if ( ! check.ok ) { bad( check.body.message || 'That reset link has expired or was already used.' ); return; }

	main.innerHTML = head +
		'<form class="app-form" data-reset>' +
		'<p class="app-lede">For ' + esc( check.body.email ) + '</p>' +
		'<input type="text" name="username" value="' + esc( check.body.email ) + '" autocomplete="username" hidden>' +
		'<label class="app-field"><span>New password (8+ characters)</span><input type="password" name="password" minlength="8" autocomplete="new-password" required></label>' +
		'<label class="app-field"><span>New password again</span><input type="password" name="password2" minlength="8" autocomplete="new-password" required></label>' +
		'<p class="app-error" data-error role="alert" hidden></p>' +
		'<button class="hen-btn hen-btn--primary" type="submit">Save my new password</button></form>';

	$( '[data-reset]', main ).addEventListener( 'submit', async ( e ) => {
		e.preventDefault();
		const f = e.currentTarget;
		const err = $( '[data-error]', f );
		const btn = $( 'button', f );
		err.hidden = true;
		if ( f.password.value !== f.password2.value ) {
			err.textContent = 'The new passwords don’t match.';
			err.hidden = false;
			return;
		}
		btn.disabled = true;
		setKey( '' ); // Any old key on this device stops working with the new password.
		const device = /iphone|ipad/i.test( navigator.userAgent ) ? 'iPhone app' : /android/i.test( navigator.userAgent ) ? 'Android app' : 'App';
		const res = await api( 'app/reset', 'POST', { ...link, password: f.password.value, device } );
		btn.disabled = false;
		if ( res.ok && res.body.key ) {
			setKey( res.body.key );
			store.me = res.body.me;
			toast( res.body.message || 'Your new password is saved.' );
			location.replace( '#/routes' );
		} else {
			err.textContent = res.body.message || 'Couldn’t save your new password. Try again in a moment.';
			err.hidden = false;
		}
	} );
}
