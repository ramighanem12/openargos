# OpenArgos

OpenArgos is a local-first Mac assistant you run with your own AI provider keys.
It gives you a small desktop chat window, screen-aware answers, optional voice input, local memories, and approved Computer Use for operating apps or browsers.

No hosted OpenArgos account is required. Your chats, memories, preferences, and saved provider keys stay on your Mac by default.

## Features

- Chat with your own model key
- Screen-aware answers when you grant Screen Recording permission
- Computer Use for approved browser/app actions, using Cua Driver as the preferred engine when installed
- A background browser for public web tasks that do not need your logged-in session
- Voice input with a configured transcription provider
- Local memories you can turn on/off, edit, or reset
- Provider keys stored locally and encrypted per install
- macOS menu bar + Dock app behavior

Supported model providers:

- OpenAI
- Anthropic
- OpenRouter
- Google Gemini
- xAI

Supported voice transcription providers:

- OpenAI
- Groq

Computer Use engines:

- Cua Driver, the preferred engine for local Computer Use when installed
- Native fallback, OpenArgos' native Computer Use harness for source builds or debugging

## Requirements

- macOS 13 or newer
- Node.js 20 or newer
- npm
- Xcode Command Line Tools

If you do not already have Apple's command line tools:

```sh
xcode-select --install
```

## Run It Locally

Clone the repo:

```sh
git clone https://github.com/ramighanem12/openargos.git
cd openargos
```

Install dependencies:

```sh
npm install
```

Start the app:

```sh
npm start
```

OpenArgos will launch as a normal Mac app and also create a menu bar item.

## First Setup

1. Open `Settings > Models`.
2. Add at least one provider key.
3. Pick an LLM model.
4. Optional: pick a voice transcription route if you want voice input.
5. Go to `Settings > Permissions` and configure the macOS permissions you want to use.
6. For Computer Use, go to `Settings > General` and choose a Computer Use engine. Cua is preferred when installed; Native fallback is OpenArgos' native harness.

You only need the permissions for the features you turn on:

- Screen Recording: lets OpenArgos see your visible screen for screen-aware answers and approved Computer Use.
- Accessibility: lets OpenArgos perform approved clicks, typing, and keyboard actions.
- Microphone: enables voice input.
- Automation: lets OpenArgos use macOS Apple Events to read active app, window, and browser-tab context when a screen-aware answer or Computer Use task needs it. It is separate from Screen Recording, which is the visual screen permission.

If you use Cua for Computer Use, Cua Driver has its own macOS permission identity. Grant Accessibility and Screen Recording to `Cua Driver` as described below.

If macOS permissions get stuck during local development, remove OpenArgos from the relevant System Settings privacy section and relaunch the app.

## Using OpenArgos

Open a new chat from the app or menu bar, then ask normally.

Examples:

```text
Summarize what is on my screen.
Compare the open proposal against the notes in this browser tab.
Draft a short reply to the email I have open, but ask before sending.
Find the latest invoice in Downloads and summarize the total.
Download the logo from a public company website and name the file company-logo.
```

Computer Use always runs through the app's approval flow. For risky actions like sending messages, deleting files, posting publicly, purchasing, checkout, billing, or security changes, OpenArgos asks again before continuing.

### Cua Driver

