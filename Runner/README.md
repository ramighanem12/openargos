# OpenArgos

OpenArgos is now built by the Electron app at the repository root.

## Build

```sh
npm run dist:mac
```

The local unsigned build creates both a Finder-openable app and a DMG installer:

```text
dist/mac-*/OpenArgos.app
dist/OpenArgos-0.1.0-*.dmg
```

Open it from Finder or run:

```sh
open dist/mac-*/OpenArgos.app
```

The `Runner` folder only keeps shared app assets for now.
