import { useTranslation } from "react-i18next";
import { DsPlayer } from "./DsPlayer";
import { cmd, type OpForm, type OpsError } from "./ops";
import { StepLog, type DsStep, type Question } from "./steps";

/* ------------------------------ Load balancing ------------------------------ */

export const LB_CODE: readonly string[] = [
  "class LoadBalancer:",
  "    def __init__(self, servers):",
  "        self.servers = servers  # each has .up and a .queue",
  "        self.policy, self.turn = 'round_robin', 0",
  "    def pick(self):",
  "        pool = [s for s in self.servers if s.up]  # health checks",
  "        if not pool:",
  "            raise NoHealthyServer()  # every server is down",
  "        if self.policy == 'round_robin':",
  "            self.turn += 1",
  "            return pool[(self.turn - 1) % len(pool)]",
  "        return min(pool, key=lambda s: len(s.queue))  # least connections",
  "    def route(self, request):",
  "        self.pick().queue.append(request)",
  "    def tick(self):  # one unit of time passes",
  "        for s in self.servers:",
  "            if s.up and s.queue:",
  "                s.queue[0].work -= 1",
  "                if s.queue[0].work == 0:",
  "                    s.queue.pop(0)  # finished: its connection closes",
];

export type Policy = "rr" | "lc";

export type LbOp =
  | { kind: "req"; work: number }
  | { kind: "tick" }
  | { kind: "policy"; policy: Policy }
  | { kind: "down" | "up"; server: string };

export const LB_FORMS: readonly OpForm<LbOp>[] = [
  { pattern: cmd("req ([1-9])"), build: (m) => ({ kind: "req", work: Number(m[1]) }) },
  { pattern: cmd("tick"), build: () => ({ kind: "tick" }) },
  {
    pattern: cmd("policy (rr|lc)"),
    build: (m) => ({ kind: "policy", policy: (m[1] as string).toLowerCase() as Policy }),
  },
  {
    pattern: cmd("(down|up) ([A-Ea-e])"),
    build: (m) => ({
      kind: (m[1] as string).toLowerCase() as "down" | "up",
      server: (m[2] as string).toUpperCase(),
    }),
  },
];

/** Servers: one whole number from 2 to 5. */
export function validateServers(start: string[]): OpsError | null {
  const [s, ...rest] = start;
  const n = Number(s);
  return rest.length === 0 && /^\d$/.test(s ?? "") && n >= 2 && n <= 5
    ? null
    : { key: "badServers" };
}

export type LbRequest = { id: number; work: number; left: number };
export type LbServer = { name: string; up: boolean; queue: readonly LbRequest[] };

export type LbState = {
  policy: Policy;
  turn: number;
  servers: readonly LbServer[];
  /** The server that just received a request: its link is drawn lit. */
  target: string | null;
  sent: number;
  done: number;
  failed: number;
};

/** Ticks of work still queued on a server. */
export function workLeft(server: LbServer): number {
  return server.queue.reduce((sum, r) => sum + r.left, 0);
}

/** The healthy server with the most work left (the first one on a tie). */
export function busiest(servers: readonly LbServer[]): LbServer | undefined {
  let best: LbServer | undefined;
  for (const s of servers) {
    if (s.up && (!best || workLeft(s) > workLeft(best))) best = s;
  }
  return best;
}

type Server = { name: string; up: boolean; queue: LbRequest[] };

