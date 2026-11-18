# Phase 2B — Application Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running AlgoVerse skeleton. Curriculum content in `content/` is validated, compiled and published into the database, served by a FastAPI API, and rendered as the Learning Universe, Curriculum and a placeholder lesson in a React shell. Completing lesson sections and setting concept states unlocks dependent concepts and changes tile states.

**Architecture:** A monorepo with a pnpm workspace (TypeScript) and a uv workspace (Python). `packages/content-tools` validates and compiles content into a deterministic JSON bundle. `apps/api` (FastAPI modular monolith, SQLAlchemy 2, Alembic) publishes bundles and serves content, progress and universe state. `apps/web` (React 19 + Vite) renders the shell, the triangular Universe (SVG + d3-zoom) and placeholder screens. `packages/trace-schema` defines trace schema v1 as JSON Schema with generated TS and Pydantic types, ready for Phase 3.

**Tech Stack:** Node ≥ 22, pnpm 10, TypeScript (strict), React 19, Vite, Tailwind CSS v4, React Router, TanStack Query, openapi-typescript + openapi-fetch, i18next + react-i18next, Radix UI (Dialog), cmdk, lucide-react, d3-zoom/d3-selection, json-schema-to-typescript, ajv · tests: Vitest, Testing Library, fast-check, msw, vitest-axe, Playwright, @axe-core/playwright · Python 3.12 (uv-managed), FastAPI, uvicorn, SQLAlchemy 2, Alembic, psycopg (binary), Pydantic v2, pydantic-settings, Typer, PyYAML, structlog, httpx · tests: pytest, Hypothesis, jsonschema · codegen: datamodel-code-generator · Ruff, mypy, import-linter, ESLint, Prettier.

**Open owner question affecting this plan:** licensing (BLUEPRINT §8 Q1). Do not add a `LICENSE` file until it is answered.

