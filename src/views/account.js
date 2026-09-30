/**
 * Account: sign in (or out), the member's plan, notifications on this
 * device, miles or kilometres, and installing the app.
 */
import { api, signedIn } from '../api.js';
import { store, signIn, signOut, loadMe } from '../store.js';
import { $, esc, siteLink, toast, units } from '../ui.js';

let installPrompt = null;
window.addEventListener( 'beforeinstallprompt', ( e ) => { e.preventDefault(); installPrompt = e; } );

export default async function account( main ) {
	if ( ! signedIn() ) {
		main.innerHTML = '<header class="app-head"><h1 class="app-title">Sign in</h1><p class="app-lede">Use your Hey! En Route email and password.</p></header>' +
			'<form class="app-form" data-signin>' +
			'<label class="app-field"><span>Email</span><input type="email" name="login" autocomplete="username" required></label>' +
			'<label class="app-field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label>' +
			'<p class="app-error" data-error role="alert" hidden></p>' +
			'<button class="hen-btn hen-btn--primary" type="submit">Sign in</button></form>' +
			'<p class="app-links">' + siteLink( store.config.urls.lost, 'Forgot your password?' ) + ' · ' + siteLink( store.config.urls.join, 'Create a free account' ) + '</p>' +
			installBlock();
		$( '[data-signin]', main ).addEventListener( 'submit', async ( e ) => {
			e.preventDefault();
			const f = e.currentTarget;
			const err = $( '[data-error]', f );
			const btn = $( 'button', f );
			btn.disabled = true;
			err.hidden = true;
			const res = await signIn( f.login.value.trim(), f.password.value );
			btn.disabled = false;
			if ( res.ok ) {
				toast( 'Signed in. Welcome, ' + res.body.me.name + '.' );
				location.hash = '#/routes';
			} else {
				err.textContent = res.body.message || 'Couldn’t sign in.';
				err.hidden = false;
			}
		} );
		bindInstall( main );
		return;
	}

	const me = await loadMe( true );
	if ( ! me ) { main.innerHTML = '<p class="app-empty">Couldn’t load your account.</p>'; return; }
	main.innerHTML = '<header class="app-head"><h1 class="app-title">' + esc( me.name ) + '</h1><p class="app-lede">' + esc( me.email ) + '</p></header>' +
		'<div class="app-card"><p><strong>' + ( me.plus ? 'Hey! En Route Plus' : 'Free account' ) + '</strong><br><span class="hen-muted">' + esc( me.plan ) + '</span></p>' +
		( me.plus ? '' : siteLink( store.config.urls.plus, 'Get Hey! En Route Plus', 'hen-btn hen-btn--primary hen-btn--small' ) ) + '</div>' +
		'<h2 class="app-sub">Alerts on this device</h2>' +
		'<div class="app-card"><p class="hen-muted" data-push-status>Checking…</p><button type="button" class="hen-btn hen-btn--small" data-push hidden></button></div>' +
		'<h2 class="app-sub">Distances</h2>' +
		'<div class="app-seg" role="group" aria-label="Distances in"><button type="button" data-units="mi" aria-pressed="' + ( 'mi' === units() ) + '">Miles</button><button type="button" data-units="km" aria-pressed="' + ( 'km' === units() ) + '">Kilometres</button></div>' +
		installBlock() +
		'<p class="app-links">' + siteLink( store.config.urls.account + ( store.config.urls.account.includes( '?' ) ? '&' : '?' ) + 'view=notifications', 'Alert and email settings on heyenroute.com ↗' ) + '</p>' +
		'<p><button type="button" class="hen-btn hen-btn--ghost" data-signout>Sign out</button></p>';

	main.addEventListener( 'click', async ( e ) => {
		const u = e.target.closest( '[data-units]' );
		if ( u ) {
			try { localStorage.setItem( 'hen_units', u.dataset.units ); } catch ( err ) { /* ignore */ }
			main.querySelectorAll( '[data-units]' ).forEach( ( b ) => b.setAttribute( 'aria-pressed', String( b === u ) ) );
		}
		if ( e.target.closest( '[data-signout]' ) ) {
			await pushOff( true );
			await signOut();
			toast( 'Signed out.' );
			account( main );
		}
	} );
	bindInstall( main );
	pushState( main, me );
}

