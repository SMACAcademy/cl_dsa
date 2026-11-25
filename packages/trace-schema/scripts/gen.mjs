import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(root, "schema/v1/trace.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

const ts = await compile(schema, "Trace", {
  cwd: root,
  bannerComment:
    "/* eslint-disable */\n/**\n * GENERATED from schema/v1/trace.schema.json by scripts/gen.mjs. Do not edit.\n */",
  additionalProperties: false,
  format: false,
});
writeFileSync(resolve(root, "ts/src/v1.ts"), ts);

// Run the generator as a module ("python -m"), never through the
// .venv\Scripts\datamodel-codegen.exe launcher: on this project's Windows
// machine, AVG CyberCapture can freeze the PC on a new launcher's first run
// (docs/incidents/2026-11-18-system-freezes.md).
execFileSync(
  "uv",
  [
    "run",
    "python",
    "-m",
    "datamodel_code_generator",
    "--input", schemaPath,
    "--input-file-type", "jsonschema",
    "--output", resolve(root, "python/src/algoverse_trace_schema/v1.py"),
    "--output-model-type", "pydantic_v2.BaseModel",
    "--use-annotated",
    "--disable-timestamp",
  ],
  { stdio: "inherit", cwd: root },
);
