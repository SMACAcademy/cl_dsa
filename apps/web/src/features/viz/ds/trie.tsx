import { useTranslation } from "react-i18next";
import { DsPlayer } from "./DsPlayer";
import { cmd, W, type OpForm } from "./ops";
import { pyList, StepLog, type DsStep } from "./steps";
import { TreeView, type DrawTree } from "./treeView";
import type { NodeState } from "./views";

export const TRIE_CODE: readonly string[] = [
  "class TrieNode:",
  "    def __init__(self):",
  "        self.children, self.is_word = {}, False",
  "",
  "def insert(root, word):",
  "    node = root",
  "    for ch in word:",
  "        if ch not in node.children:",
  "            node.children[ch] = TrieNode()",
  "        node = node.children[ch]",
  "    node.is_word = True",
  "",
  "def search(root, word):",
  "    node = root",
  "    for ch in word:",
  "        if ch not in node.children:",
  "            return False",
  "        node = node.children[ch]",
  "    return node.is_word",
  "",
  "def starts_with(root, prefix):",
  "    node = root",
  "    for ch in prefix:",
  "        if ch not in node.children:",
  "            return []",
  "        node = node.children[ch]",
  "    return words_below(node, prefix)",
];

export type TrieOp = { kind: "insert" | "search" | "prefix"; word: string };

export const TRIE_FORMS: readonly OpForm<TrieOp>[] = (["insert", "search", "prefix"] as const).map(
  (kind) => ({
    pattern: cmd(`${kind} ${W}`),
    build: (m) => ({ kind, word: (m[1] as string).toLowerCase() }),
  }),
);

type TNode = { id: number; ch: string; children: Record<string, number>; isWord: boolean };

export type TrieState = {
  nodes: Readonly<Record<number, TNode>>;
  marks: Readonly<Record<number, NodeState>>;
};

/** Root is drawn as "·"; children are ordered alphabetically. */
export function trieToDraw(nodes: Readonly<Record<number, TNode>>): DrawTree {
  return {
    root: 0,
    nodes: Object.fromEntries(
      Object.values(nodes).map((n) => [
        n.id,
        {
          id: n.id,
          label: n.id === 0 ? "·" : n.ch,
          kids: Object.keys(n.children)
            .sort()
            .map((c) => n.children[c] as number),
          ringed: n.isWord,
        },
      ]),
    ),
  };
}

export function trieSteps(_start: readonly string[], ops: readonly TrieOp[]) {
  const nodes: Record<number, TNode> = { 0: { id: 0, ch: "", children: {}, isWord: false } };
  let nextId = 1;
  let marks: Record<number, NodeState> = {};
  const log = new StepLog<TrieState>(() => ({
    nodes: Object.fromEntries(
      Object.entries(nodes).map(([k, n]) => [k, { ...n, children: { ...n.children } }]),
    ),
    marks: { ...marks },
  }));
  const words = () => {
    const out: string[] = [];
    const rec = (id: number, prefix: string) => {
      const n = nodes[id] as TNode;
      if (n.isWord) out.push(prefix);
      for (const c of Object.keys(n.children).sort()) rec(n.children[c] as number, prefix + c);
    };
    rec(0, "");
    return out;
  };

  log.add(0, "start");
  for (const op of ops) {
    marks = {};
    const { word } = op;
    let node = 0;
    let missing = false;
    const visited: number[] = [];
    for (const ch of word) {
      const next = (nodes[node] as TNode).children[ch];
      if (next == null) {
        if (op.kind !== "insert") {
          marks = { [node]: "current" };
          log.add(op.kind === "search" ? 17 : 25, "missing", { ch, word });
          missing = true;
          break;
        }
        const id = nextId++;
        nodes[id] = { id, ch, children: {}, isWord: false };
        (nodes[node] as TNode).children[ch] = id;
        node = id;
        marks = { ...Object.fromEntries(visited.map((v) => [v, "found"])), [id]: "new" };
        log.add(9, "create", { ch });
      } else {
        node = next;
        marks = { ...Object.fromEntries(visited.map((v) => [v, "found"])), [node]: "current" };
        log.add(op.kind === "insert" ? 10 : op.kind === "search" ? 18 : 26, "follow", { ch });
      }
      visited.push(node);
    }
    if (missing) continue;
    const end = nodes[node] as TNode;
    if (op.kind === "insert") {
      const already = end.isWord;
      end.isWord = true;
      marks = { ...Object.fromEntries(visited.map((v) => [v, "found"])) };
      log.add(11, already ? "alreadyWord" : "markWord", { word });
    } else if (op.kind === "search") {
      marks = { [node]: end.isWord ? "found" : "current" };
      log.add(19, end.isWord ? "searchHit" : "searchPrefixOnly", { word });
    } else {
      const below: number[] = [];
      const rec = (id: number) => {
        below.push(id);
        for (const c of Object.values((nodes[id] as TNode).children)) rec(c);
      };
      rec(node);
      const found = words().filter((w) => w.startsWith(word));
      marks = Object.fromEntries(below.map((id) => [id, "found"]));
      log.add(27, "prefixWords", { prefix: word, words: pyList(found), count: found.length });
    }
  }
  marks = {};
  log.add(0, "end", {
    count: words().length,
    nodes: Object.keys(nodes).length - 1,
    words: pyList(words()),
  });
  return log.steps;
}

function TrieStage({ s }: { s: DsStep<TrieState> }) {
  const { t } = useTranslation();
  return (
    <TreeView
      tree={trieToDraw(s.state.nodes)}
      binary={false}
      stateOf={(id) => s.state.marks[id] ?? "idle"}
      label={t("viz.ds.view.tree")}
    />
  );
}

export function TriePlayer() {
  return (
    <DsPlayer
      prefix="trie"
      code={TRIE_CODE}
      startField={null}
      presets={[
        {
          key: "tour",
          start: "",
          ops: "insert car, insert cat, insert cart, insert care, insert dog, insert dot, insert do, prefix ca, search do, search ca",
        },
        {
          key: "search",
          start: "",
          ops: "insert tea, insert ten, search ten, search te, search to",
        },
        {
          key: "autocomplete",
          start: "",
          ops: "insert in, insert inn, insert ink, insert it, insert ice, insert idea, insert ideal, prefix in, prefix id",
        },
        { key: "card", start: "", ops: "insert car, insert cat, insert dog, prefix ca" },
      ]}
      forms={TRIE_FORMS}
      run={trieSteps}
      stage={(s: DsStep<TrieState>) => <TrieStage s={s} />}
      vars={(s) => [{ name: "nodes", value: Object.keys(s.state.nodes).length - 1 }]}
    />
  );
}
