import { link, node, type Lesson, type Scene, type SceneNode } from "../model";

const both = (from: string, to: string, rate = 2) =>
  link(from, to, { kind: "request", rate }, { kind: "response", back: true, rate });

/* ------------------------------------------- Testing ------------------------------------------- */

const grading = node("grading", "service", "Grading service", 0, 0, { sub: "new partial credit" });
const gdb = node("gdb", "db", "Database", 3, -1.6);
const sandbox = node("sandbox", "worker", "Sandbox", 3, 1.6, { sub: "runs code" });
const lessonsT = node("lessonsT", "service", "Lessons service", -3, -1.6, { sub: "another team" });
const web = node("webT", "browser", "Browser", -3, 1.6);
const system = (extra: Record<string, Partial<SceneNode>> = {}, links?: Scene["links"]): Scene => ({
  nodes: [grading, gdb, sandbox, lessonsT, web].map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: links ?? [
    both("webT", "grading", 1),
    both("grading", "gdb", 1),
    both("grading", "sandbox", 1),
    both("grading", "lessonsT", 1),
  ],
});

export const TESTING: Lesson = {
  id: "testing",
  title: "Testing",
  tagline:
    "Knowing a change is safe before learners find out: fast tests for the logic, a few slow ones for everything else.",
  minutes: 11,
  level: "beginner",
  learn: [
    "Unit tests and test doubles",
    "Integration tests with real neighbours",
    "Contract tests between teams",
    "End-to-end tests and the test pyramid",
    "Flaky tests, load tests and failure tests",
  ],
  steps: [
    {
      kind: "setup",
      short: "Safe?",
      title: "Is this change safe?",
      body: [
        "The grading service is getting partial credit: pass 7 of 9 test cases and score 78 instead of 0. It reads and writes the database, runs code in a sandbox and fetches test cases from the Lessons team's service.",
        "How do we know the change works, and didn't break anything else?",
      ],
      scene: system(),
    },
    {
      kind: "problem",
      short: "Clicking",
      title: "Clicking around misses things",
      body: [
        "A developer tries a few submissions by hand and ships. Nobody tried 7 of 9: the new code truncates 77.8 to 77 instead of rounding to 78, and thousands of scores and leaderboard places are wrong before anyone notices.",
      ],
      scene: system({ grading: { state: "hot", badge: "77 ≠ 78" } }),
    },
    {
      kind: "solution",
      short: "Unit tests",
      title: "Unit tests: one piece, in isolation",
      body: [
        "A **unit test** calls one function with known inputs and checks the output, here the score for a given number of passed tests. It runs in milliseconds, with no database and no network, so you can have thousands and run them on every change.",
      ],
      code: [
        "def test_partial_credit_rounds():",
        "    assert score(passed=7, total=9) == 78",
        "    assert score(passed=0, total=9) == 0",
        "    assert score(passed=9, total=9) == 100",
      ],
      scene: { nodes: [{ ...grading, state: "lit", label: "score()" }] },
    },
    {
      kind: "technique",
      short: "Doubles",
      title: "Test doubles stand in for the rest",
      body: [
        'Grading can\'t run without its neighbours, so tests swap them for **test doubles**: an in-memory fake database, a stub sandbox that always reports "7 of 9 passed", a fake Lessons service.',
        "Fast and predictable, but a double only behaves the way you told it to.",
      ],
      scene: system({
        gdb: { label: "Fake DB", state: "dim" },
        sandbox: { label: "Stub sandbox", state: "dim" },
        lessonsT: { label: "Fake lessons", state: "dim" },
      }),
    },
    {
      kind: "solution",
      short: "Integration",
      title: "Integration tests: real neighbours",
      body: [
        "An **integration test** runs Grading against a real database, started fresh in a container for the test run, and checks what actually lands in the tables.",
        "SQL typos, broken migrations and wrong column types show up here, not in production.",
      ],
      scene: system({ sandbox: { state: "dim" }, lessonsT: { state: "dim" } }),
    },
    {
      kind: "technique",
      short: "Contracts",
      title: "Contract tests: between teams",
      body: [
        "Grading depends on the Lessons service, which another team owns and deploys on its own schedule. If they rename `expected` to `expected_output`, Grading's fake never notices.",
        "A **contract test** records what Grading relies on, and the Lessons team runs it in their own pipeline: they can't break Grading without knowing.",
      ],
      scene: system({ lessonsT: { badge: "contract ✓" } }),
    },
    {
      kind: "solution",
      short: "End-to-end",
      title: "End-to-end tests: the whole journey",
      body: [
        "An **end-to-end test** drives the real system the way a learner would: open the lesson in a browser, submit code that passes 7 of 9 tests, and see 78 on the screen.",
        "It catches what nothing else does, but it is slow and brittle, so keep only a handful for the most important journeys.",
      ],
      scene: system({ webT: { state: "lit", label: "Automated browser" } }),
    },
    {
      kind: "insight",
      short: "Pyramid",
      title: "The test pyramid",
      body: [
        "Together the suites form a **pyramid**: thousands of fast unit tests at the bottom, hundreds of integration and contract tests in the middle, a few end-to-end tests at the top.",
        "AlgoVerse itself has over 600 tests of this kind, run on every change.",
      ],
      table: {
        head: ["Kind", "How many", "Speed"],
        rows: [
          ["Unit", "thousands", "milliseconds"],
          ["Integration / contract", "hundreds", "seconds"],
          ["End-to-end", "a handful", "minutes"],
        ],
      },
      scene: system(),
    },
    {
      kind: "case",
      short: "Flaky",
      title: "Case: the flaky test",
      body: [
        'One end-to-end test fails about one run in twenty. It waits a fixed two seconds for the score to appear, and sometimes grading takes three. People learn to press "re-run", and then ignore real failures too.',
        'Wait for a condition ("the score is visible"), not a fixed time. Fix or quarantine flaky tests quickly: a test nobody trusts is worse than none.',
      ],
      scene: system({ webT: { badge: "fails 1 in 20", state: "hot" } }),
    },
    {
      kind: "technique",
      short: "Load & chaos",
      title: "Testing for load and for failure",
      body: [
        "Correct isn't enough. A **load test** sends contest-sized traffic to a copy of the system and finds where latency turns upward, before learners do.",
        "**Failure tests** cut the sandbox off or slow the database and check that timeouts, retries and fallbacks behave as designed.",
      ],
      scene: system({ sandbox: { state: "down" } }, [
        both("webT", "grading", 3),
        both("grading", "gdb", 2),
        link("grading", "sandbox", "fail"),
      ]),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "Unit tests check one piece, with doubles for the rest: fast enough to run thousands.",
        "Integration tests use real neighbours; contract tests protect teams from each other.",
        "A few end-to-end tests cover the key journeys.",
        "Kill flaky tests; test load and failure on purpose.",
      ],
      scene: system(),
    },
  ],
};

