# ✅ TEST_POLICY_MANIFEST v2.1
**Vitest + TypeScript · Hermetic · Event Stream UX · Anti-Fake-Tests**

## 0) Scope & Authority
This document governs **how tests are written and executed**. It is intended to be injected by the orchestrator when:
- `MODE=TEST`, or
- `MODE=FULL` (tests phase)

Precedence:
1) Architecture contracts/schemas are the law.
2) `AGENT_MANIFEST` governs agent behavior.
3) This policy governs **test mechanics** (assertions, hermeticity, async, mocking patterns).

If a test cannot be specified due to missing/insufficient contracts → **STOP_CONTRACT_REQUIRED** (NO_CONTRACT_NO_CODE).

---

## 1) Hard Rules (Blocking)
- **Hermetic unit tests**: no DB, no network, no external services.
- **No sleeps**: no arbitrary delays for correctness.
- **Behavior-level assertions**: do not couple tests to implementation.
- **One test = one failure reason**.
- **No fictional APIs**: do not mock or call symbols that do not exist.
- **No lazy control-flow mocks**: mocks must preserve real control-flow semantics.
- **Fixtures must be schema-valid**: if SUT uses Zod, your fixtures must pass it.

---

## 2) Mode Discipline (for the test writer)
- `MODE=TEST`: modify/add tests only; do not change implementation.
- `MODE=FULL`: tests are written first; implementation may follow in a later phase.

If you must touch implementation while in `MODE=TEST` → **STOP_MODE_MISMATCH**.

---

## 3) Mocking Rules (Semantics over Convenience)
### 3.1 Control-flow primitives
If you mock a function that *executes a callback* (transaction wrapper, pipeline runner, `withX(cb)`), the mock MUST call the callback and return its result.

✅ allowed:
```ts
vi.fn(async (...args) => cb(mockClient))
```

❌ forbidden:
```ts
vi.fn() // if real function executes callback
```

### 3.2 No fictional mocks
Before mocking or calling any function:
- confirm it exists in real imports/exports (use IDE search / actual import).
- if it does not exist, STOP and request correct API.

---

## 4) Event Stream / ChatEvent Assertions
### 4.1 Always assert
- `type`

### 4.2 Assert only key action fields by type
| type | required assertions |
|------|----------------------|
| `state` | state payload (only stable fields) |
| `tool.call` | `tool`, `input` (partial) |
| `tool.result` | `ok` OR `error` (contract shape) |
| `message.delta` | `delta` |
| `message.final` | `message` |
| `error` | ErrorContract fields |

Prefer partial matching:
```ts
expect(event).toMatchObject({
  type: 'tool.call',
  tool: '1c_odata_query',
  input: expect.objectContaining({ query: expect.any(String) }),
})
```

### 4.3 Ordering assertions
Assert ordering only if the test is explicitly about ordering (e.g., final must be last).

---

## 5) IDs: Literal vs Format
Rule:
- Literal equality only for **inputs** to SUT.
- Generated values → presence/format only.

```ts
expect(event.trace_id).toEqual(expect.any(String))
expect(event.step_id).toMatch(/^step_\d+$/)

expect(event.trace_id).toBe('given_trace_id') // only if input
```

---

## 6) Fixtures Must Match Schemas (Zod Alignment)
If SUT validates input/output with Zod/schemas:
- fixtures MUST satisfy that schema.
- do not use "fake ids" if schema requires UUID.

If you cannot infer the schema-required fixture without more context → **STOP_REQUIRE_CONTEXT**.

---

## 7) TypeScript Types Are Not Contracts
Do not test TS types as behavior.
Prefer format checks:
```ts
expect(event.ts).toMatch(/^(\d{4})-(\d{2})-(\d{2})T/)
```

---

## 8) Generated Values Inside SUT
Mock only if comparing exact values; otherwise assert presence/format.

```ts
vi.spyOn(crypto, 'randomUUID').mockReturnValue('fixed-uuid')
expect(result.id).toBe('fixed-uuid')
```

---

## 9) ErrorContract Testing
Always assert:
- `code`, `category`, `source`, `retryable`, `trace_id`

Never assert:
- full message text
- stacks/logs

```ts
expect(error).toMatchObject({
  code: 'E_ODATA_QUERY_FAILED',
  category: 'upstream',
  source: 'tool',
  retryable: true,
  trace_id: expect.any(String),
})
```

---

## 10) Layered Outcome Semantics (Step vs Tool Result)
If executor wraps tool execution:
- step may be technically ok
- domain/tool error may live inside `result`

Tests MUST assert the correct layer (step outcome vs nested tool result). Do not assume tool failure implies step failure unless contract says so.

---

## 11) Async / Streaming Tests
Forbidden:
- `sleep()`
- arbitrary timeouts as synchronization

Allowed:
- condition-based waits
- collect events until terminal condition

```ts
await waitFor(() => events.at(-1)?.type === 'message.final')
```

---

## 12) Test Structure & Cleanup
Use Arrange / Act / Assert.

Mandatory cleanup:
```ts
afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllTimers()
})
```

---

## 13) Windows / PowerShell Command Set (Declarative)
Environment:
- Windows + PowerShell + VS Code

Allowed commands:
```ps
npm run lint
npm run typecheck
npm run test
npx vitest run
npx tsc --noEmit
```

Search:
```ps
Select-String -Pattern "ChatEvent" -Path "src\**\*.ts"
```

VS Code preferred:
- Ctrl+Shift+F (search)
- Ctrl+P (go to file)

---

## 14) STOP Signals (for orchestrator routing)
Return STOP (do not proceed) if:
- missing/ambiguous contract → `STOP_CONTRACT_REQUIRED`
- mode mismatch → `STOP_MODE_MISMATCH`
- non-hermetic requirement for unit tests → `STOP_NON_HERMETIC`
- required schema/fixture details missing → `STOP_REQUIRE_CONTEXT`

---

## 15) Blocking Checklist
- [ ] Hermetic (no DB/network)
- [ ] No sleeps
- [ ] Behavior-level assertions
- [ ] Control-flow mocks preserve semantics
- [ ] No fictional APIs
- [ ] Fixtures are schema-valid (Zod alignment)
- [ ] Correct nesting asserted (step vs tool result)
- [ ] Cleanup enforced
