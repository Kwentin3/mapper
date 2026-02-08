# Agent Interpretation Rules — Contract Telemetry

## 1. Purpose
This document defines how agents MUST interpret Contract Telemetry signals in architectural telemetry outputs. Signals are factual observations, not judgments or enforcement. Interpretation and decision‑making are the agent’s responsibility. The agent MUST apply these rules after reading the generated architecture map.

## 2. Signal Semantics

### [C+] CONTRACTED
- Meaning: The file is a contract boundary with both inbound and outbound anchors detected.
- Agent MAY: Perform scoped, behavior‑preserving changes that do not alter contract shape.
- Agent MUST: Preserve existing contract interfaces, schemas, and boundary behavior.
- Agent MUST NOT: Invent, replace, or redefine contracts without explicit instruction.

### [C?] PARTIAL CONTRACT
- Meaning: The file is a contract boundary with only one side of anchors detected.
- Risks: Contract coverage is partial and incomplete for safe autonomous change.
- Agent MUST: Treat changes as WARNING level and request confirmation before modifying contract‑relevant behavior.
- Agent MUST NOT: Assume the missing side is absent or invalid.

### [C0] NO CONTRACT
- Meaning: The file is a contract boundary with no anchors detected.
- Agent MUST: STOP; do not modify contract‑relevant behavior or interfaces.
- Agent MUST: Ask for explicit human confirmation and scope before any change.
- Agent MUST NOT: Infer or fabricate contract structure.

### [C~] UNKNOWN
- Meaning: The file is outside the contract boundary or unreadable; status is unknown.
- Reason for caution: Unknown status is not an error and carries no guarantees.
- Agent MUST: Perform manual review or request clarification before contract‑impacting changes.
- Agent MUST NOT: Treat unknown as safe or unsafe by default; it is indeterminate.

## 3. Priority Rules (Order‑Sensitive)
1. Layer boundary violations → STOP, regardless of Contract Telemetry status.
2. [C0] → STOP.
3. [C?] → WARNING (confirmation required).
4. [C+] → SAFE (subject to other signals).
5. [C~] → MANUAL REVIEW.

## 4. Combined Signal Interpretation

| Contract | Boundary OK | HUB | Agent Action |
| -------- | ----------- | --- | ------------ |
| C0       | any         | any | STOP         |
| C?       | yes         | yes | WARNING      |
| C?       | yes         | no  | WARNING      |
| C+       | yes         | yes | SAFE         |
| C+       | yes         | no  | SAFE         |
| C~       | any         | any | MANUAL REVIEW |
| any      | no          | any | STOP         |

## 5. Explicit Non‑Goals
- How contracts are detected or computed.
- How to fix or add missing contracts.
- How to refactor architecture or resolve violations.
- Any runtime or behavioral guarantees.

## Final Check (Self‑Review)
- All [C*] signals are covered.
- At least one explicit STOP rule exists.
- No implementation or heuristic language is present.
- The document can be used verbatim as an agent contract.
