#!/usr/bin/env node
import path from "node:path";
import { readFile } from "node:fs/promises";
import { loadProject, inspectProject, editSection } from "./project.mjs";

const usage = `Ark Engine

  import --audio song.wav --out new-project [--timing words.json] [--beats beats.json]
         [--offset 0] [--duration 10] [--fps 30] [--width 1920] [--height 1080]
         [--title 'Title'] [--id project-id] [--style verse|impact|orbit]
         [--timing-timebase source|clip] [--beat-timebase source|clip]
  validate --project project.json
  inspect --project project.json
  render --project project.json --out movie.mp4 [--section id] [--scale 0.5]
         [--cache directory] [--force]
  serve --project project.json [--port 4177]
  patch --project project.json --section id --set '{"direction":{"accent":"#ff8800"}}'
  replace --project project.json --section id --file section.json [--retime]

Render progress is written to stderr; command results are JSON on stdout.
The preview server listens on 127.0.0.1. Press Ctrl-C to stop it.`;

const flags = new Set(["help", "force", "retime"]);
const fields = new Set([
  "audio",
  "out",
  "timing",
  "beats",
  "lyrics",
  "offset",
  "duration",
  "fps",
  "width",
  "height",
  "title",
  "id",
  "style",
  "timing-timebase",
  "beat-timebase",
  "project",
  "section",
  "scale",
  "cache",
  "port",
  "set",
  "file",
]);
function parse(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      options._.push(token);
      continue;
    }
    const [key, ...parts] = token.slice(2).split("=");
    if (flags.has(key)) {
      if (parts.length) throw new Error(`--${key} does not take a value`);
      options[key] = true;
    } else {
      if (!fields.has(key)) throw new Error(`Unknown option --${key}`);
      const value = parts.length ? parts.join("=") : argv[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`--${key} requires a value`);
      options[key] = value;
    }
  }
  if (options._.length > 1) throw new Error("Only one command may be supplied");
  return options;
}
function number(options, key, fallback) {
  if (options[key] === undefined) return fallback;
  const value = Number(options[key]);
  if (!Number.isFinite(value))
    throw new Error(`--${key} must be a finite number`);
  return value;
}
function requireFields(options, ...keys) {
  for (const key of keys)
    if (!options[key]) throw new Error(`--${key} is required`);
}
function print(result) {
  console.log(JSON.stringify(result, null, 2));
}

try {
  const options = parse(process.argv.slice(2)),
    command = options._[0];
  if (!command || command === "help" || options.help) console.log(usage);
  else if (command === "import") {
    requireFields(options, "audio", "out");
    const { importSong } = await import("./import.mjs");
    print(
      await importSong({
        audio: options.audio,
        timing: options.timing,
        beats: options.beats,
        lyrics: options.lyrics,
        projectDir: options.out,
        id: options.id,
        title: options.title,
        sourceOffset: number(options, "offset", 0),
        duration: number(options, "duration"),
        fps: number(options, "fps", 30),
        width: number(options, "width", 1920),
        height: number(options, "height", 1080),
        style: options.style ?? "verse",
        timingTimebase: options["timing-timebase"],
        beatTimebase: options["beat-timebase"],
      }),
    );
  } else {
    if (
      !["validate", "inspect", "render", "serve", "patch", "replace"].includes(
        command,
      )
    )
      throw new Error(
        `Unknown command: ${command}\nRun ark-engine --help for usage.`,
      );
    requireFields(options, "project");
    const projectPath = path.resolve(options.project);
    if (command === "validate" || command === "inspect") {
      const loaded = await loadProject(projectPath);
      print(
        command === "validate"
          ? loaded.validation
          : {
              ...inspectProject(loaded.project, loaded.validation),
              styles: (await import("./visual.mjs")).STYLE_CATALOG,
            },
      );
    } else if (command === "patch" || command === "replace") {
      requireFields(options, "section", command === "patch" ? "set" : "file");
      const patch = JSON.parse(
        command === "patch"
          ? options.set
          : await readFile(options.file, "utf8"),
      );
      const result = await editSection(projectPath, options.section, patch, {
        replace: command === "replace",
        retime: options.retime === true,
      });
      print({
        section: result.section,
        revision: result.revision,
        backup: result.backup,
        changed: result.changed,
      });
    } else if (command === "render") {
      requireFields(options, "out");
      const { renderProject } = await import("./export.mjs");
      print(
        await renderProject({
          projectPath,
          outPath: options.out,
          sectionId: options.section,
          scale: number(options, "scale", 1),
          force: options.force === true,
          cacheDir: options.cache,
          onProgress: (event) =>
            process.stderr.write(JSON.stringify(event) + "\n"),
        }),
      );
    } else if (command === "serve") {
      const { startServer } = await import("./server.mjs");
      const port = number(options, "port", 4177);
      if (!Number.isInteger(port) || port < 0 || port > 65535)
        throw new Error("--port must be an integer between 0 and 65535");
      const result = await startServer({ projectPath, port });
      console.log(`Preview: ${result.url}`);
      const close = () => result.server.close(() => process.exit(0));
      process.on("SIGINT", close);
      process.on("SIGTERM", close);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