/* ------------------------------------------------------------------
 * Notifications on this device (web push, through the site)
 * ---------------------------------------------------------------- */

const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIos = () => /iphone|ipad|ipod/i.test( navigator.userAgent );
const installed = () => window.matchMedia( '(display-mode: standalone)' ).matches || navigator.standalone === true;

function urlKey( s ) {
	s = s.replace( /-/g, '+' ).replace( /_/g, '/' );
	const raw = atob( s + '==='.slice( ( s.length + 3 ) % 4 ) );
	return Uint8Array.from( raw, ( c ) => c.charCodeAt( 0 ) );
}

async function currentSub() {
	const reg = await navigator.serviceWorker.getRegistration();
	return reg ? reg.pushManager.getSubscription() : null;
}

async function pushState( main, me ) {
	const status = $( '[data-push-status]', main );
	const btn = $( '[data-push]', main );
	if ( ! pushSupported() ) {
		status.textContent = isIos() && ! installed()
			? 'On iPhone and iPad, add this app to your Home Screen first (Share → Add to Home Screen), open it from there, then turn alerts on here.'
			: 'This browser can’t show notifications. You’ll still see alerts in the app and by email.';
		return;
	}
	if ( ! me.plus ) {
		status.textContent = 'Travel alerts on your devices come with Hey! En Route Plus.';
		return;
	}
	const sub = await currentSub();
	const show = ( on, text ) => {
		status.textContent = text || ( on ? 'On. Alerts arrive even when the app is closed.' : 'Off. Turn on to hear about weather, fires, emergencies and closures on your trips.' );
		btn.hidden = false;
		btn.textContent = on ? 'Turn off' : 'Turn on alerts';
		btn.dataset.on = on ? '1' : '';
	};
	show( !! sub );
	btn.onclick = async () => {
		btn.disabled = true;
		if ( btn.dataset.on ) {
			await pushOff();
			show( false );
		} else {
			const ok = await pushOn();
			show( ok, ok ? '' : 'Notifications are blocked for this app. Allow them in your phone or browser settings, then try again.' );
		}
		btn.disabled = false;
	};
}

async function pushOn() {
	try {
		if ( 'granted' !== await Notification.requestPermission() ) { return false; }
		const reg = await navigator.serviceWorker.ready;
		const sub = await reg.pushManager.subscribe( { userVisibleOnly: true, applicationServerKey: urlKey( store.config.vapid ) } );
		const res = await api( 'push', 'POST', sub.toJSON() );
		return res.ok;
	} catch ( e ) {
		return false;
	}
}

async function pushOff( quiet ) {
	try {
		const sub = await currentSub();
		if ( sub ) {
			await api( 'push', 'DELETE', { endpoint: sub.endpoint } );
			await sub.unsubscribe();
		}
	} catch ( e ) {
		if ( ! quiet ) { toast( 'Couldn’t turn alerts off.' ); }
	}
}

/* ------------------------------------------------------------------
 * Installing the app on a phone
 * ---------------------------------------------------------------- */

function installBlock() {
	if ( installed() ) { return ''; }
	return '<h2 class="app-sub">Put Hey! En Route on your Home Screen</h2><div class="app-card">' +
		( isIos()
			? '<p>In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. It opens full screen, like any app.</p>'
			: '<p>Install it to open Hey! En Route from your Home Screen, full screen, like any app.</p><button type="button" class="hen-btn hen-btn--small" data-install hidden>Install the app</button><p class="hen-muted" data-install-help>In your browser’s menu, choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>' ) +
		'</div>';
}

function bindInstall( main ) {
	const btn = $( '[data-install]', main );
	if ( ! btn || ! installPrompt ) { return; }
	btn.hidden = false;
	const help = $( '[data-install-help]', main );
	if ( help ) { help.hidden = true; }
	btn.onclick = async () => {
		installPrompt.prompt();
		await installPrompt.userChoice;
		installPrompt = null;
		btn.hidden = true;
	};
}
