# Real Web Player

A Spotify-style web player built on the [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk/).
It started from Spotify's [Web Playback SDK Guide](https://developer.spotify.com/documentation/web-playback-sdk/guide/) sample
and has since been redesigned.

**Requires a Spotify Premium account** (a Spotify restriction on in-browser playback).

## Features

- Spotify-style dark UI: sidebar, album-tinted "Now Playing" view and a fixed playback bar
- One-click **Play here** to move playback into the browser
- Seekable progress bar, volume and mute, shuffle and repeat
- "Next in queue" and "Recently played" lists
- Keyboard shortcuts: `Space` play/pause, `←`/`→` previous/next, `M` mute
- Responsive layout down to phone widths
- Tokens refresh automatically, so long listening sessions keep working

## Using your own credentials

You will need to register your app and get your own credentials from the
[Spotify for Developers Dashboard](https://developer.spotify.com/dashboard/)

To do so, go to your Spotify for Developers Dashboard, create your
application and register the following callback URI:

`http://127.0.0.1:3000/auth/callback`

(Use `127.0.0.1`, not `localhost`: Spotify no longer accepts `localhost`
redirect URIs.)

Once you have created your app, create a file called `.env` in the root folder
of the repository with your Spotify credentials:

```bash
SPOTIFY_CLIENT_ID='my_client_id'
SPOTIFY_CLIENT_SECRET='my_client_secret'
```

Optional overrides: `PORT` (auth server port, default `8080`) and
`SPOTIFY_REDIRECT_URI` (default `http://127.0.0.1:3000/auth/callback`).

## Installation

This app runs on Node.js 18 or newer. On its
[website](http://www.nodejs.org/download/) you can find instructions on how to
install it.

Once installed, clone the repository and install its dependencies running:

```bash
npm install
```

## Running the app

Start both client and server with the following command:

```bash
npm run dev
```

The React application will start on `http://127.0.0.1:3000`

Run the tests with `npm test`.

## What changed in the redesign

Every changed file starts with a `CHANGES (spotify-redesign)` comment that
explains what changed and why, and inline `CHANGED:` / `NEW:` comments mark
specific fixes. In short:

- **Server:** replaced the deprecated `request` package with built-in `fetch`,
  verified the OAuth `state` (CSRF protection), fixed the callback hanging on
  errors, added token refresh and logout, and added the scopes the new
  controls need.
- **Frontend:** upgraded to React 18, moved SDK wiring into a
  `useSpotifyPlayer` hook with proper cleanup and error handling, split the
  UI into components, and rewrote the styles around design tokens.
- **Cleanup:** removed create-react-app leftovers (the unused logo, the
  boilerplate test that always failed, unused CSS) and Spotify's internal
  `catalog-info.yaml`, and gave the app a real name in `package.json`,
  `manifest.json` and the page title. (JSON files can't hold comments, so
  those changes are listed here instead.)

> If you logged in before this update, log in again so Spotify grants the new
> `user-read-playback-state` and `user-modify-playback-state` scopes.

## Resources

- Follow [@SpotifyPlatform](https://twitter.com/SpotifyPlatform) on Twitter for Spotify for Developers updates.
- Join the [Spotify for Developers Community Forum](https://community.spotify.com/t5/Spotify-for-Developers/bd-p/Spotify_Developer).

## Code of Conduct

This project adheres to the [Open Source Code of
Conduct](https://github.com/spotify/code-of-conduct/blob/master/code-of-conduct.md).
By participating, you are expected to honor this code.

## License

Copyright 2021 Spotify AB.

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0