**Spec:** [ARCHITECTURE](../ARCHITECTURE.md), [CONTENT_SCHEMA](../CONTENT_SCHEMA.md), [PYRAMID_MODEL](../PYRAMID_MODEL.md), [DATA_MODEL_AND_API](../DATA_MODEL_AND_API.md), [UI_UX](../UI_UX.md), [VISUALIZATION_ENGINE §3](../VISUALIZATION_ENGINE.md#3-execution-event-schema-trace-schema-v1), [ROADMAP Phase 2](../ROADMAP.md#phase-2--application-foundation), [DECISIONS](../DECISIONS.md)

## Global Constraints

- Work on branch `phase-2b-foundation`. Commit after every task. Open one PR at the end.
- **Cross-platform:** every command must work on Windows (Git Bash or PowerShell), macOS and Linux. There is no `make`; the **root `package.json` scripts are the single front door** (`pnpm dev`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm content:build`, `pnpm e2e`).
- Line endings are **LF** in the repo (`.gitattributes`: `* text=auto eol=lf`).
- Python **3.12** is pinned in `.python-version` and installed with `uv python install 3.12`. Node **≥ 22** is pinned in `package.json` `engines`.
- Versions: install the latest stable release of each listed library at scaffold time. The lockfiles (`pnpm-lock.yaml`, `uv.lock`) pin them. Do not add libraries not listed in the Tech Stack without recording an ADR.
- API: all routes under **`/api/v1`**. JSON response bodies use **camelCase** (Pydantic `alias_generator=to_camel`, `populate_by_name=True`). Errors are **RFC 9457** `application/problem+json`.
- Content YAML and the compiled bundle use **snake_case**.
- Concept IDs match `^[a-z0-9-]+\.[a-z0-9-]+$`, written as `<tile-id>.<slug>`. Tile IDs match `^[a-z0-9-]+$`.
- Pyramid geometry: tile `(row, col)` with `0 ≤ col ≤ 2·row`. Even `col` is a **domain**, odd `col` is a **bridge**. Bridge neighbours are `(r, c−1)`, `(r, c+1)` and `(r−1, c−1)`. Domain neighbours are `(r, c−1)`, `(r, c+1)` and `(r+1, c+1)`.
- Concept state order: `locked < available < started < practiced < proficient < mastered`. `review_due` ranks as `mastered` for unlocking.
- Tile states: `fogged`, `glimpsed`, `open`, `in_progress`, `completed`, `mastered`, plus a boolean `review_due` flag.
- No CDN or third-party origin at runtime. Responses from the dev server and the API include `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.
- Accessibility: every route passes axe with zero violations. Every interactive element is reachable by keyboard.

## Review Focus

1. **CRLF content on Windows:** an author on Windows saves `lesson.md` with CRLF. The bundle checksum must equal the checksum of the same content with LF. Pinned by `test_checksum_ignores_line_endings` in Task 5.
2. **Progress for concepts removed by a newer release:** stored `learner_concept` rows whose concept no longer exists must be ignored by `/universe`, not cause a 500. Pinned by `test_universe_ignores_unknown_concepts` in Task 12.
3. **Prerequisite cycles across tiles:** the validator must name the full cycle path (`a -> b -> a`), not just "cycle detected". Pinned by `test_cycle_reports_path` in Task 4.
4. **Duplicate or replayed progress events** (double-click, offline retry): completing the same section twice must be idempotent. Pinned by `test_section_completed_is_idempotent` in Task 12.
5. **No content published yet** (fresh install before `content:publish`): content and universe endpoints return a 503 problem titled "No content release published", and the web app shows a friendly empty state instead of crashing. Pinned by `test_graph_without_release_is_503` in Task 10 and `shows empty state without content` in Task 16.

---

## File structure (created by this plan)

```text
.gitattributes  .editorconfig  .gitignore  .python-version
package.json  pnpm-workspace.yaml  tsconfig.base.json  eslint.config.js  .prettierrc
pyproject.toml  uv.lock                                     # uv workspace root + ruff/mypy config
content/curriculum.yaml
content/tiles/<tile-dir>/tile.yaml
content/tiles/<tile-dir>/concepts/<slug>/{concept.yaml, lesson.md}
packages/trace-schema/{package.json, pyproject.toml, schema/v1/trace.schema.json, fixtures/, scripts/, ts/src/, python/src/algoverse_trace_schema/, tests/}
packages/content-tools/{pyproject.toml, src/algoverse_content/{models,geometry,loader,validate,build,cli}.py, tests/}
apps/api/{pyproject.toml, alembic.ini, alembic/, src/algoverse_api/{main,settings,cli}.py, src/algoverse_api/core/{db,errors,middleware,security,schemas}.py,
          src/algoverse_api/modules/{users,content,progress,universe,dev}/..., tests/}
apps/web/{package.json, vite.config.ts, index.html, playwright.config.ts, src/{main.tsx, app/, ui/, api/, features/, widgets/, lib/, locales/}, tests/, e2e/}
.github/workflows/ci.yml
```

---

### Task 1: Monorepo scaffold and toolchain

**Files:**
- Create: `.gitattributes`, `.editorconfig`, `.gitignore`, `.python-version` (`3.12`), `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `pyproject.toml`
- Create: `packages/content-tools/pyproject.toml`, `packages/content-tools/src/algoverse_content/__init__.py`, `packages/content-tools/tests/test_smoke.py`
- Create: `apps/api/pyproject.toml`, `apps/api/src/algoverse_api/__init__.py`, `apps/api/tests/test_smoke.py`

**Interfaces:**
- Produces: root scripts `lint`, `typecheck`, `test`, `test:py`, `test:web`, `format`. The uv workspace members are `packages/content-tools`, `packages/trace-schema`, `apps/api`. The pnpm workspace globs are `apps/*`, `packages/*`.

- [ ] **Step 1:** Write `.gitattributes` (`* text=auto eol=lf`, `*.png binary`, `*.wasm binary`) and `.gitignore` (`node_modules/`, `.venv/`, `dist/`, `build/`, `data/`, `__pycache__/`, `.pytest_cache/`, `playwright-report/`, `test-results/`, `*.db`, `spikes/**/public/pyodide/`). Run `git add --renormalize .` so existing docs become LF.
- [ ] **Step 2:** Root `pyproject.toml`: `[tool.uv.workspace] members = ["packages/content-tools", "packages/trace-schema", "apps/api"]`. Add the dev dependency group `pytest`, `hypothesis`, `ruff`, `mypy`, `import-linter`. Ruff: `line-length = 100`, `target-version = "py312"`, select `E,F,I,UP,B,SIM`. mypy: `strict = true` for `algoverse_*` packages.
- [ ] **Step 3:** Write `packages/content-tools/tests/test_smoke.py` asserting `import algoverse_content`, and `apps/api/tests/test_smoke.py` asserting `import algoverse_api`.
- [ ] **Step 4:** Root `package.json`: `"private": true`, `"engines": {"node": ">=22"}`, `"packageManager": "pnpm@10.x"`. Scripts:
  - `"test:py": "uv run pytest packages apps/api -q"`
  - `"test:web": "pnpm -r --if-present test"`
  - `"test": "pnpm test:py && pnpm test:web"`
  - `"lint": "uv run ruff check . && uv run lint-imports && pnpm -r --if-present lint"`
  - `"typecheck": "uv run mypy packages/content-tools/src apps/api/src && pnpm -r --if-present typecheck"`
  - Root `pyproject.toml` `[tool.importlinter]` with `root_packages = ["algoverse_content", "algoverse_api"]` and a first contract: **forbidden**, `algoverse_content` must not import `algoverse_api`. Content tools stay independent of the server.
- [ ] **Step 5:** Run `uv python install 3.12 && uv sync --all-packages && pnpm install && pnpm test:py`. Expected: 2 passed.
- [ ] **Step 6:** Commit: `git commit -m "chore: monorepo scaffold (pnpm + uv workspaces, lint, LF)"`

### Task 2: Trace schema v1 package

**Files:**
- Create: `packages/trace-schema/schema/v1/trace.schema.json`
- Create: `packages/trace-schema/fixtures/bubble-sort-5-1-4.trace.json`
- Create: `packages/trace-schema/scripts/gen.mjs`, `packages/trace-schema/package.json`, `packages/trace-schema/pyproject.toml`
- Generated: `packages/trace-schema/ts/src/v1.ts`, `packages/trace-schema/python/src/algoverse_trace_schema/v1.py`
- Test: `packages/trace-schema/tests/test_schema.py`, `packages/trace-schema/tests/schema.test.ts`

**Interfaces:**
- Produces: TS `import type { Trace, TraceEvent, Value, HeapObject, Span } from "@algoverse/trace-schema"`. Python `from algoverse_trace_schema.v1 import Trace`. The JSON Schema `$id` is `https://algoverse.local/schema/trace/v1`.

- [ ] **Step 1:** Write `trace.schema.json` (draft 2020-12) transcribing [VISUALIZATION_ENGINE §3](../VISUALIZATION_ENGINE.md#3-execution-event-schema-trace-schema-v1). `$defs`: `Value` (oneOf on `t`), `HeapObject`, `Span`, `Origin`, `StateDelta`, `FrameInfo` (`frameId`, `func`, `depth`), and `TraceEvent` (oneOf discriminated by `kind`: `line`, `call`, `return`, `exception`, `compare`, `read`, `write`, `delete`, `method`, `attr_write`, `stdout`, `note`). The root `Trace` requires `schemaVersion` (const `"1.0"`), `meta`, `events`, `counters` and `stdout`. Use `additionalProperties: false` everywhere.
- [ ] **Step 2:** Write the fixture: the 7 events from VISUALIZATION_ENGINE §12, wrapped in a complete `Trace` envelope (`terminatedBy: "completed"`, `seed: 0`, `loops` for lines 3 and 4, matching counters).
- [ ] **Step 3: Write the failing tests.**

```python
# tests/test_schema.py
def test_fixture_validates_against_json_schema(): ...   # jsonschema.Draft202012Validator(schema).validate(fixture)
def test_fixture_parses_into_pydantic():
    trace = Trace.model_validate(fixture)
    assert trace.events[3].root.kind == "compare" and trace.events[3].root.result is True
def test_unknown_event_kind_rejected():                 # kind "teleport" -> ValidationError from both validators
```

```ts
// tests/schema.test.ts
it("fixture validates with ajv", () => expect(validate(fixture)).toBe(true));
it("fixture is assignable to Trace", () => { const t: Trace = fixture as Trace; expect(t.events).toHaveLength(7); });
```

- [ ] **Step 4:** Run `uv run pytest packages/trace-schema -q`. Expected: FAIL (`algoverse_trace_schema.v1` missing).
- [ ] **Step 5:** Implement `scripts/gen.mjs`. It runs `json-schema-to-typescript` → `ts/src/v1.ts` (exported from `ts/src/index.ts`), then shells out to `uv run datamodel-codegen --input schema/v1/trace.schema.json --input-file-type jsonschema --output python/src/algoverse_trace_schema/v1.py --output-model-type pydantic_v2.BaseModel --use-annotated --disable-timestamp`. Package scripts: `"gen": "node scripts/gen.mjs"`, `"check-gen": "node scripts/gen.mjs && git diff --exit-code -- ts python"`, `"test": "vitest run"`.
- [ ] **Step 6:** Run `pnpm --filter @algoverse/trace-schema gen && uv run pytest packages/trace-schema -q && pnpm --filter @algoverse/trace-schema test`. Expected: 3 passed (Python) and 2 passed (TS).
- [ ] **Step 7:** Commit: `git commit -m "feat(trace-schema): v1 JSON schema with generated TS and Pydantic types"`

### Task 3: Content models and pyramid geometry (Python)

**Files:**
- Create: `packages/content-tools/src/algoverse_content/models.py`, `packages/content-tools/src/algoverse_content/geometry.py`
- Test: `packages/content-tools/tests/test_geometry.py`, `packages/content-tools/tests/test_models.py`

**Interfaces:**
- Produces (`geometry.py`):
  - `TileKind = Literal["domain", "bridge"]`
  - `tile_kind(row: int, col: int) -> TileKind`, which raises `ValueError` when `row < 0` or `col` is outside `[0, 2·row]`
  - `neighbors(row: int, col: int, max_row: int | None = None) -> list[tuple[int, int]]` in the fixed order left, right, vertical (above for bridges, below for domains), excluding out-of-range positions
  - `tile_count(rows: int) -> int`
- Produces (`models.py`, all `extra="forbid"`): `SectionId = Literal["A".."L"]`, `SECTION_IDS: tuple[SectionId, ...]`, `Maturity = Literal["E","R","X"]`, `Position(row, col)`, `Tile(id, kind, position, title, tagline="", integrates=[], mastery_challenge=None, maturity="E")`, `Prerequisites(requires=[], recommends=[])`, `Concept(id, title, summary, tile, module, sequence, core, difficulty: 1..5, estimated_minutes, maturity="E", kind: Literal["concept","algorithm","data-structure","technique","system"], threads=[], prerequisites=Prerequisites(), related=[], applies_to=[], references=[], review_by: date | None = None)`, `Lesson(concept, sections: list[SectionId], body_markdown: str)`, `Edge(from_id, to_id, type: Literal["requires","recommends","related","applies_to"])`, `Curriculum(version: str, display_rows: int = 9, tiles, concepts, lessons: dict[str, Lesson])`, `Bundle(schema_version: Literal[1], version, checksum, display_rows, tiles, concepts, edges, lessons)`.

- [ ] **Step 1: Write the failing tests.**

```python
def test_kind_parity():            assert tile_kind(1, 0) == "domain" and tile_kind(1, 1) == "bridge"
def test_kind_out_of_range():      pytest.raises(ValueError, tile_kind, 1, 3)
def test_bridge_neighbors():       assert neighbors(1, 1) == [(1, 0), (1, 2), (0, 0)]
def test_apex_neighbors():         assert neighbors(0, 0) == [(1, 1)]
def test_edge_domain_bounded():    assert neighbors(2, 0, max_row=2) == [(2, 1)]
def test_tile_count():             assert [tile_count(r) for r in (1, 2, 3, 9)] == [1, 4, 9, 81]

@given(st.integers(0, 12).flatmap(lambda r: st.tuples(st.just(r), st.integers(0, 2 * r))))
def test_adjacency_is_symmetric(rc):   # for every n in neighbors(*rc, max_row=13): rc in neighbors(*n, max_row=13)

def test_concept_id_pattern_enforced():  # Concept(id="Bad Id", ...) raises ValidationError
def test_extra_fields_forbidden():       # Tile(..., colour="red") raises ValidationError
```

- [ ] **Step 2:** Run `uv run pytest packages/content-tools -q`. Expected: FAIL (import errors).
- [ ] **Step 3:** Implement `geometry.py` and `models.py` with the signatures above. Use pattern-constrained `str` fields for IDs, as stated in Global Constraints.
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(content-tools): content models and pyramid geometry"`

### Task 4: Content loader and validator with CLI

**Files:**
- Create: `packages/content-tools/src/algoverse_content/loader.py`, `validate.py`, `cli.py`
- Test: `packages/content-tools/tests/test_loader.py`, `packages/content-tools/tests/test_validate.py`, `packages/content-tools/tests/fixtures/` (small curricula built by a `make_tree(tmp_path, spec)` helper in `conftest.py`)

**Interfaces:**
- Produces:
  - `Issue(path: str, message: str)` (frozen dataclass; `path` is POSIX and relative to the content root)
  - `ContentError(Exception)` with an `.issues: list[Issue]` attribute
  - `load_curriculum(root: Path) -> Curriculum`, which raises `ContentError` with **all** YAML/schema issues collected (not just the first)
  - `validate(cur: Curriculum) -> list[Issue]`
  - The CLI entry point `algoverse-content` (Typer app in `cli.py`) with `validate ROOT` (exit code 1 and one `path: message` line per issue) and `graph ROOT --format dot`
- File layout read by the loader: `curriculum.yaml` (`version`, `display_rows`), `tiles/*/tile.yaml`, `tiles/*/concepts/*/concept.yaml`, and `tiles/*/concepts/*/lesson.md` with YAML front matter between `---` lines. The body after the front matter becomes `body_markdown`.

- [ ] **Step 1: Write the failing tests** (one per validation rule; each asserts the exact `Issue.path` and a substring of the message):

```python
def test_valid_pyramid_has_no_issues(tree): assert validate(load_curriculum(tree)) == []
def test_yaml_error_points_to_file(tree):        # broken concept.yaml -> ContentError, path endswith "binary-search/concept.yaml"
def test_duplicate_position(tree):               # message contains "position (1, 1) used by"
def test_kind_parity_mismatch(tree):             # domain at col 1 -> "kind 'domain' but col 1 is a bridge position"
def test_bridge_integrates_must_match_geometry(tree):  # "integrates must be ['computing-foundations', 'data-and-complexity', 'programming-logic']"
def test_bridge_must_integrate_two_domains(tree):     # no concept with prerequisites spanning >= 2 integrated tiles -> issue on tile.yaml
def test_unknown_prerequisite(tree):             # "unknown prerequisite 'first-algorithms.nope'"
def test_concept_id_prefix_matches_tile(tree):   # id 'x.binary-search' in tile 'first-algorithms' -> issue
def test_cycle_reports_path(tree):               # message == "prerequisite cycle: a.x -> b.y -> a.x" (deterministic start: smallest id)
def test_tile_without_core_concept(tree):
def test_lesson_missing(tree):                   # concept dir without lesson.md -> issue
def test_lesson_sections_must_be_A_to_L(tree):   # sections [A, B] -> "lesson must declare sections A–L in order"
def test_cli_exit_code(tree):                    # CliRunner: invalid tree -> exit_code 1, output has "path: message" lines
```

- [ ] **Step 2:** Run `uv run pytest packages/content-tools -q`. Expected: the new tests fail.
- [ ] **Step 3:** Implement `loader.py` (PyYAML `safe_load`). YAML syntax errors include the line and column from `problem_mark`, e.g. `…/concept.yaml:7:3: mapping values are not allowed here`. Pydantic errors become `Issue`s with the field location appended, e.g. `…/concept.yaml: difficulty: Input should be less than or equal to 5`.
- [ ] **Step 4:** Implement `validate.py`. Rules: unique tile and concept IDs; unique positions; kind parity; concept `tile` exists and ID prefix matches; prerequisite, related and applies_to references exist; a DAG over `requires` + `recommends` (iterative DFS; report the first cycle found, starting from the lexicographically smallest node); bridge `integrates` equals the sorted IDs of tiles present at its geometric neighbours; each bridge has ≥ 1 concept whose `requires` span ≥ 2 integrated tiles; each tile has ≥ 1 `core` concept; every concept has a lesson whose `sections == list(SECTION_IDS)`. Issues are sorted by `(path, message)`.
- [ ] **Step 5:** Implement `cli.py`. `graph --format dot` prints a `digraph` with tiles as clusters and `requires` edges.
- [ ] **Step 6:** Run the tests. Expected: all pass. Add `[project.scripts] algoverse-content = "algoverse_content.cli:app"`.
- [ ] **Step 7:** Commit: `git commit -m "feat(content-tools): loader, validator and CLI"`

### Task 5: Deterministic bundle build

**Files:**
- Create: `packages/content-tools/src/algoverse_content/build.py`
- Modify: `packages/content-tools/src/algoverse_content/cli.py` (add `build`)
- Test: `packages/content-tools/tests/test_build.py`

**Interfaces:**
- Consumes: `Curriculum`, `Bundle`, `Edge` (Task 3); `load_curriculum`, `validate` (Task 4).
- Produces:
  - `build_bundle(cur: Curriculum) -> Bundle`
  - `canonical_json(obj: BaseModel) -> bytes` (`sort_keys=True`, `separators=(",", ":")`, `ensure_ascii=False`, UTF-8)
  - `write_bundle(bundle: Bundle, out: Path) -> None`
  - CLI `algoverse-content build ROOT --out build/content/bundle.json`. It validates first, refuses to build with issues (exit 1), and prints the version and checksum.

- [ ] **Step 1: Write the failing tests.**

```python
def test_bundle_sorted_and_edges_derived(cur):
    b = build_bundle(cur)
    assert [(t.position.row, t.position.col) for t in b.tiles] == sorted(...)
    assert Edge(from_id="first-algorithms.linear-search", to_id="first-algorithms.binary-search", type="requires") in b.edges
def test_checksum_is_sha256_of_canonical_json_without_checksum(cur):  # recompute with checksum="" and compare
def test_build_is_deterministic(tree):          # two builds -> identical bytes
def test_checksum_ignores_line_endings(tree):   # rewrite one lesson.md with CRLF -> same checksum (Review Focus 1)
def test_cli_build_refuses_invalid(tree):       # exit 1, no output file
```

Edge direction: `from_id` is the prerequisite and `to_id` is the dependent concept.

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement `build.py`. Normalize `body_markdown` with `.replace("\r\n", "\n")` and strip trailing whitespace per line. The checksum is `"sha256:" + hexdigest` of `canonical_json` of the bundle with `checksum=""`.
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(content-tools): deterministic bundle build"`

### Task 6: Pyramid I fixture content

**Files:**
- Create: `content/curriculum.yaml` (`version: 0.1.0`, `display_rows: 9`)
- Create: 4 `tile.yaml` files and 12 concept folders (`concept.yaml` + `lesson.md`) as listed below
- Modify: root `package.json` (add `"content:validate"` and `"content:build"` scripts calling `uv run algoverse-content …` on `content/`)

Tiles (id: position, kind, title):
- `computing-foundations`: (0,0), domain, Computing Foundations. Directory: `content/tiles/d0-0-computing-foundations`
- `programming-logic`: (1,0), domain, Programming Logic in Python. Directory: `d1-0-programming-logic`
- `first-algorithms`: (1,1), bridge, First Algorithms, `integrates: [computing-foundations, data-and-complexity, programming-logic]`. Directory: `b1-1-first-algorithms`
- `data-and-complexity`: (1,2), domain, Data & Complexity Foundations. Directory: `d1-2-data-and-complexity`

Concepts (`requires` list; all `core: true`; `sequence` is the order listed within each tile):

| Concept ID | requires |
|---|---|
| `computing-foundations.what-is-an-algorithm` | — |
| `computing-foundations.memory-and-addresses` | — |
| `computing-foundations.binary-numbers` | `computing-foundations.memory-and-addresses` |
| `programming-logic.variables-and-names` | `computing-foundations.what-is-an-algorithm` |
| `programming-logic.for-loops-and-range` | `programming-logic.variables-and-names` |
| `programming-logic.lists` | `programming-logic.variables-and-names` |
| `data-and-complexity.what-is-an-array` | `computing-foundations.memory-and-addresses`, `programming-logic.lists` |
| `data-and-complexity.logarithms` | `computing-foundations.binary-numbers` |
| `data-and-complexity.counting-operations` | `programming-logic.for-loops-and-range` |
| `first-algorithms.linear-search` | `programming-logic.for-loops-and-range`, `data-and-complexity.what-is-an-array`, `data-and-complexity.counting-operations` |
| `first-algorithms.binary-search` | `first-algorithms.linear-search`, `data-and-complexity.logarithms` |
| `first-algorithms.insertion-sort` | `first-algorithms.linear-search` |

- [ ] **Step 1:** Create the files. Each `concept.yaml` takes its title and summary from [CURRICULUM](../CURRICULUM.md), with `kind: algorithm` for the three B1.1 concepts and `kind: concept` otherwise, and difficulty from 1 to 3. Each `lesson.md` declares `sections: [A, B, C, D, E, F, G, H, I, J, K, L]` and has 12 `## <letter>. <section name>` headings, each with one placeholder sentence marked `*(placeholder — authored in Phase 4)*`.
- [ ] **Step 2:** Run `pnpm content:validate`. Expected: exit 0, no issues.
- [ ] **Step 3:** Run `pnpm content:build`. Expected: prints `version 0.1.0` and a `sha256:` checksum, and writes `build/content/bundle.json`.
- [ ] **Step 4:** Commit: `git commit -m "content: Pyramid I fixture curriculum (4 tiles, 12 concepts)"`

### Task 7: API foundation — app factory, settings, errors, health

**Files:**
- Create: `apps/api/src/algoverse_api/{main.py, settings.py}`, `apps/api/src/algoverse_api/core/{errors.py, middleware.py, schemas.py}`
- Test: `apps/api/tests/conftest.py`, `apps/api/tests/test_app.py`

**Interfaces:**
- Produces:
  - `Settings(BaseSettings)` with `env_prefix="ALGOVERSE_"`: `database_url: str = "sqlite:///./data/algoverse.db"`, `mode: Literal["local", "cloud"] = "local"`, `dev_endpoints: bool = False`, `content_bundle: Path | None = None`, `cors_origins: list[str] = []`
  - `create_app(settings: Settings | None = None) -> FastAPI`
  - `ProblemError(status: int, title: str, detail: str | None = None, type_: str = "about:blank")`, with exception handlers rendering RFC 9457 for `ProblemError`, `RequestValidationError` (422, with an `errors` extension) and unmatched routes (404)
  - `CamelModel(BaseModel)` in `core/schemas.py`, which every response schema inherits
  - Fixture `client` in `conftest.py` (`TestClient(create_app(Settings(database_url="sqlite://", dev_endpoints=True)))` with `StaticPool`)

- [ ] **Step 1: Write the failing tests.**

```python
def test_healthz(client):          r = client.get("/api/v1/healthz"); assert r.status_code == 200 and r.json() == {"status": "ok"}
def test_readyz_checks_db(client): assert client.get("/api/v1/readyz").json() == {"status": "ready", "database": "ok"}
def test_request_id_echoed(client):      # header X-Request-ID: abc -> same header in response; absent -> generated 32-hex
def test_isolation_headers(client):      # COOP same-origin, COEP require-corp, X-Content-Type-Options nosniff
def test_unknown_route_is_problem_json(client):
    r = client.get("/api/v1/nope"); assert r.status_code == 404
    assert r.headers["content-type"].startswith("application/problem+json") and r.json()["title"] == "Not Found"
```

- [ ] **Step 2:** Run `uv run pytest apps/api -q`. Expected: FAIL.
- [ ] **Step 3:** Implement the interfaces above. Use structlog JSON logging with `request_id` bound per request. `readyz` runs `SELECT 1`. Add an import-linter **layers** contract `algoverse_api.main | algoverse_api.modules | algoverse_api.core`, plus an **independence** contract for `algoverse_api.modules.*` that allows imports only of other modules' `service` submodules (via `ignore_imports` for `*.service`).
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(api): app factory, settings, problem errors, health"`

### Task 8: Database layer and Alembic baseline

**Files:**
- Create: `apps/api/src/algoverse_api/core/db.py`, `apps/api/alembic.ini`, `apps/api/alembic/{env.py, versions/0001_baseline.py}`
- Create: `apps/api/src/algoverse_api/modules/content/models.py`, `modules/users/models.py`, `modules/progress/models.py`
- Test: `apps/api/tests/test_migrations.py`

**Interfaces:**
- Produces:
  - `Base(DeclarativeBase)`
  - `make_engine(url: str) -> Engine`. For SQLite it sets `PRAGMA journal_mode=WAL` (file databases only) and `PRAGMA foreign_keys=ON` on connect.
  - `get_session() -> Iterator[Session]` FastAPI dependency
  - `JsonType = JSON().with_variant(JSONB(), "postgresql")`
- Tables (columns per [DATA_MODEL_AND_API §3](../DATA_MODEL_AND_API.md#3-tables), Phase 2 subset):
  - `content_release(id uuid pk, version, checksum unique, published_at, is_active)`
  - `tile(release_id fk, id, kind, row, col, title, tagline, maturity, integrates json)` with pk `(release_id, id)` and unique `(release_id, row, col)`
  - `concept(release_id fk, id, tile_id, module, title, summary, kind, core, difficulty, est_minutes, maturity, sequence, threads json)` with pk `(release_id, id)`
  - `concept_edge(release_id, from_id, to_id, type)` with pk on all 4
  - `lesson(release_id, concept_id, sections json, body_markdown)` with pk `(release_id, concept_id)`
  - `app_user(id uuid pk, email nullable unique, display_name, role, settings json, created_at)`
  - `learner_concept(user_id fk, concept_id, state, updated_at)` with pk `(user_id, concept_id)`. There is **no foreign key to `concept`**, so progress survives releases.
  - `learner_section(user_id fk, concept_id, section, completed_at)` with pk `(user_id, concept_id, section)`

- [ ] **Step 1: Write the failing tests.**

```python
@pytest.mark.parametrize("url", db_urls())   # sqlite file in tmp_path + ALGOVERSE_TEST_PG_URL when set
def test_upgrade_then_downgrade(url): ...     # alembic upgrade head; inspector lists the 8 tables; downgrade base; 0 tables
def test_models_match_migration(url): ...     # alembic autogenerate diff after upgrade is empty
```

`db_urls()` skips the Postgres case unless `ALGOVERSE_TEST_PG_URL` is set. Locally: `docker run -d -p 5433:5432 -e POSTGRES_PASSWORD=pw postgres:16`, then `ALGOVERSE_TEST_PG_URL=postgresql+psycopg://postgres:pw@localhost:5433/postgres`.

- [ ] **Step 2:** Run `uv run pytest apps/api/tests/test_migrations.py -q`. Expected: FAIL.
- [ ] **Step 3:** Implement the models, `db.py` and the hand-reviewed `0001_baseline.py` (generated with `alembic revision --autogenerate`, then tidied). Add `psycopg[binary]` to the API dependencies.
- [ ] **Step 4:** Run the tests with and without `ALGOVERSE_TEST_PG_URL`. Expected: pass (Postgres cases skipped when unset).
- [ ] **Step 5:** Commit: `git commit -m "feat(api): SQLAlchemy models and Alembic baseline"`

### Task 9: Local user, CSRF and `/me`

**Files:**
- Create: `apps/api/src/algoverse_api/core/security.py`, `apps/api/src/algoverse_api/modules/users/{service.py, router.py}`
- Test: `apps/api/tests/test_users.py`, `apps/api/tests/test_csrf.py`

**Interfaces:**
- Produces:
  - `ensure_local_user(session: Session) -> AppUser`. It is idempotent: there is exactly one user with `display_name="Learner"` and `role="learner"`, created on first call.
  - `current_user` dependency. Local mode returns the local user. Cloud mode raises `ProblemError(401, "Authentication required")`.
  - `GET /api/v1/auth/csrf` → `{"token": str}` and sets cookie `av_csrf` (`SameSite=Strict`, `Path=/`, not httpOnly, `Secure` in cloud mode).
  - `require_csrf` dependency, applied to every `POST`/`PATCH`/`PUT`/`DELETE` router. It returns 403 `ProblemError(403, "CSRF token missing or invalid")` unless header `X-CSRF-Token` equals the cookie (`secrets.compare_digest`).
  - `GET /api/v1/me` → `{"id", "displayName", "role", "mode"}`

- [ ] **Step 1: Write the failing tests.**

```python
def test_me_returns_local_user(client):      assert client.get("/api/v1/me").json()["displayName"] == "Learner"
def test_local_user_created_once(session):   ensure_local_user(session); ensure_local_user(session); assert count(AppUser) == 1
def test_cloud_mode_requires_auth():         # create_app(Settings(mode="cloud")) -> /me is 401 problem
def test_mutation_without_csrf_is_403(client):   # POST /api/v1/progress/events without header -> 403 (route added in Task 12; use a test-only router here)
def test_mutation_with_matching_token_passes(client):
```

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. Register a test-only `POST /api/v1/_test/echo` behind `require_csrf`, mounted only when `dev_endpoints` is true, so the CSRF tests do not depend on Task 12.
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(api): local user, CSRF double-submit, /me"`

### Task 10: Content publish and content endpoints

**Files:**
- Create: `apps/api/src/algoverse_api/modules/content/{publish.py, service.py, schemas.py, router.py}`, `apps/api/src/algoverse_api/cli.py`
- Test: `apps/api/tests/test_publish.py`, `apps/api/tests/test_content_api.py`, `apps/api/tests/fixtures/bundle.json` (built from `content/` by a session fixture that calls `build_bundle(load_curriculum(repo_root / "content"))`)

**Interfaces:**
- Consumes: `Bundle` (Task 3), the tables (Task 8).
- Produces:
  - `publish_bundle(session: Session, bundle: Bundle, activate: bool = True) -> ContentRelease`. It is idempotent by checksum: an existing release with the same checksum is re-activated and no rows are duplicated. Activating deactivates the others.
  - `get_active_release(session) -> ContentRelease`. It raises `ProblemError(503, "No content release published")`.
  - CLI `algoverse-api publish-content PATH` (Typer, `[project.scripts] algoverse-api = "algoverse_api.cli:app"`)
  - Startup hook: when `settings.content_bundle` is set and its checksum differs from the active release, publish it.
  - Endpoints (response models in `schemas.py`):
    - `GET /api/v1/content/release` → `{"version", "checksum", "publishedAt"}`
    - `GET /api/v1/content/graph` → `{"release": {"version", "checksum"}, "displayRows": int, "tiles": [{"id","kind","row","col","title","tagline","maturity","integrates"}], "concepts": [{"id","tileId","module","title","summary","kind","core","difficulty","estimatedMinutes","maturity","sequence"}], "edges": [{"fromId","toId","type"}]}`
    - `GET /api/v1/content/tiles/{tileId}`: a tile plus its concepts, sorted by sequence
    - `GET /api/v1/content/concepts/{conceptId}`: concept plus `requires`, `recommends` and `unlocks` ID lists
    - `GET /api/v1/content/lessons/{conceptId}` → `{"conceptId","sections","bodyMarkdown"}`
    - Content GETs send `ETag: "<checksum>"` and return 304 on a matching `If-None-Match`.

- [ ] **Step 1: Write the failing tests.**

```python
def test_publish_is_idempotent(session, bundle):     publish twice -> 1 release row, 4 tiles, 12 concepts
def test_new_release_deactivates_old(session, bundle):   # bundle with changed version/checksum -> exactly 1 active
def test_graph_without_release_is_503(client):       # Review Focus 5: title "No content release published"
def test_graph_shape(published_client):              # 4 tiles, 12 concepts, 15 requires edges, displayRows 9, camelCase keys
def test_concept_unlocks(published_client):          # linear-search unlocks binary-search and insertion-sort
def test_unknown_concept_404_problem(published_client):
def test_etag_304(published_client):
def test_cli_publish(tmp_path, bundle_path):         # CliRunner -> exit 0, prints "published 0.1.0"
```

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. `apps/api` declares a workspace dependency on `algoverse-content` (for `Bundle`).
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(api): content publishing and content endpoints"`

### Task 11: Progression rules (pure functions)

**Files:**
- Create: `apps/api/src/algoverse_api/modules/progress/rules.py`
- Test: `apps/api/tests/test_rules.py`

**Interfaces:**
- Produces:
  - `class ConceptState(StrEnum)`: `LOCKED="locked"`, `AVAILABLE="available"`, `STARTED="started"`, `PRACTICED="practiced"`, `PROFICIENT="proficient"`, `MASTERED="mastered"`, `REVIEW_DUE="review_due"`
  - `rank(state) -> int` (`REVIEW_DUE` ranks as `MASTERED`)
  - `at_least(state, target) -> bool`
  - `compute_concept_states(requires: Mapping[str, Sequence[str]], stored: Mapping[str, ConceptState]) -> dict[str, ConceptState]`. Keys come from `requires` (all concepts). Stored states ≥ `STARTED` are kept. Otherwise a concept is `AVAILABLE` when every requirement is at least `PROFICIENT`, else `LOCKED`. Stored keys not in `requires` are ignored.
  - `class TileState(StrEnum)`: `FOGGED`, `GLIMPSED`, `OPEN`, `IN_PROGRESS`, `COMPLETED`, `MASTERED`
  - `@dataclass(frozen=True) TileRef(id: str, row: int, col: int, core_ids: tuple[str, ...], concept_ids: tuple[str, ...])`
  - `@dataclass(frozen=True) TileStatus(state: TileState, review_due: bool, core_total: int, core_proficient: int)`
  - `compute_tile_states(tiles: Sequence[TileRef], states: Mapping[str, ConceptState], requires: Mapping[str, Sequence[str]]) -> dict[str, TileStatus]`. Precedence: all core mastered → `MASTERED`; all core ≥ proficient → `COMPLETED`; any concept ≥ started → `IN_PROGRESS`; any concept ≥ available → `OPEN`. Otherwise the tile is `GLIMPSED` if **either** an edge neighbour (via `algoverse_content.geometry.neighbors`) is `OPEN` or beyond, **or** one of its concepts requires a concept whose tile is `OPEN` or beyond. Else it is `FOGGED`. Reason: domains touching the apex only at a corner, such as (1,0), must still be revealed when the apex opens (see [PYRAMID_MODEL §5.1](../PYRAMID_MODEL.md#51-tile-states)). `review_due` is true when any concept is `REVIEW_DUE`.

- [ ] **Step 1: Write the failing tests** (using the Task 6 requires table as a fixture `PYRAMID_REQUIRES`):

```python
def test_fresh_learner_roots_available():
    s = compute_concept_states(PYRAMID_REQUIRES, {})
    assert {k for k, v in s.items() if v == "available"} == {"computing-foundations.what-is-an-algorithm", "computing-foundations.memory-and-addresses"}
def test_multiple_prereqs_all_required():   # what-is-an-array stays locked with only memory-and-addresses proficient
def test_started_is_kept_even_if_prereq_regresses():
def test_review_due_counts_as_mastered_for_unlock():
def test_unknown_stored_concepts_ignored():
def test_fresh_tiles(): # apex OPEN; first-algorithms GLIMPSED (edge neighbour); programming-logic and data-and-complexity GLIMPSED (prerequisite link)
def test_unrelated_tile_stays_fogged():  # an extra tile at (2,0) with no prerequisite into an open tile -> FOGGED
def test_tile_completed_when_all_core_proficient():
def test_tile_mastered_and_review_flag():
```

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement `rules.py`. No database or FastAPI imports (enforced by an import-linter contract `progress.rules` forbids `sqlalchemy` and `fastapi`).
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(api): progression rules for concept and tile states"`

### Task 12: Progress, universe and dev endpoints

**Files:**
- Create: `apps/api/src/algoverse_api/modules/progress/{service.py, schemas.py, router.py}`, `modules/universe/{service.py, schemas.py, router.py}`, `modules/dev/router.py`
- Test: `apps/api/tests/test_progress_api.py`, `apps/api/tests/test_universe_api.py`

**Interfaces:**
- Consumes: `compute_concept_states`, `compute_tile_states` (Task 11); `get_active_release` (Task 10); `current_user`, `require_csrf` (Task 9).
- Produces:
  - `POST /api/v1/progress/events` with body `{"events": [{"type": "section_completed", "conceptId": str, "section": "A".."L"}]}` (1–100 events) → `202 {"accepted": n}`. Effects: upsert `learner_section`. If the concept's computed state is `AVAILABLE`, store `STARTED`. Unknown concept → 422 problem. Locked concept → `409 ProblemError("Concept is locked")`. The whole batch is processed in one transaction (any error rolls back the batch).
  - `GET /api/v1/progress/concepts/{conceptId}` → `{"conceptId", "state", "completedSections": ["A", ...]}`
  - `GET /api/v1/universe` → `{"release": {"version","checksum"}, "displayRows": int, "tiles": [{"id","row","col","kind","title","state","reviewDue","coreTotal","coreProficient"}], "concepts": [{"id","tileId","state"}]}`
  - `POST /api/v1/dev/concepts/{conceptId}/state` with body `{"state": ConceptState}` → 204. The router is mounted only when `settings.dev_endpoints` is true, and is protected by `require_csrf`.

- [ ] **Step 1: Write the failing tests.**

```python
def test_complete_section_starts_concept(pc):        # pc = published client with CSRF helper
def test_section_completed_is_idempotent(pc):        # Review Focus 4: same event twice -> completedSections == ["A"], 1 row
def test_locked_concept_rejected_409(pc):
def test_batch_rolls_back_on_error(pc):              # [valid, unknown] -> 422 and the valid one is not stored
def test_dev_proficient_unlocks_dependents(pc):      # set what-is-an-algorithm proficient -> variables-and-names available
def test_universe_tile_progress(pc):                 # 2 apex concepts set proficient -> computing-foundations coreTotal == 3, coreProficient == 2
def test_universe_ignores_unknown_concepts(pc, session):  # Review Focus 2: insert learner_concept for 'gone.concept' -> 200, absent from output
def test_dev_router_absent_when_disabled():          # dev_endpoints False -> 404
```

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the services and routers. The universe service builds `requires` from active-release `requires` edges and `TileRef`s from the tile and concept tables.
- [ ] **Step 4:** Run `uv run pytest apps/api -q`. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(api): progress events, universe projection, dev state endpoint"`

### Task 13: Web app scaffold — shell, routing, themes, i18n

**Files:**
- Create: `apps/web/{package.json, vite.config.ts, index.html, tsconfig.json}`, `apps/web/src/{main.tsx, index.css}`
- Create: `apps/web/src/app/{App.tsx, routes.tsx, nav.ts, AppShell.tsx, NavRail.tsx, TopBar.tsx, ErrorBoundary.tsx}`, `apps/web/src/features/placeholder/SectionPlaceholder.tsx`
- Create: `apps/web/src/ui/{theme.ts, ThemeToggle.tsx}`, `apps/web/src/lib/i18n.ts`, `apps/web/src/locales/en.json`
- Test: `apps/web/tests/{nav.test.tsx, theme.test.ts, a11y.test.tsx}`, `apps/web/tests/setup.ts`

**Interfaces:**
- Produces:
  - `NAV_ITEMS: readonly { path: string; labelKey: string; icon: LucideIcon }[]`, exactly 10 entries in this order: `/` dashboard, `/universe`, `/curriculum`, `/algorithms`, `/structures`, `/playground`, `/problems`, `/projects`, `/progress`, `/library`. Settings lives at `/settings` (avatar menu).
  - Routes: the 10 above, plus `/settings` and `/learn/:conceptId`. Unknown paths render a not-found page.
  - `type ThemePref = "light" | "dark" | "system"`
  - `readThemePref(): ThemePref` (default `"system"`; localStorage key `av.theme`; every storage access wrapped in try/catch)
  - `applyTheme(pref: ThemePref): void` (sets `document.documentElement.dataset.theme` to `light` or `dark`, resolving `system` via `matchMedia`)
  - Design tokens as CSS variables in `index.css` for light and dark (surface, text, muted, accent `#5b6cff`, focus ring, and tier colours `--tier-0` … `--tier-8` matching [UI_UX §1](../UI_UX.md#1-design-language) and the SVG legend).
  - `vite.config.ts`: `server.headers` and `preview.headers` with COOP/COEP; `server.proxy["/api"] = "http://127.0.0.1:8000"`; React plugin; Tailwind v4 plugin.

- [ ] **Step 1: Write the failing tests.**

```tsx
it("renders 10 nav links in spec order", () => { render(<App />); expect(navLinks().map(l => l.getAttribute("href"))).toEqual(["/", "/universe", ..., "/library"]); });
it("nav link marks the active route with aria-current=page", ...);
it("applyTheme('dark') sets data-theme", () => { applyTheme("dark"); expect(document.documentElement.dataset.theme).toBe("dark"); });
it("readThemePref survives a throwing localStorage", () => { /* stub getItem to throw */ expect(readThemePref()).toBe("system"); });
it("each route has no axe violations", async () => { for (const p of ROUTE_PATHS) { ... expect(await axe(container)).toHaveNoViolations(); } });
```

- [ ] **Step 2:** Run `pnpm --filter @algoverse/web test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Section screens render `SectionPlaceholder` (translated title + "Coming in phase N" text taken from [PRD §9](../PRD.md#9-feature-to-phase-map)). Every string comes from `en.json`. The nav rail collapses to icons below 1280 px. The skip-to-content link is the first focusable element.
- [ ] **Step 4:** Run the tests. Expected: all pass. Run `pnpm --filter @algoverse/web dev` and confirm `crossOriginIsolated === true` in the browser console.
- [ ] **Step 5:** Commit: `git commit -m "feat(web): app shell, routing, themes, i18n"`

### Task 14: Typed API client and query hooks

**Files:**
- Create: `apps/api/src/algoverse_api/export_openapi.py`, `apps/web/scripts/gen-api.mjs`
- Create: `apps/web/src/api/{schema.d.ts (generated), client.ts, hooks.ts}`
- Test: `apps/web/tests/api.test.ts`, `apps/api/tests/test_openapi.py`

**Interfaces:**
- Produces:
  - `python -m algoverse_api.export_openapi` prints the OpenAPI JSON (sorted keys)
  - Web script `"gen:api"` (export → `openapi-typescript` → `src/api/schema.d.ts`) and `"check:api"` (regenerate + `git diff --exit-code`)
  - `api = createClient<paths>({ baseUrl: "/api/v1" })` with a middleware that fetches `/auth/csrf` once, caches the token in memory and sets `X-CSRF-Token` on mutating requests. Problem responses throw `ApiProblem { status: number; title: string; detail?: string }`.
  - Hooks: `useContentGraph()`, `useUniverse()`, `useLesson(conceptId)`, `useConceptProgress(conceptId)`, and `useCompleteSection()` (mutation that invalidates `["universe"]` and `["progress", conceptId]`). Query keys: `["content","graph"]`, `["universe"]`, `["lesson", id]`, `["progress", id]`.

- [ ] **Step 1: Write the failing tests.** In `test_openapi.py`, the exported schema contains the paths `/api/v1/universe` and `/api/v1/progress/events`. In `api.test.ts` (using `msw`, a dev dependency added here and recorded in the PR description):

```ts
it("adds X-CSRF-Token to POST after fetching it once", ...);       // two POSTs -> one GET /auth/csrf
it("throws ApiProblem with title from problem+json", ...);         // 503 -> ApiProblem("No content release published")
```

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement, then run `pnpm --filter @algoverse/web gen:api`.
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(web): generated API client, CSRF middleware, query hooks"`

### Task 15: Universe geometry and concept layout (TypeScript, pure)

**Files:**
- Create: `apps/web/src/features/universe/{geometry.ts, conceptLayout.ts}`
- Test: `apps/web/tests/universe/{geometry.test.ts, conceptLayout.test.ts}`

**Interfaces:**
- Produces:
  - `type Point = { x: number; y: number }`
  - `tileKind(row, col): "domain" | "bridge"`
  - `tileVertices(row, col, side): [Point, Point, Point]` (apex at `(0, 0)`; formulas from [PYRAMID_MODEL §2](../PYRAMID_MODEL.md#2-coordinates-and-geometry-normative))
  - `tileCentroid(row, col, side): Point`
  - `tileNeighbors(row, col, maxRow): [number, number][]` (same order as the Python version)
  - `tileCount(rows): number`
  - `keyboardTarget(row, col, key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown", maxRow): { row: number; col: number } | null`. Left and right move to `col ∓ 1` within the row. Up moves to `(row − 1, clamp(col − 1, 0, 2·(row − 1)))`. Down moves to `(row + 1, col + 1)`. The result is `null` if out of range.
  - `layoutConceptsInTile(concepts: { id: string; sequence: number; requires: string[] }[]): Map<string, { depth: number; index: number }>`. Depth is the longest chain of in-tile prerequisites (requirements outside the tile are ignored). Within a depth, sort by `sequence` then `id`.

- [ ] **Step 1: Write the failing tests** (the same cases as Task 3, so Python and TS cannot drift):

```ts
expect(tileNeighbors(1, 1, 8)).toEqual([[1, 0], [1, 2], [0, 0]]);
expect([1, 2, 3, 9].map(tileCount)).toEqual([1, 4, 9, 81]);
expect(tileVertices(1, 1, 100)).toEqual([{ x: -50, y: 86.6025 }, { x: 50, y: 86.6025 }, { x: 0, y: 173.205 }]); // toBeCloseTo per coord
it("shared edge: inverted (1,1) top edge equals upright (0,0) base", ...);
it("keyboard Up from bridge (2,3) is (1,2)", ...); it("keyboard Down from domain (1,0) is (2,1)", ...); it("Left at col 0 is null", ...);
it("layout: binary-search depth 1, linear-search depth 0, insertion-sort depth 1 index after binary-search", ...);
fc.assert(fc.property(arbTile(12), ([r, c]) => tileNeighbors(r, c, 13).every(([nr, nc]) => tileNeighbors(nr, nc, 13).some(([a, b]) => a === r && b === c))));
```

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement both modules (no React or DOM imports).
- [ ] **Step 4:** Run the tests. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(web): universe geometry and intra-tile concept layout"`

### Task 16: Learning Universe screen

**Files:**
- Create: `apps/web/src/features/universe/{UniverseScreen.tsx, UniverseMap.tsx, TileShape.tsx, ConceptNode.tsx, ConceptPreview.tsx, useZoom.ts, Legend.tsx}`
- Create: `apps/web/src/widgets/CurriculumTree.tsx` (shared accessible list view)
- Test: `apps/web/tests/universe/UniverseMap.test.tsx`

**Interfaces:**
- Consumes: `useUniverse`, `useContentGraph` (Task 14); geometry and layout (Task 15).
- Produces:
  - `<UniverseMap data={UniverseVM} onSelectConcept(id) />`, where `UniverseVM` joins graph and universe responses by ID
  - `<CurriculumTree data={UniverseVM} />` (tiers → tiles → concepts as nested lists with state text, used by the list view and the Curriculum screen)
  - `<ConceptPreview conceptId />`: title, summary, state, prerequisites with ✓/✗, unlocks, and a **Start / Continue** link to `/learn/:id` (disabled with an explanation when the concept is locked)
- Behaviour (from [PYRAMID_MODEL](../PYRAMID_MODEL.md)): render every position for rows `0 … displayRows−1`. Authored tiles are coloured by tier and state. Unauthored positions and `fogged` tiles show as dark silhouettes without names. Concept nodes mount only at zoom scale `k ≥ 2.5`, and their labels only at `k ≥ 4`. Tiles are focusable (`role="button"`, `aria-label` such as "Bridge: First Algorithms, glimpsed, 0 of 3 core concepts"). Arrow keys use `keyboardTarget`. `Enter` zooms to the tile, `Esc` zooms out. Toolbar: zoom in, zoom out, fit, list-view toggle. `d3-zoom` scale extent is `[0.5, 12]`.

- [ ] **Step 1: Write the failing tests.**

```tsx
it("renders 81 tile polygons for displayRows 9", ...);
it("fogged tiles have no visible name", ...);
it("tile aria-label includes kind, title, state and core progress", ...);
it("ArrowRight moves focus from (1,0) to (1,1)", async () => { ... });
it("clicking an available concept opens preview with enabled Start link to /learn/<id>", ...);
it("locked concept preview explains which prerequisites are missing", ...);
it("shows empty state without content", ...);   // Review Focus 5: hook returns ApiProblem 503 -> "No content yet" message + `pnpm content:publish` hint
it("list view toggle renders CurriculumTree with the same concepts", ...);
```

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. The zoom transform lives in `useZoom` (it wraps `d3-zoom` on the `<svg>` ref and exposes `{ k, zoomToTile, zoomIn, zoomOut, fit }`). React renders all elements; d3 only computes transforms.
- [ ] **Step 4:** Run the tests. Expected: all pass. Manual check with API + web running: pan, zoom and keyboard navigation feel smooth.
- [ ] **Step 5:** Commit: `git commit -m "feat(web): learning universe map with LOD, keyboard nav and list view"`

### Task 17: Curriculum, lesson placeholder, dashboard v0, command palette

**Files:**
- Create: `apps/web/src/features/curriculum/CurriculumScreen.tsx`, `apps/web/src/features/lesson/LessonPlaceholder.tsx`, `apps/web/src/features/dashboard/{Dashboard.tsx, recommendNext.ts}`, `apps/web/src/app/CommandPalette.tsx`
- Test: `apps/web/tests/{lesson.test.tsx, recommendNext.test.ts, commandPalette.test.tsx}`

**Interfaces:**
- Consumes: `CurriculumTree` (Task 16), hooks (Task 14).
- Produces:
  - `recommendNext(vm: UniverseVM): string | null`. It returns the first concept in `started` state, else the first `available` one, ordered by tile `(row, col)` then concept `sequence`.
  - `/learn/:conceptId` page: title, a section stepper A–L (completed sections ✓), each section's placeholder text from `bodyMarkdown` split on `## ` headings (rendered as plain text in Phase 2, no Markdown library yet), and a **Mark section complete** button calling `useCompleteSection`. A locked concept shows an explanation and a link to its preview.
  - Dashboard v0: a "Continue / Start here" card (from `recommendNext`), a mini universe (`UniverseMap` at fixed fit, non-interactive) and tile progress list.
  - Command palette (`cmdk` in a Radix Dialog), opened with `Ctrl/⌘+K`. Items are the 10 sections plus every concept title. Selecting an item navigates.

- [ ] **Step 1: Write the failing tests.**

```ts
it("recommendNext prefers started over available", ...);
it("recommendNext orders by tile row/col then sequence", ...);   // fresh learner -> what-is-an-algorithm
it("marking section A complete shows ✓ on A and calls the mutation once", ...);
it("Ctrl+K opens palette; typing 'binary' lists Binary Search; Enter navigates to /learn/first-algorithms.binary-search", ...);
```

- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `pnpm test:web`. Expected: all pass.
- [ ] **Step 5:** Commit: `git commit -m "feat(web): curriculum, lesson placeholder, dashboard v0, command palette"`

### Task 18: Local run, end-to-end tests and CI

**Files:**
- Modify: root `package.json` (scripts `dev`, `content:publish`, `e2e`, `api:dev`)
- Create: `apps/web/playwright.config.ts`, `apps/web/e2e/{journey.spec.ts, keyboard.spec.ts, a11y.spec.ts}`, `.github/workflows/ci.yml`
- Create: `scripts/dev.mjs` (starts API and web together, forwards Ctrl+C, cross-platform)

**Interfaces:**
- Produces:
  - `pnpm content:publish` runs `content:build` and then `uv run algoverse-api publish-content build/content/bundle.json`
  - `pnpm api:dev` runs `uv run alembic -c apps/api/alembic.ini upgrade head && uv run uvicorn algoverse_api.main:app --factory --reload --port 8000`
  - `pnpm dev` runs `node scripts/dev.mjs`
  - Playwright `webServer`: the API (with `ALGOVERSE_DEV_ENDPOINTS=true` and `ALGOVERSE_DATABASE_URL` pointing to a temp SQLite file, published from `content/` before start) and `vite preview` on port 4173.

- [ ] **Step 1: Write the E2E specs.**

```ts
test("fresh learner journey", async ({ page }) => {
  // / -> "Start here: What is an Algorithm?" -> click -> /learn/computing-foundations.what-is-an-algorithm
  // mark sections A..L complete -> concept shows started
  // dev endpoint (request fixture with CSRF) sets it proficient -> /universe shows programming-logic tile "open"
  // and variables-and-names preview has an enabled Start link
});
test("universe keyboard navigation", ...);   // focus apex, ArrowDown -> First Algorithms bridge focused (aria-label check), Enter zooms
test("all routes have no axe violations", ...);
test("page is cross-origin isolated", async ({ page }) => { expect(await page.evaluate(() => crossOriginIsolated)).toBe(true); });
test("universe visual regression", async ({ page }) => {
  // /universe at "fit", fresh learner, light and dark -> toHaveScreenshot("universe-<theme>.png", { maxDiffPixelRatio: 0.01 })
  // baselines are generated and compared on ubuntu-latest Chromium only (annotate skip elsewhere)
});
```

- [ ] **Step 2:** Run `pnpm e2e`. Expected: FAIL until the config and servers are wired, then all 5 specs pass in Chromium. Run `pnpm e2e --project=firefox --project=webkit` and confirm they pass there too.
- [ ] **Step 3:** Write `.github/workflows/ci.yml` with these jobs:
  - `checks` (matrix `ubuntu-latest`, `windows-latest`): install uv + pnpm, `uv sync --all-packages`, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm content:validate`, `pnpm --filter @algoverse/trace-schema check-gen`, `pnpm --filter @algoverse/web check:api`
  - `postgres` (ubuntu, `postgres:16` service): `ALGOVERSE_TEST_PG_URL=… uv run pytest apps/api -q`
  - `e2e` (ubuntu): `pnpm exec playwright install --with-deps` and `pnpm e2e` (all three browsers). Upload the report on failure.
- [ ] **Step 4:** Push the branch and confirm all three CI jobs are green.
- [ ] **Step 5:** Commit: `git commit -m "test: e2e journey, keyboard, a11y; CI pipeline"`

### Task 19: Documentation and progress update

**Files:**
- Modify: `docs/ARCHITECTURE.md` §8–9 (root `package.json` scripts replace the Makefile; `src/` layout for Python packages; `scripts/dev.mjs`)
- Modify: `docs/PROGRESS.md` (M2.1–M2.7 rows ✅ with test evidence: command + counts), `docs/ROADMAP.md` (sizes/risks revised from experience)
- Modify: `README.md` (Quick start: prerequisites, `uv sync --all-packages`, `pnpm install`, `pnpm content:publish`, `pnpm dev`, open `http://localhost:5173`)
- Create: `docs/DECISIONS.md` ADR-019 "Root package.json scripts as cross-platform task runner (no Makefile)"

- [ ] **Step 1:** Follow the README quick start on a clean clone (delete `data/`, `.venv/`, `node_modules/`). Expected: the Universe shows Pyramid I with the apex open and its neighbours glimpsed.
- [ ] **Step 2:** Update the docs listed above.
- [ ] **Step 3:** Commit, push, and open the PR "Phase 2B: application foundation", linking this plan and the CI run.

---

## Phase 2 acceptance criteria (from ROADMAP)

- Fixture curriculum renders in Universe and Curriculum (Tasks 6, 16, 17; E2E journey).
- The progression engine unlocks correctly (Tasks 11–12; E2E journey).
- CI runs lint, type, unit and integration checks on SQLite + Postgres (Task 18).
- Spikes are documented and ADRs confirmed (Phase 2A plan, Task 7).
