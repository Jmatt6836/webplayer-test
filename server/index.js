/*
 * Auth server for the web player.
 *
 * CHANGES (spotify-redesign):
 * - Replaced the deprecated `request` package with Node's built-in `fetch`
 *   (Node 18+). `request` has been unmaintained since 2020 and pulled in a
 *   pile of vulnerable transitive dependencies.
 * - `access_token` was an implicit global (assigned without `let`/`var`),
 *   which only worked because the file isn't in strict mode. Token state now
 *   lives in one explicit `tokens` object.
 * - The OAuth `state` value was generated but never checked, which left the
 *   login open to CSRF. We now remember issued states and reject callbacks
 *   whose state we didn't issue.
 * - If the token exchange failed, the callback never responded and the
 *   browser hung forever. Every path now responds.
 * - Spotify access tokens expire after an hour. We now keep the refresh
 *   token and transparently refresh in /auth/token, so the player keeps
 *   working in long sessions.
 * - Added /auth/logout so the UI can offer a "Log out" button.
 * - Added the scopes the new UI needs: reading/modifying playback state lets
 *   us transfer playback to the browser with one click and toggle
 *   shuffle/repeat.
 * - Port and redirect URI can be overridden with env vars instead of being
 *   hard-coded.
 * - The default redirect URI uses 127.0.0.1 instead of localhost. Spotify
 *   stopped accepting `localhost` redirect URIs in 2025, and only allows
 *   loopback IP addresses for http:// URIs.
 */
const express = require('express');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const port = process.env.PORT || 8080;

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
// CHANGED: 127.0.0.1, not localhost, because Spotify rejects localhost redirect URIs.
const spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/auth/callback';

// CHANGED: fail fast with a clear message instead of a confusing Spotify
// error page later on.
if (!spotifyClientId || !spotifyClientSecret) {
  console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET. See README.md for setup.');
  process.exit(1);
}

const scope = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state', // NEW: needed to read shuffle/repeat state
  'user-modify-playback-state', // NEW: needed for "Play here" and shuffle/repeat toggles
].join(' ');

// CHANGED: one explicit place for token state (previously an implicit global).
// This is a single-user local demo, so in-memory storage is fine.
const tokens = {
  accessToken: '',
  refreshToken: '',
  expiresAt: 0,
};

// CHANGED: remember issued OAuth states so the callback can verify them.
const pendingStates = new Set();

// CHANGED: crypto.randomBytes instead of Math.random, which isn't
// cryptographically secure and shouldn't be used for security tokens.
const generateRandomString = (length) => crypto.randomBytes(length).toString('hex').slice(0, length);

// NEW: shared helper for both the initial code exchange and refreshes.
async function requestToken(params) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  tokens.accessToken = body.access_token;
  // Spotify only sometimes returns a new refresh token; keep the old one otherwise.
  tokens.refreshToken = body.refresh_token || tokens.refreshToken;
  // Refresh a minute early so we never hand out a token that's about to expire.
  tokens.expiresAt = Date.now() + (body.expires_in - 60) * 1000;
}

const app = express();

app.get('/auth/login', (req, res) => {
  const state = generateRandomString(16);
  pendingStates.add(state);

  const authQueryParameters = new URLSearchParams({
    response_type: 'code',
    client_id: spotifyClientId,
    scope,
    redirect_uri: spotifyRedirectUri,
    state,
  });

  res.redirect('https://accounts.spotify.com/authorize/?' + authQueryParameters.toString());
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  // NEW: the user clicked "Cancel" on Spotify's consent screen.
  if (error) {
    return res.redirect('/?error=' + encodeURIComponent(error));
  }

  // NEW: CSRF protection, so only accept callbacks for logins we started.
  if (!state || !pendingStates.has(state)) {
    return res.redirect('/?error=state_mismatch');
  }
  pendingStates.delete(state);

  try {
    await requestToken({
      code,
      redirect_uri: spotifyRedirectUri,
      grant_type: 'authorization_code',
    });
    res.redirect('/');
  } catch (err) {
    // CHANGED: previously this path never responded and the page hung.
    console.error(err);
    res.redirect('/?error=token_exchange_failed');
  }
});

app.get('/auth/token', async (req, res) => {
  // NEW: transparently refresh expired tokens.
  if (tokens.accessToken && Date.now() >= tokens.expiresAt && tokens.refreshToken) {
    try {
      await requestToken({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken });
    } catch (err) {
      console.error(err);
      tokens.accessToken = '';
    }
  }
  res.json({ access_token: tokens.accessToken });
});

// NEW: lets the UI log the user out.
app.post('/auth/logout', (req, res) => {
  tokens.accessToken = '';
  tokens.refreshToken = '';
  tokens.expiresAt = 0;
  res.sendStatus(204);
});

app.listen(port, () => {
  console.log(`Auth server listening at http://127.0.0.1:${port}`);
});
