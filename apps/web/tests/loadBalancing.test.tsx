import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SYSTEMS } from "../src/features/catalog/catalog";
import {
  LB_FORMS,
  lbSteps,
  validateServers,
  type LbState,
} from "../src/features/viz/ds/loadBalancing";
import { parseOps } from "../src/features/viz/ds/ops";
import { renderRoute } from "./render";

const ops = (text: string) => {
  const parsed = parseOps(text, LB_FORMS);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.error));
  return parsed.value;
};
const run = (servers: string, text: string) => lbSteps([servers], ops(text));
const final = (servers: string, text: string) => run(servers, text).at(-1)!.state;
/** Work left on each queued request, per server ("down" for a server out of the pool). */
const queues = (st: LbState) =>
  Object.fromEntries(st.servers.map((s) => [s.name, s.up ? s.queue.map((r) => r.left) : "down"]));

const STREAM = "req 6, req 1, req 1, tick, req 6, req 1, req 1, tick, req 1, req 1, req 1";

describe("load balancing simulation", () => {
  it("round robin takes turns, so every heavy request lands on A", () => {
    const st = final("3", STREAM);
    expect(queues(st)).toEqual({ A: [4, 6, 1], B: [1], C: [1] });
    expect(st).toMatchObject({ sent: 9, done: 4, failed: 0, policy: "rr", turn: 9 });
  });

  it("least connections sends work where the fewest requests are open", () => {
    const st = final("3", `policy lc, ${STREAM}`);
    expect(queues(st)).toEqual({ A: [4, 1], B: [5, 1], C: [1, 1] });
    expect(st).toMatchObject({ sent: 9, done: 3, policy: "lc" });
  });

  it("asks which server gets each request, and the answer is where it went", () => {
    const routed = run("3", "req 6, req 1, req 1, req 6").filter((s) => s.question);
    expect(routed.map((s) => s.question!.correct)).toEqual(["A", "B", "C", "A"]);
    expect(routed.map((s) => s.state.target)).toEqual(["A", "B", "C", "A"]);
    expect(routed[0]!.question!.options).toEqual(["A", "B", "C"]);
    expect(routed[3]!.say.vars).toMatchObject({ id: 4, w: 6, s: "A", wait: 6 });
  });

  it("a failed health check takes the server out of the pool and fails its waiting requests", () => {
    const steps = run("3", "req 2, req 2, req 2, req 2, down B, req 1, req 1");
    expect(steps.find((s) => s.say.key === "down")!.say.vars).toEqual({ s: "B", lost: 1 });
    const routed = steps.filter((s) => s.say.key === "routeRr");
    expect(routed.map((s) => s.state.target)).toEqual(["A", "B", "C", "A", "A", "C"]);
    expect(routed[4]!.question!.options).toEqual(["A", "C"]);
    expect(steps.at(-1)!.state.failed).toBe(1);
  });

  it("with every server down, a request has nowhere to go", () => {
    expect(final("2", "down A, down B, req 3")).toMatchObject({ sent: 1, failed: 1 });
  });

  it("explains health changes that change nothing", () => {
    expect(run("2", "down C, up A, down A, down A").map((s) => s.say.key)).toEqual([
      "start",
      "noServer",
      "alreadyUp",
      "down",
      "alreadyDown",
      "end",
    ]);
  });

  it("each tick works on the first request of every healthy server", () => {
    const steps = run("2", "req 1, req 2, tick, tick");
    expect(steps.map((s) => s.say.key)).toEqual([
      "start",
      "routeRr",
      "routeRr",
      "tick",
      "tick",
      "end",
    ]);
    expect(steps[3]!.say.vars).toMatchObject({ fin: "#1 (A)", s: "B", w: 1 });
    expect(steps.at(-1)!.state.done).toBe(2);
  });

  it("parses commands in any case and checks the number of servers", () => {
    expect(ops("REQ 3, Tick, policy LC, down b, up B")).toEqual([
      { kind: "req", work: 3 },
      { kind: "tick" },
      { kind: "policy", policy: "lc" },
      { kind: "down", server: "B" },
      { kind: "up", server: "B" },
    ]);
    expect(parseOps("req 0", LB_FORMS).ok).toBe(false);
    expect(parseOps("req 10", LB_FORMS).ok).toBe(false);
    expect(validateServers(["3"])).toBeNull();
    for (const bad of [["1"], ["6"], ["x"], ["2", "3"], []]) {
      expect(validateServers(bad)).toEqual({ key: "badServers" });
    }
  });
});

describe("System Design Lab screens", () => {
  it("/systems lists the load balancing lesson", async () => {
    renderRoute("/systems");
    expect(
      await screen.findByRole("heading", { level: 1, name: "System Design Lab" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /^Load balancing/ })).toHaveAttribute(
      "href",
      "/systems/load-balancing",
    );
    expect(screen.getByText(`Lessons built so far: ${SYSTEMS.length}`)).toBeVisible();
  });

  it("the lesson shows the servers and asks which one gets each request", async () => {
    const user = userEvent.setup();
    renderRoute("/systems/load-balancing");
    await screen.findByRole("heading", { level: 2, name: "Try it: step through Load balancing" });
    expect(screen.getByRole("link", { name: "All system design lessons" })).toHaveAttribute(
      "href",
      "/systems",
    );
    const servers = screen.getByRole("list", { name: "Servers behind the load balancer" });
    expect(within(servers).getAllByRole("listitem")).toHaveLength(3);
    await user.click(screen.getByRole("checkbox", { name: "Predict before each result" }));
    const group = await screen.findByRole("group", { name: "Your prediction" });
    expect(
      within(group)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["A", "B", "C"]);
    await user.click(within(group).getByRole("button", { name: "A" }));
    expect(
      within(servers).getByText("Server A: up. Requests waiting: 1. Work left: 6 ticks."),
    ).toBeInTheDocument();
  });

  it("rejects a server count outside 2 to 5", async () => {
    const user = userEvent.setup();
    renderRoute("/systems/load-balancing");
    const field = await screen.findByLabelText("Servers (2 to 5)");
    await user.clear(field);
    await user.type(field, "9");
    await user.click(screen.getByRole("button", { name: "Run with these values" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The number of servers must be one whole number from 2 to 5.",
    );
  });
});