export function lbSteps(start: readonly string[], ops: readonly LbOp[]) {
  const n = Number(start[0]);
  const servers: Server[] = Array.from({ length: n }, (_, i) => ({
    name: String.fromCharCode(65 + i),
    up: true,
    queue: [],
  }));
  let policy: Policy = "rr";
  let turn = 0;
  let target: string | null = null;
  let sent = 0;
  let done = 0;
  let failed = 0;
  const log = new StepLog<LbState>(() => ({
    policy,
    turn,
    target,
    sent,
    done,
    failed,
    servers: servers.map((s) => ({ ...s, queue: s.queue.map((r) => ({ ...r })) })),
  }));
  const busiestVars = () => {
    const b = busiest(servers);
    return { s: b?.name ?? "—", w: b ? workLeft(b) : 0 };
  };

  log.add(3, "start", { n, names: servers.map((s) => s.name).join(", ") });
  for (const op of ops) {
    target = null;
    if (op.kind === "req") {
      sent++;
      const id = sent;
      const pool = servers.filter((s) => s.up);
      if (pool.length === 0) {
        failed++;
        log.add(8, "noPool", { id, w: op.work });
        continue;
      }
      let chosen: Server;
      if (policy === "rr") {
        chosen = pool[turn % pool.length] as Server;
        turn++;
      } else {
        chosen = pool.reduce((best, s) => (s.queue.length < best.queue.length ? s : best));
      }
      const question: Question | undefined =
        pool.length > 1
          ? {
              say: { key: "qRoute", vars: { id, w: op.work } },
              options: pool.map((s) => s.name),
              correct: chosen.name,
            }
          : undefined;
      const wait = workLeft(chosen);
      const vars = { id, w: op.work, s: chosen.name, wait, conns: chosen.queue.length };
      chosen.queue.push({ id, work: op.work, left: op.work });
      target = chosen.name;
      log.add(policy === "rr" ? 11 : 12, policy === "rr" ? "routeRr" : "routeLc", vars, question);
    } else if (op.kind === "tick") {
      const finished: string[] = [];
      for (const s of servers) {
        const head = s.queue[0];
        if (!s.up || !head) continue;
        head.left--;
        if (head.left === 0) {
          s.queue.shift();
          done++;
          finished.push(`#${head.id} (${s.name})`);
        }
      }
      const key = finished.length ? "tick" : "tickNone";
      log.add(finished.length ? 20 : 18, key, { fin: finished.join(", "), ...busiestVars() });
    } else if (op.kind === "policy") {
      policy = op.policy;
      log.add(4, op.policy === "rr" ? "policyRr" : "policyLc");
    } else {
      const s = servers.find((x) => x.name === op.server);
      if (!s) {
        log.add(6, "noServer", { s: op.server });
      } else if (op.kind === "down") {
        if (!s.up) {
          log.add(6, "alreadyDown", { s: s.name });
          continue;
        }
        const lost = s.queue.length;
        s.up = false;
        s.queue = [];
        failed += lost;
        log.add(6, "down", { s: s.name, lost });
      } else if (s.up) {
        log.add(6, "alreadyUp", { s: s.name });
      } else {
        s.up = true;
        log.add(6, "up", { s: s.name });
      }
    }
  }
  target = null;
  log.add(1, "end", { sent, done, failed, ...busiestVars() });
  return log.steps;
}

/* --------------------------------- Picture --------------------------------- */

const W = 460;
const ROW = 56;
const LB = { x: 8, w: 108, h: 60 };
const SRV = { x: 196, w: 60, h: 44 };
const CHIP = 22;
const CHIP_GAP = 4;
const CHIPS_X = SRV.x + SRV.w + 10;
const MAX_CHIPS = Math.floor((W - CHIPS_X) / (CHIP + CHIP_GAP)) - 1;