/* -------------------------------------------- CI/CD -------------------------------------------- */

const dev = node("dev", "browser", "Developer", -4.4, 0);
const repo = node("repo", "storage", "Git repository", -2, 0);
const ci = node("ci", "worker", "CI pipeline", 0.4, 0, { sub: "build + 600 tests" });
const registryC = node("registryC", "storage", "Image registry", 2.6, -1.6, { sub: "app:3f9c2a1" });
const staging = node("staging", "server", "Staging", 2.6, 1.4);
const prod = node("prod", "server", "Production", 5, 0);
const pipeline = (
  extra: Record<string, Partial<SceneNode>> = {},
  links?: Scene["links"],
): Scene => ({
  nodes: [dev, repo, ci, registryC, staging, prod].map((n) => ({ ...n, ...(extra[n.id] ?? {}) })),
  links: links ?? [
    link("dev", "repo", "write"),
    link("repo", "ci", "event"),
    link("ci", "registryC", "write"),
    link("registryC", "staging", "copy"),
    link("registryC", "prod", "copy"),
  ],
});

export const CICD: Lesson = {
  id: "cicd",
  title: "CI/CD and deployments",
  tagline:
    "Getting every change to learners quickly and safely, and back out again just as quickly.",
  minutes: 12,
  level: "intermediate",
  learn: [
    "Continuous integration on a clean machine",
    "Build once, promote the same artifact",
    "Blue-green and canary deploys",
    "Schema changes that don't break the old version",
    "Feature flags, and measuring delivery",
  ],
  steps: [
    {
      kind: "setup",
      short: "By hand",
      title: "Shipping by hand",
      body: [
        "Once a week, on Friday evening, a developer builds AlgoVerse on their laptop, copies it to the server and restarts it. Everyone stays late in case something breaks.",
      ],
      scene: { nodes: [dev, prod], links: [link("dev", "prod", "heavy")] },
    },
    {
      kind: "problem",
      short: "My machine",
      title: '"It works on my machine"',
      body: [
        "This Friday the laptop had a newer library than the server, and the app won't start. While the developer works out which of thirty changes to undo, the site is down.",
        "Big, rare releases are risky: many changes at once, built in an environment nobody else can reproduce.",
      ],
      scene: { nodes: [dev, { ...prod, state: "down" }], links: [link("dev", "prod", "fail")] },
    },
    {
      kind: "solution",
      short: "CI",
      title: "Continuous integration",
      body: [
        "Now every push to the shared repository starts a **pipeline** on a clean machine: install, build, run the tests. Nothing depends on anyone's laptop.",
        "The team merges small changes many times a day; a broken build is fixed within minutes, while the change is fresh. This very site is built that way.",
      ],
      scene: pipeline({}, [link("dev", "repo", "write"), link("repo", "ci", "event")]),
    },
    {
      kind: "technique",
      short: "Build once",
      title: "Build once, promote the same artifact",
      body: [
        "The pipeline's last stage packages the result into an **immutable artifact**, usually a container image tagged with its commit, `app:3f9c2a1`, and stores it in a registry.",
        "Staging and production run that exact image. What was tested is byte-for-byte what ships.",
      ],
      scene: pipeline(),
    },
    {
      kind: "solution",
      short: "CD",
      title: "Continuous delivery",
      body: [
        "Every image that passes is deployed to **staging** automatically, a small copy of production where smoke tests check the main journeys. From there it can go to production at the press of a button, or automatically (**continuous deployment**).",
      ],
      scene: pipeline({ staging: { badge: "smoke tests ✓" } }),
    },
    {
      kind: "technique",
      short: "Blue-green",
      title: "Blue-green: switch, don't replace",
      body: [
        "Run two identical production groups. Blue serves everyone on v41 while v42 starts on green. When green is healthy, the load balancer switches all traffic at once.",
        "If v42 misbehaves, switch back in seconds: blue is still running.",
      ],
      scene: {
        nodes: [
          node("lbC", "lb", "Load balancer", 0, 0),
          node("blue", "server", "Blue", 2.6, -1.4, { badge: "v41", state: "dim" }),
          node("green", "server", "Green", 2.6, 1.4, { badge: "v42", state: "lit" }),
          node("usersC", "user", "Learners", -3, 0),
        ],
        links: [
          both("usersC", "lbC", 2),
          both("lbC", "green", 2),
          link("lbC", "blue", { dashed: true }),
        ],
      },
    },
    {
      kind: "technique",
      short: "Canary",
      title: "Canary: try it on a few learners first",
      body: [
        "A **canary** release sends a small slice of real traffic, say 5%, to the new version, and compares its error rate and latency with the old version's. Healthy? Widen to 25%, 50%, 100%. Worse? Roll back automatically.",
      ],
      quiz: {
        question:
          "The canary at 5% shows errors at 2% versus 0.1% on the old version. What should happen?",
        options: [
          "Widen to 50% to gather more data",
          "Roll back automatically",
          "Ignore it: only 5% of learners",
        ],
        answer: 1,
        why: "That is twenty times worse. Rolling back limits the damage to a small slice for a few minutes.",
      },
      scene: {
        nodes: [
          node("lbC", "lb", "Load balancer", 0, 0),
          node("blue", "server", "v41", 2.6, -1.4, { sub: "95%" }),
          node("green", "server", "v42", 2.6, 1.4, { sub: "5% canary", state: "lit" }),
          node("usersC", "user", "Learners", -3, 0),
        ],
        links: [both("usersC", "lbC", 2), both("lbC", "blue", 3), both("lbC", "green", 1)],
      },
    },
    {
      kind: "case",
      short: "Migrations",
      title: "Case: the migration that breaks the old version",
      body: [
        "v42 renames a column, `name` to `full_name`. The migration runs, but during the rollout most servers still run v41, which asks for `name` and crashes.",
        "Use **expand and contract**: add `full_name` and write both; deploy code that reads the new one; backfill; and only in a later release drop `name`. Old and new code must both work at every step.",
      ],
      scene: pipeline({ prod: { state: "hot", badge: "v41: column missing" } }),
    },
    {
      kind: "technique",
      short: "Flags",
      title: "Feature flags: deploy is not release",
      body: [
        "The new code editor is merged and deployed weeks before launch, switched off. A **feature flag** decides, per request, who sees it: the team, then 1% of learners, then everyone.",
        "Turning it off is a config change, not a deploy. Remove old flags once they are fully on.",
      ],
      scene: pipeline({ prod: { badge: "flag: new editor 1%" } }),
    },
    {
      kind: "insight",
      short: "Measure",
      title: "Measure the delivery itself",
      body: [
        "Four numbers, known as the **DORA metrics**, describe how well a team ships. Teams that ship small changes often are both faster and safer.",
      ],
      table: {
        head: ["Metric", "Asks"],
        rows: [
          ["Deploy frequency", "how often do we ship?"],
          ["Lead time", "commit to production: how long?"],
          ["Change failure rate", "what share of deploys cause trouble?"],
          ["Time to restore", "how fast do we recover?"],
        ],
      },
      scene: pipeline(),
    },
    {
      kind: "recap",
      short: "Recap",
      title: "Recap",
      body: [
        "CI: small changes merged often, built and tested on a clean machine.",
        "Build once: one immutable artifact per commit, promoted unchanged.",
        "Blue-green and canaries make deploys reversible.",
        "Expand and contract for schema changes; feature flags separate deploy from release.",
      ],
      scene: pipeline(),
    },
  ],
};
