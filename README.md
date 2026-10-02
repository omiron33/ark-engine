# Ark Engine

Ark Engine renders timed words and procedural graphics into lyric videos. A JSON project describes the audio, exact word timestamps, scene sections, assets, and visual direction. The browser preview and offline renderer use the same Canvas scene code.

This package contains the reusable rendering core: audio import, project validation and inspection, section editing, deterministic scene evaluation, cached H.264/AAC export, and a local browser editor. It does not include speech alignment, media generation providers, automatic creative direction, external publishing, or project-specific films.

## Requirements

- Node.js 22 or newer.
- `ffmpeg` and `ffprobe` on `PATH`, with the `libx264` and AAC encoders available.
- A platform supported by `@napi-rs/canvas` 1.0.9. Its native package is installed by npm.

No API keys, paid services, Python environment, or network service is required to render. npm installation downloads dependencies.

## Quick start

```sh
npm ci
npm run example:audio
npm run example:validate
npm run example:render
npm run example:serve
```

Open the local URL printed by the last command. The four-second example uses original synthetic text and a generated tone, with no downloaded media. Its output is `examples/basic/out/demo.mp4`; the adjacent `.render.json` records frame counts, hashes, source revision, and cache use. Stop the server with Ctrl-C.

## Import your audio

Supply word timestamps in seconds:

```json
{
  "timebase": "source",
  "words": [
    { "id": "first", "text": "Hello", "start": 0.2, "end": 0.7 },
    { "id": "second", "text": "world", "start": 0.8, "end": 1.4 }
  ]
}
```

```sh
node engine/cli.mjs import --audio song.wav --timing words.json --out my-project
node engine/cli.mjs inspect --project my-project/project.json
node engine/cli.mjs serve --project my-project/project.json
node engine/cli.mjs render --project my-project/project.json --out my-project/out/movie.mp4
```

Import creates a new directory and copies source files without rewriting them. It accepts word arrays, `words` objects, segment-based timestamp exports, and nested section/line timestamp data. Use `--offset` and `--duration` to select a clip; source timestamps remain in each word's provenance. `--timing-timebase clip` accepts timestamps already relative to that clip. An import without timestamps remains explicitly unresolved; the engine does not guess lyric timing.

## Project format

[The example project](examples/basic/project.json) is a complete manifest. Version 1 requires:

| Field                                | Meaning                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `id`, `title`                        | Stable project identifier and display title                                               |
| `width`, `height`, `fps`, `duration` | Output dimensions and timeline                                                            |
| `audio.src`, `audio.offset`          | Audio file relative to the manifest and source offset in seconds                          |
| `assets`                             | Image or font definitions with relative file paths; fonts also declare `family`           |
| `words`                              | Stable word IDs, exact text, `start`, `end`, and optional confidence/provenance           |
| `beats`                              | Optional measured events with `time`, non-negative `strength`, and `kind`                 |
| `sections`                           | Contiguous timeline sections with IDs, style, word/asset IDs, direction, and integer seed |
| `palette`                            | Optional `ink`, `paper`, and `accent` colors                                              |

Included styles are `verse`, `impact`, `orbit`, `rise`, `terrain`, `submerge`, and `story`. The first three work with ordinary timed phrases. Semantic styles use authored roles and geometry. `story` provides camera, semantic, and sculptural choreography catalogs in `engine/`. `inspect` lists the available styles.

Images are optional. To register your own font, add an asset such as `{"type":"font","src":"assets/font.ttf","family":"Example Font"}` and set the relevant section's `direction.fontFamily`. Bundle only assets you have permission to distribute, with their applicable notices. No font or image files are shipped in this repository. System font fallback works for exploration, but typography can differ between machines.

## Editing and caching

```sh
node engine/cli.mjs patch --project my-project/project.json --section section-id \
  --set '{"direction":{"accent":"#ff8800"}}'
node engine/cli.mjs render --project my-project/project.json \
  --section section-id --scale 0.5 --out my-project/out/section.mp4
```

Edits create manifest backups in `.revisions/`. Changing section boundaries requires `--retime`; word timestamps remain unchanged. The renderer caches verified silent sections in `.render-cache/` and assembles them with one continuous audio track. Cache keys include rendering code, the lockfile, output profile, timing, assets, and neighboring scenes used by transitions. A corrupt cached file is rebuilt. Use `--force` to regenerate sections.

Every frame is evaluated from its timestamp and declared inputs, so out-of-order seeking produces the same pixels within the same rendering environment. For reproducible exports across machines, use the same Node, native canvas, FFmpeg, and explicit font versions. H.264 byte identity across different toolchains is not guaranteed. A render report verifies technical output; it does not certify creative quality or human-reviewed synchronization.

## JavaScript API

```js
import { renderProject, startServer } from "ark-engine";

const report = await renderProject({
  projectPath: "./my-project/project.json",
  outPath: "./my-project/out/movie.mp4",
  onProgress: (event) => console.log(event),
});
console.log(report.sha256);

const preview = await startServer({
  projectPath: "./my-project/project.json",
  port: 4177,
});
// Call preview.server.close() when finished.
```

The local server exposes `GET /api/project`, `PATCH` or `POST /api/sections/:id`, `POST /api/render`, `GET /api/jobs/:id`, and completed video downloads. It binds only to loopback and rejects foreign origins for edits. It is intended for trusted local projects, not internet hosting or untrusted manifests. Render job records are held in memory and disappear when the server stops.

## Development and license

Run `npm test` for project validation, timestamp preservation, cache invalidation, random-access rendering, local HTTP behavior, and actual FFmpeg export tests. Tests synthesize their own audio and use temporary directories.

First-party source and the synthetic example are licensed under [MIT](LICENSE). `@napi-rs/canvas` is an MIT-licensed external dependency and retains its own notices and transitive native-library terms. FFmpeg is a separately installed tool with licensing determined by its build configuration. Neither dependency binaries nor third-party media are vendored or relicensed here.
