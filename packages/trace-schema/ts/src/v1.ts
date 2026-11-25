/* eslint-disable */
/**
 * GENERATED from schema/v1/trace.schema.json by scripts/gen.mjs. Do not edit.
 */

export type TraceEvent = ({
kind: "line"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
} | {
kind: "call"
seq: number
span?: Span
frameId: FrameId
depth: number
delta?: StateDelta
func: string
parent?: FrameId
args: {
[k: string]: Value
}
} | {
kind: "return"
seq: number
span?: Span
frameId: FrameId
depth: number
delta?: StateDelta
value: Value
} | {
kind: "exception"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
excType: string
message: string
traceback: Span[]
} | {
kind: "compare"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
op: ("<" | "<=" | ">" | ">=" | "==" | "!=" | "is" | "in" | "not in")
left: Value
right: Value
result: boolean
leftOrigin?: Origin
rightOrigin?: Origin
} | {
kind: "read"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
container: ObjId
key: Value
value: Value
} | {
kind: "write"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
container: ObjId
key: Value
old?: Value
value: Value
valueOrigin?: Origin
} | {
kind: "delete"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
container: ObjId
key: Value
} | {
kind: "method"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
target: ObjId
method: string
args: Value[]
result: Value
} | {
kind: "attr_write"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
target: ObjId
attr: string
old?: Value
value: Value
} | {
kind: "stdout"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
text: string
} | {
kind: "note"
seq: number
span?: Span
frameId?: FrameId
depth: number
delta?: StateDelta
text: string
data?: {
[k: string]: Value
}
})
/**
 * Stable frame id, e.g. f3
 */
export type FrameId = string
export type Value = ({
t: "int"
v: string
} | {
t: "float"
v: (number | ("nan" | "inf" | "-inf"))
} | {
t: "bool"
v: boolean
} | {
t: "str"
v: string
truncated?: true
} | {
t: "none"
} | {
t: "ref"
id: ObjId
})
/**
 * Stable heap object id, e.g. o17
 */
export type ObjId = string

export interface Trace {
schemaVersion: "1.0"
meta: {
runId: string
pythonVersion: string
entry?: string
source: {
name: string
text: string
sha256: string
}[]
seed: number
limits: {
maxSteps: number
timeoutMs: number
maxHeapItems: number
}
terminatedBy: ("completed" | "step_limit" | "timeout" | "error" | "cancelled")
loops: {
span: Span
kind: ("for" | "while")
depth: number
}[]
}
events: TraceEvent[]
counters: {
lines: number
comparisons: number
reads: number
writes: number
swaps: number
calls: number
maxDepth: number
}
stdout: string
error?: {
excType: string
message: string
span?: Span
friendly?: string
}
}
export interface Span {
line: number
col: number
endLine: number
endCol: number
}
export interface StateDelta {
locals?: {
[k: string]: {
[k: string]: Value | {
t: "deleted"
}
}
}
heap?: {
[k: string]: HeapObject | {
deleted: true
}
}
frames?: {
push?: FrameInfo
pop?: FrameId
}
}
export interface HeapObject {
id: ObjId
kind: ("list" | "tuple" | "dict" | "set" | "frozenset" | "deque" | "instance" | "function" | "class" | "other")
typeName: string
items?: Value[]
entries?: [unknown, unknown][]
fields?: {
[k: string]: Value
}
len: number
truncated?: boolean
}
export interface FrameInfo {
frameId: FrameId
func: string
depth: number
}
export interface Origin {
container: ObjId
key: Value
}
