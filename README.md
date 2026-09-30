# Hey! En Route: the app

Hey! En Route as an app people install on their phone's Home Screen. It opens
full screen, works offline for what they've already seen, and gets travel
alerts as notifications. It's a web app (a "PWA"): plain HTML, CSS and
JavaScript, with no build step, hosted free on GitHub Pages.

Everything comes from the WordPress site, [heyenroute.com](https://heyenroute.com),
through the Hey! En Route Core plugin (version 3.11.0 or later):
- **Members:** they sign in with their usual email and password.
- **Data:** cities, their routes, travel alerts, notifications, saves and
  Plus all come from the site. Changes show on both.
- **Shared with the site:** driving mode, the map library and the component
  styles load from the site. The app always matches the plugin, and updating
  the plugin updates the app.

## What's in it

| Tab | What it does |
|---|---|
| **Explore** | Search the site's cities, or sort them by distance with **Near me**. Each city shows its scores, cost a day, best season and top places. From there you can **save** it, **add it to a route**, get **directions** (Google Maps, Waze or Apple Maps), or open the full guide on the site. |
| **Routes** | The member's routes, with stops and real road drives on a map. Change nights, reorder or remove stops, add stops, and set a start date. It also shows costs, **travel alerts** on the route, and **along the way** (towns on the drive and places right by the road). **Driving mode** (GPS next stop, what's coming up, alerts ahead, safety tips) is the same as on the site. |
| **Alerts** | Travel alerts on the member's routes, then their notifications. |
| **Account** | Sign in and out, their plan, **alerts on this device** (push notifications), miles or kilometres, and how to install the app. |

Free members see everything the site shows them, with the same Hey! En Route
Plus offers where Plus features are.

## Publishing it (GitHub Pages)

1. In this repository, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, branch
   **main**, folder **/ (root)**, and click **Save**.
3. After a minute it's live at
   `https://<your-github-username>.github.io/hey-en-route-app/`.
4. On the site, go to **Hey! En Route → App**, enter that address and click
   **Save**. Members then see **Open the app** in their account.

Every change pushed to `main` is published automatically.

### Your own address (optional): app.heyenroute.com

1. **Settings → Pages → Custom domain:** enter `app.heyenroute.com` and save.
2. Where your domain's DNS is managed, add a **CNAME** record: name `app`,
   value `<your-github-username>.github.io`.
3. Once GitHub shows the domain as verified, tick **Enforce HTTPS**.
4. Update the address on **Hey! En Route → App**.

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
- **App-only data:** `app/config` (map tiles, push key, where the site's
  scripts are), `app/me`, `app/city/{id}` and `app/alerts`. Everything else
  uses the same endpoints as the site: `cities`, `trips`, `save`, `notices`,
  `alerts/route`, `drive`, `tips`, `crime-areas` and `push`.
- **Notifications:** the site sends an empty push, and the app's service
  worker (`sw.js`) asks the site what's new and shows it.

### Testing against another copy of the site

Open the app once with `?site=https://staging.example.com`. It remembers that
address on this device; `?site=reset` goes back to heyenroute.com.

## Files

```
index.html             the page, and the tab bar
manifest.webmanifest   name, icons, colours: what makes it installable
sw.js                  offline use, and notifications
css/app.css            layout and colours
src/config.js          the site's address
src/api.js             calls to the site, with the app key
src/store.js           settings, the signed-in member, the city list
src/ui.js              small shared helpers
src/app.js             screens, navigation, and the bridge to driving mode
src/views/*.js         one file per screen
icons/                 app icons (icon.svg is the source)
```

Changing a file in `src/` or `css/`? Also bump `VERSION` in `sw.js`, so
phones fetch the new version promptly.