OpenArgos uses [Cua Driver](https://github.com/trycua/cua/tree/main/libs/cua-driver) as the preferred Computer Use engine when it is installed and selected in Settings > General. This is useful for logged-in app tasks, because Cua Driver targets app windows directly instead of relying only on foreground cursor movement.

Install it separately:

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/trycua/cua/main/libs/cua-driver/scripts/install.sh)"
```

That installer places `CuaDriver.app` in `/Applications` and symlinks the command at `~/.local/bin/cua-driver`. Then grant permissions to Cua Driver itself:

```sh
~/.local/bin/cua-driver permissions grant
```

macOS should show permissions for `Cua Driver`, not OpenArgos and not Terminal. Grant Accessibility and Screen Recording, then verify:

```sh
~/.local/bin/cua-driver permissions status
~/.local/bin/cua-driver list-tools
```

Then restart OpenArgos. In Settings > General, keep Computer Use engine set to Cua. The API key is not a replacement for the local driver; `cua-driver` must be installed on the Mac for Cua-powered local app control to run. If your Cua Computer Use setup requires a Cua API key, paste it under Settings > Models > Provider keys; OpenArgos stores it locally and passes it to Cua as `CUA_API_KEY`.

The Native fallback option is not a model. It is OpenArgos' native Computer Use harness, and it still uses your configured Computer Use model for reasoning. Use it when Cua Driver is not installed or when debugging:

```sh
OPENARGOS_COMPUTER_USE_CUA_DRIVER=0 npm start
```

## Local Data

OpenArgos stores local app data in your macOS app data directory. That includes:

- chats
- memories
- app preferences
- encrypted provider keys
- local diagnostic logs

Model requests go directly from your Mac to the provider whose key you configured.

## Build a Local Mac App

For normal local use:

```sh
npm run dist:mac
```

Outputs:

```text
dist/mac-*/OpenArgos.app
dist/OpenArgos-0.1.0-*.dmg
```

The local build creates or reuses a self-signed `OpenArgos Local Development` code-signing identity when possible. This helps macOS keep Screen Recording and Accessibility permissions stable across rebuilds.

If that local identity cannot be created, the build falls back to ad-hoc signing. Ad-hoc builds may need to be opened from Finder with right-click > Open, and macOS may ask for permissions again after rebuilds.

## Build a Notarized Release DMG

This section is for maintainers publishing a downloadable DMG on GitHub Releases.

For local development, `npm run dist:mac` is enough. For a public DMG, macOS expects the app to be signed with an Apple `Developer ID Application` certificate and notarized by Apple. That is what lets users download the app, open it normally, and keep macOS permissions more stable across installs.

To make that kind of release, you need an Apple Developer account, a `Developer ID Application` certificate, and Apple notarization credentials.

Set the signing identity, then run:

```sh
export OPENARGOS_CODESIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_TEAM_ID="TEAMID"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"

npm run release:mac
```

You can also notarize with App Store Connect API credentials:

```sh
export OPENARGOS_CODESIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_API_KEY="KEYID"
export APPLE_API_ISSUER="ISSUER-UUID"
export APPLE_API_KEY_PATH="/absolute/path/AuthKey_KEYID.p8"

npm run release:mac
```

`npm run release:mac` does the release sequence in the right order:

1. package the app
2. sign the app with hardened runtime
3. build the DMG from the signed app
4. sign the DMG
5. submit the DMG to Apple notarization
6. staple the notarization ticket

The release script intentionally fails if Developer ID signing or notarization credentials are missing. That prevents accidentally publishing an ad-hoc signed public DMG.

## Development Checks

Before opening a PR or publishing a release:

```sh
npm run verify:release
```

For a full local packaging check, include the app/DMG build:

```sh
OPENARGOS_VERIFY_DIST=1 npm run verify:release
```

Computer Use has a focused harness eval suite:

```sh
npm run eval:computer-use
```

If a Computer Use run fails locally, export a redacted diagnostics bundle:

```sh
npm run diagnostics:computer-use -- --out computer-use-diagnostics.json --include-actions
```

The diagnostics export excludes screenshots and provider keys, and redacts obvious key, token, password, and email patterns.

Also verify that you are not committing local output or secrets:

- `dist/`
- `node_modules/`
- `local-certs/`
- `native/*/build/`
- `native/*/bin/`
- logs
- API keys
- Apple signing certificates

## Contributing

OpenArgos should stay local-first by default. Please avoid adding hosted account gates, bundled provider keys, or remote storage without a clear design discussion.

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md) for more.

## License

OpenArgos is available under the OpenArgos Non-Commercial License. Personal, educational, research, evaluation, and internal non-commercial use are allowed. Commercial use, resale, paid redistribution, and hosted paid access are not allowed without written permission.

See [LICENSE.md](./LICENSE.md).
