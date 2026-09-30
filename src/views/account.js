/**
 * Account: sign in (or out), the member's plan, notifications on this
 * device, miles or kilometres, and installing the app.
 */
import { api, signedIn } from '../api.js';
import { store, signIn, signOut, loadMe } from '../store.js';
import { $, esc, siteLink, toast, units } from '../ui.js';
import { appHref } from '../site.js';

let installPrompt = null;
window.addEventListener( 'beforeinstallprompt', ( e ) => { e.preventDefault(); installPrompt = e; } );

/** A row linking to a page of the site, shown in the app. */
export function siteRow( url, label, count = 0, note = '' ) {
	return '<li><a class="app-row" href="' + esc( appHref( url ) || url ) + '"><span><strong>' + esc( label ) + '</strong>' + ( note ? '<br><span class="hen-muted">' + esc( note ) + '</span>' : '' ) + '</span>' +
		( count ? '<span class="app-count-badge">' + ( count > 9 ? '9+' : count ) + '</span>' : '<span class="app-chevron" aria-hidden="true">›</span>' ) + '</a></li>';
}

/** The site's menu (cities, events, compare, add a business…), for "More". */
function moreList() {
	const c = store.config || {};
	const rows = ( c.menu || [] ).map( ( m ) => siteRow( m.url, m.title ) );
	if ( c.urls && c.urls.plus ) { rows.push( siteRow( c.urls.plus, 'Hey! En Route Plus' ) ); }
	return rows.length ? '<h2 class="app-sub">More from Hey! En Route</h2><ul class="app-list">' + rows.join( '' ) + '</ul>' : '';
}

export default async function account( main ) {
	if ( ! signedIn() ) {
		main.innerHTML = '<header class="app-head"><h1 class="app-title">Sign in</h1><p class="app-lede">Use your Hey! En Route email and password.</p></header>' +
			'<form class="app-form" data-signin>' +
			'<label class="app-field"><span>Email</span><input type="email" name="login" autocomplete="username" required></label>' +
			'<label class="app-field"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label>' +
			'<p class="app-error" data-error role="alert" hidden></p>' +
			'<button class="hen-btn hen-btn--primary" type="submit">Sign in</button></form>' +
			'<p class="app-links"><button type="button" class="app-linkbtn" data-forgot-open>Forgot your password?</button> · <a href="' + esc( appHref( store.config.urls.join ) ) + '">Create a free account</a></p>' +
			'<form class="app-form" data-forgot hidden>' +
			'<h2 class="app-subtitle">Reset your password</h2>' +
			'<p class="app-lede">Enter the email you signed up with and we’ll send you a link to choose a new password.</p>' +
			'<label class="app-field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>' +
			'<p class="app-error" data-error role="alert" hidden></p>' +
			'<p class="app-ok" data-ok role="status" hidden></p>' +
			'<button class="hen-btn hen-btn--primary" type="submit">Send the link</button></form>' +
			moreList() +
			installBlock();
		bindForgot( main );
		if ( /[?&]forgot=1/.test( location.hash ) ) { $( '[data-forgot-open]', main ).click(); }
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
		( me.plus ? '' : '<a class="hen-btn hen-btn--primary hen-btn--small" href="' + esc( appHref( store.config.urls.plus ) ) + '">Get Hey! En Route Plus</a>' ) + '</div>' +
		'<h2 class="app-sub">Your account</h2><ul class="app-list">' +
			( me.views || [] ).filter( ( v ) => ! [ 'circles', 'connections', 'messages' ].includes( v.key ) ).map( ( v ) => siteRow( v.url, v.label, v.count ) ).join( '' ) +
		'</ul>' +
		'<h2 class="app-sub">Alerts on this device</h2>' +
		'<div class="app-card"><p class="hen-muted" data-push-status>Checking…</p><button type="button" class="hen-btn hen-btn--small" data-push hidden></button></div>' +
		'<h2 class="app-sub">Distances</h2>' +
		'<div class="app-seg" role="group" aria-label="Distances in"><button type="button" data-units="mi" aria-pressed="' + ( 'mi' === units() ) + '">Miles</button><button type="button" data-units="km" aria-pressed="' + ( 'km' === units() ) + '">Kilometres</button></div>' +
		installBlock() +
		moreList() +
		'<p><button type="button" class="hen-btn hen-btn--ghost" data-signout>Sign out</button></p>';

	main.addEventListener( 'click', async ( e ) => {
		const u = e.target.closest( '[data-units]' );
		if ( u ) {
			try {
				localStorage.setItem( 'hen_units', u.dataset.units );
				// The site's pages in the app use the same choice.
				const site = JSON.parse( localStorage.getItem( 'hen-units' ) || '{}' );
				site.dist = u.dataset.units;
				localStorage.setItem( 'hen-units', JSON.stringify( site ) );
			} catch ( err ) { /* ignore */ }
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

/** "Forgot your password?": the site emails a reset link; nothing opens WordPress. */
function bindForgot( main ) {
	const form = $( '[data-forgot]', main );
	$( '[data-forgot-open]', main ).addEventListener( 'click', () => {
		form.hidden = false;
		const typed = $( '[data-signin] [name=login]', main ).value.trim();
		if ( typed && ! form.email.value ) { form.email.value = typed; }
		form.email.focus();
		form.scrollIntoView( { behavior: 'smooth', block: 'center' } );
	} );
	form.addEventListener( 'submit', async ( e ) => {
		e.preventDefault();
		const err = $( '[data-error]', form );
		const ok = $( '[data-ok]', form );
		const btn = $( 'button', form );
		btn.disabled = true;
		err.hidden = ok.hidden = true;
		const res = await api( 'app/forgot', 'POST', { email: form.email.value.trim() } );
		btn.disabled = false;
		if ( res.ok ) {
			ok.textContent = res.body.message || 'Check your email for a link to choose a new password.';
			ok.hidden = false;
		} else if ( 404 === res.status ) {
			err.textContent = 'Password resets aren’t switched on yet. Please try again later.';
			err.hidden = false;
		} else {
			err.textContent = res.body.message || 'Couldn’t send the link. Try again in a moment.';
			err.hidden = false;
		}
	} );
}

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
