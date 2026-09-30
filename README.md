# Hey! En Route: the app

Hey! En Route as an app people install on their phone's Home Screen. It opens
full screen, works offline for what they've already seen, and gets travel
alerts as notifications. It's a web app (a "PWA"): plain HTML, CSS and
JavaScript, with no build step, hosted free on GitHub Pages.

Everything comes from the WordPress site, [heyenroute.com](https://heyenroute.com),
through the Hey! En Route Core plugin (version 3.14.0 or later):
- **Members:** they sign in with their usual email and password.
- **Data:** cities, their routes, travel alerts, notifications, saves and
  Plus all come from the site. Changes show on both.
- **Shared with the site:** driving mode, the map library and the component
  styles load from the site. The app always matches the plugin, and updating
  the plugin updates the app.

## What's in it

The app has everything the website has. Its own screens cover the things
people use on the road, and every other page of the website opens inside
the app, signed in, working exactly as on the site.

| Tab | What it does |
|---|---|
| **Explore** | Search the site's cities, or sort them by distance with **Near me**. Each city shows its scores, cost a day, best season and top places, with **save**, **add to a route** and **directions** (Google Maps, Waze or Apple Maps). **The full city guide** opens every tab of the city's page (overview, neighborhoods, costs, stays, things to do, food, events, safety, directory, nearby, routes and the City Circle). |
| **Routes** | The member's routes, with stops and real road drives on a map. Change nights, reorder or remove stops, add stops, and set a start date. It also shows costs, **travel alerts** on the route, and **along the way**. **Driving mode** (GPS next stop, what's coming up, alerts ahead, safety tips) is the same as on the site. |
| **Community** | **Messages**, **connections** (requests, accept, decline, block), **my circles**, **find a circle**, **my profile** and **privacy & visibility**, with unread counts. Circles work as on the site: join, start a discussion, reply, mark Helpful, save, report, block, and connect with People on a Similar Path. |
| **Alerts** | Travel alerts on the member's routes, then their notifications. |
| **Account** | Their plan, every part of their account from the site (profile, city matches, saved, routes, privacy, notification and account settings, businesses), **alerts on this device**, miles or kilometres, installing the app, and the site's menu (cities, events, compare, add your business, guidelines, Plus). |

## Publishing it (GitHub Pages)

1. In this repository, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, branch
   **main**, folder **/ (root)**, and click **Save**.
3. After a minute it's live at its address (below).
4. On the site, go to **Hey! En Route → App**, enter that address and click
   **Save**. Members then see **Open the app** in their account.

Every change pushed to `main` is published automatically.

### The app's address: app.heyenroute.com

The app lives at **https://app.heyenroute.com/**. The `CNAME` file in this
repository tells GitHub Pages to use that address, and the old
`github.io` address forwards there.

It needs one DNS record where heyenroute.com's DNS is managed:

| Type | Name | Points to | TTL |
|---|---|---|---|
| CNAME | `app` | `dillonprice12380.github.io` | default |

Once the address works, **Settings → Pages** shows it as verified; tick
**Enforce HTTPS** there. On the site, **Hey! En Route → App** should say
`https://app.heyenroute.com/`.

To go back to the `github.io` address, delete the `CNAME` file and remove the
custom domain under **Settings → Pages**.

## Installing it on a phone

- **iPhone / iPad (Safari):** Share → **Add to Home Screen**. Alerts on the
  device work once it's opened from the Home Screen (iOS 16.4 or later).
- **Android (Chrome):** the app offers **Install**, or use the browser menu:
  **Install app**.
- **Computer (Chrome / Edge):** the install icon in the address bar.

## How it connects to the site

- **API:** `https://heyenroute.com/wp-json/hen/v1/`. The address is set in
  `src/config.js`.
- **Sign-in:** `POST app/login` returns an app key, which is kept on the
  device and sent as the `X-Hen-Token` header. The site stores only a hash of
  it. Signing out ends it, keys unused for 180 days stop working, and staff
  can sign everyone out on **Hey! En Route → App**.
- **Passwords:** `app/forgot` emails a reset link that opens the app's
  `#/reset` screen, and `app/reset` checks the link and saves the new password.
- **App-only data:** `app/config` (map tiles, push key, where the site's
  scripts are), `app/me`, `app/city/{id}` and `app/alerts`. Everything else
  uses the same endpoints as the site: `cities`, `trips`, `save`, `notices`,
  `alerts/route`, `drive`, `tips`, `crime-areas` and `push`.
- **Website pages:** `#/p/<address>` shows any page of the site. The app
  asks for it with `?hen_app=1` and its key, puts the page's content in
  place and runs the site's own scripts on it (`src/site.js`,
  `src/views/page.js`). Links to the site stay in the app, forms are sent
  from it, and the site's scripts move between pages through
  `window.henHost`.
- **Notifications:** the site sends an empty push, and the app's service
  worker (`sw.js`) asks the site what's new and shows it.

### Testing against another copy of the site

Open the app once with `?site=https://staging.example.com`. It remembers that
address on this device; `?site=reset` goes back to heyenroute.com.

## Files

```
CNAME                  the app's address (app.heyenroute.com)
index.html             the page, and the tab bar
manifest.webmanifest   name, icons, colours: what makes it installable
sw.js                  offline use, and notifications
css/app.css            layout and colours
src/config.js          the site's address
src/api.js             calls to the site, with the app key
src/store.js           settings, the signed-in member, the city list
src/ui.js              small shared helpers
src/app.js             screens, navigation, and the bridge to driving mode
src/site.js            website pages inside the app
src/views/*.js         one file per screen (page.js shows website pages)
icons/                 app icons (icon.svg is the source)
```

Changing a file in `src/` or `css/`? Also bump `VERSION` in `sw.js`, so
phones fetch the new version promptly.