function LbStage({ s }: { s: DsStep<LbState> }) {
  const { t } = useTranslation();
  const st = s.state;
  const rows = Math.max(st.servers.length, 2);
  const height = rows * ROW + 8;
  const rowY = (i: number) => 4 + i * ROW + ROW / 2;
  const lbY = height / 2;
  const targetIndex = st.servers.findIndex((x) => x.name === st.target);
  const targetY = targetIndex >= 0 ? rowY(targetIndex) : null;
  const top = busiest(st.servers);
  const metrics = [
    { label: t("viz.ds.lb.metric.policy"), value: t(`viz.ds.lb.policyName.${st.policy}`) },
    { label: t("viz.ds.lb.metric.sent"), value: st.sent },
    { label: t("viz.ds.lb.metric.done"), value: st.done },
    { label: t("viz.ds.lb.metric.failed"), value: st.failed },
    {
      label: t("viz.ds.lb.metric.busiest"),
      value: top ? t("viz.ds.lb.metric.busiestValue", { s: top.name, w: workLeft(top) }) : "—",
    },
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-control border border-line bg-surface px-2 py-1">
            <dt className="text-[10px] font-semibold tracking-wide text-muted uppercase">
              {m.label}
            </dt>
            <dd className="font-mono text-sm font-semibold">{m.value}</dd>
          </div>
        ))}
      </dl>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${W} ${height}`}
        className="mt-3 w-full"
        style={{ maxHeight: height * 1.4 }}
      >
        {st.servers.map((srv, i) => {
          const lit = st.target === srv.name;
          return (
            <line
              key={`link-${srv.name}`}
              x1={LB.x + LB.w}
              y1={lbY}
              x2={SRV.x}
              y2={rowY(i)}
              strokeWidth={lit ? 3 : 1.5}
              strokeDasharray={srv.up ? undefined : "4 4"}
              opacity={srv.up ? 1 : 0.5}
              className={lit ? "stroke-accent" : "stroke-line"}
            />
          );
        })}
        {targetY !== null && (
          <circle
            key={`dot-${st.sent}`}
            r={5}
            cx={SRV.x}
            cy={targetY}
            className="fill-accent motion-reduce:hidden"
          >
            <animate attributeName="cx" from={LB.x + LB.w} to={SRV.x} dur="0.5s" fill="freeze" />
            <animate attributeName="cy" from={lbY} to={targetY} dur="0.5s" fill="freeze" />
          </circle>
        )}
        <rect
          x={LB.x}
          y={lbY - LB.h / 2}
          width={LB.w}
          height={LB.h}
          rx={10}
          strokeWidth={2}
          className="fill-accent-soft stroke-accent"
        />
        <text
          x={LB.x + LB.w / 2}
          y={lbY - 6}
          textAnchor="middle"
          className="fill-accent-ink text-[11px] font-semibold"
        >
          {t("viz.ds.lb.balancer")}
        </text>
        <text
          x={LB.x + LB.w / 2}
          y={lbY + 12}
          textAnchor="middle"
          className="fill-accent-ink font-mono text-[10px]"
        >
          {t(`viz.ds.lb.policyName.${st.policy}`)}
        </text>
        {st.servers.map((srv, i) => {
          const y = rowY(i);
          const lit = st.target === srv.name;
          const shown = srv.queue.slice(0, MAX_CHIPS);
          const hidden = srv.queue.length - shown.length;
          return (
            <g key={srv.name} className={srv.up ? undefined : "opacity-50"}>
              <rect
                x={SRV.x}
                y={y - SRV.h / 2}
                width={SRV.w}
                height={SRV.h}
                rx={8}
                strokeWidth={lit ? 3 : 2}
                strokeDasharray={srv.up ? undefined : "4 3"}
                className={lit ? "fill-raised stroke-accent" : "fill-raised stroke-line"}
              />
              <text
                x={SRV.x + SRV.w / 2}
                y={y - 3}
                textAnchor="middle"
                className="fill-fg font-mono text-[13px] font-semibold"
              >
                {srv.name}
              </text>
              <text
                x={SRV.x + SRV.w / 2}
                y={y + 13}
                textAnchor="middle"
                className="fill-muted font-mono text-[9px]"
              >
                {srv.up ? t("viz.ds.lb.workLeft", { w: workLeft(srv) }) : t("viz.ds.lb.downLabel")}
              </text>
              {shown.map((r, k) => {
                const x = CHIPS_X + k * (CHIP + CHIP_GAP);
                const fresh = lit && k === srv.queue.length - 1;
                const working = k === 0;
                return (
                  <g key={r.id}>
                    <rect
                      x={x}
                      y={y - CHIP / 2}
                      width={CHIP}
                      height={CHIP}
                      rx={4}
                      strokeWidth={fresh ? 2.5 : 1.5}
                      className={
                        fresh
                          ? "fill-found-soft stroke-found"
                          : working
                            ? "fill-compare-soft stroke-compare"
                            : "fill-surface stroke-line"
                      }
                    />
                    <text
                      x={x + CHIP / 2}
                      y={y + 4}
                      textAnchor="middle"
                      className="fill-fg font-mono text-[11px] font-semibold"
                    >
                      {r.left}
                    </text>
                  </g>
                );
              })}
              {hidden > 0 && (
                <text
                  x={CHIPS_X + shown.length * (CHIP + CHIP_GAP) + 2}
                  y={y + 4}
                  className="fill-muted font-mono text-[11px]"
                >
                  {t("viz.ds.lb.more", { n: hidden })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-muted">{t("viz.ds.lb.legend")}</p>
      <ul aria-label={t("viz.ds.lb.diagram")} className="sr-only">
        {st.servers.map((srv) => (
          <li key={srv.name}>
            {t("viz.ds.lb.server", {
              s: srv.name,
              state: srv.up ? t("viz.ds.lb.serverUp") : t("viz.ds.lb.serverDown"),
              n: srv.queue.length,
              w: workLeft(srv),
            })}
          </li>
        ))}
      </ul>
    </>
  );
}

const STREAM = "req 6, req 1, req 1, tick, req 6, req 1, req 1, tick, req 1, req 1, req 1";

export function LoadBalancerPlayer() {
  return (
    <DsPlayer
      prefix="lb"
      code={LB_CODE}
      startField="servers"
      validateStart={validateServers}
      presets={[
        { key: "roundRobin", start: "3", ops: STREAM },
        { key: "leastConn", start: "3", ops: `policy lc, ${STREAM}` },
        {
          key: "failure",
          start: "3",
          ops: "req 2, req 2, req 2, req 2, req 2, req 2, down B, req 1, req 1, req 1, up B, req 1",
        },
        { key: "card", start: "2", ops: "req 3, req 1, tick, req 1" },
      ]}
      forms={LB_FORMS}
      run={lbSteps}
      stage={(s: DsStep<LbState>) => <LbStage s={s} />}
      vars={(s) => [
        {
          name: "policy",
          value: s.state.policy === "rr" ? "'round_robin'" : "'least_connections'",
        },
        { name: "turn", value: s.state.turn },
        ...s.state.servers.map((srv) => ({
          name: `${srv.name}.queue`,
          value: srv.up ? `[${srv.queue.map((r) => r.left).join(", ")}]` : "down",
        })),
      ]}
    />
  );
}
