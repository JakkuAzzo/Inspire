# Plugin Tester

`plugin-tester/` is a DAW-style simulator for InspireVST collaboration flows.

It does not host real AU/VST3 binaries directly (that requires an audio host), but it validates the same VST collaboration API behavior and UI state transitions used by the plugin.

## What It Tests

- Relay leaves room, presses Updates, and gets immediate attach/join dialog.
- Relay attach recovers from invalid session token by refreshing guest session token and retrying attach.
- Relay canceling the attach dialog stays on home controls with room fields visible.

## Prerequisites

- Backend running on `http://127.0.0.1:3001` (or set `BACKEND_URL`).
- Built plugin artifacts in `build/InspireVST_artefacts/Debug/...`.

## Run Simulator UI

```bash
cd plugin-tester
npm run start
```

Open `http://127.0.0.1:4179`.

## Run Playwright Scenario

```bash
cd plugin-tester
npm run test:e2e
```

Optional environment variables:

- `BACKEND_URL` default: `http://127.0.0.1:3001`
- `PLUGIN_TESTER_PORT` default: `4179`
