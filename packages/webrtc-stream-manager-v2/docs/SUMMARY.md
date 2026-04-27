# webrtc-stream-manager Documentation

// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

This is the index for agent- and human-scannable docs that ship in the package
tarball alongside the bundled `dist/`. For per-symbol API reference, rely on
the JSDoc embedded in `dist/types/*.d.ts` — your TypeScript language server
surfaces it in tooltips and completions.

## README sections (tarball root)

- [Installation](../README.md#installation)
- [Quick Start](../README.md#quick-start)
- [API Overview](../README.md#api-overview)
- [Configuration](../README.md#configuration)
- [Features](../README.md#features)
- [Legacy Adapter (v1 migration)](../README.md#legacy-adapter-v1-migration)

## Detailed docs

- [recipes.md](./recipes.md) — copy-pasteable snippets for the seven most common tasks (connect, seek, pause, quality override, metadata, error handling, legacy drop-in).
- [architecture.md](./architecture.md) — component map (StreamManager → CameraConnection → PeerConnection, plus QualityMonitor / RadassController / MseRenderer), data flow through a typical connect, and which API layer to pick for which job.
- [migrating-from-v1.md](./migrating-from-v1.md) — every v1 symbol's status at 0.1.29 (preserved verbatim, types-only, removed), the 0.2.0 cleanup roadmap, and before/after code for the common migration paths.

## Authoritative API reference

The `.d.ts` files under `dist/types/` carry JSDoc on every public class,
method, and config option. Load them via your TypeScript language server,
or read them directly at
`node_modules/@networkoptix/webrtc-stream-manager/dist/types/`.
