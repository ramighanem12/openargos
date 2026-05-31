# Contributing to OpenArgos

OpenArgos is a local-first macOS Electron app. Contributions should preserve that default: no server account requirement, no shared-account gate, and no bundled provider keys.

## Development

```sh
npm install
npm start
```

Build the app with:

```sh
npm run dist:mac
```

The default build creates or reuses a local OpenArgos signing identity when possible, then falls back to ad-hoc signing if local signing is unavailable.

## Pull requests

- Keep changes focused and explain the user-facing behavior they affect.
- Do not commit local secrets, logs, generated `dist/` output, `node_modules/`, or signing certificates.
- Keep provider integrations bring-your-own-key unless the project explicitly accepts another local-first approach.
- Run syntax checks for changed JavaScript entrypoints before opening a PR.
- For native permission helper changes, rebuild from a clean install on macOS.

## Privacy and data model

OpenArgos stores app data locally by default. New features should make local storage, external network calls, and permission prompts explicit and easy to audit.
