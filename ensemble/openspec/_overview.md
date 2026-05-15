# OpenSpec — Inter-Agent Contract Registry

> Every message between agents in the AI Orchestra runtime is validated against the schemas in this folder before dispatch. If a message doesn't conform, it is rejected at the sender — never delivered to the recipient.

## Design principles

1. **Schemas are the source of truth.** TypeScript types in `agents-framework/src/types.ts` mirror these schemas but the schemas are authoritative. When in doubt, the schema wins.
2. **Validate at the boundary.** Validation happens at `bus.post()` time — after the sender constructs a message, before the bus writes it to the recipient's inbox. Malformed messages never cross an agent boundary.
3. **Every message has a base envelope.** `bus-message.schema.json` defines the common fields (`id`, `from`, `to`, `taskId`, `type`, `timestamp`). Specialised message types (`delegation`, `report`, `escalation`) extend the envelope with their own `payload` shape.
4. **Agents declare capabilities.** `agent-manifest.schema.json` defines what each agent can do — its role, scope, supported task types, and model preferences. The Lead uses manifests to make delegation decisions.
5. **Referential integrity.** Schemas use `$ref` to compose — `delegation.schema.json` references `task.schema.json` inside its payload, not a copy. One source of truth per concept.

## Schema inventory

| Schema | Governs | Used by |
|--------|---------|---------|
| `task.schema.json` | Canonical task shape (lifecycle, payload, result, rationale) | Every agent |
| `bus-message.schema.json` | Base message envelope for all bus communication | `bus.ts` validation layer |
| `delegation.schema.json` | Lead → role agent task assignment | Lead agent |
| `report.schema.json` | Role agent → Lead task completion report | Role agents |
| `escalation.schema.json` | Role agent → Lead out-of-scope referral | Role agents |
| `scope.schema.json` | Agent filesystem access boundaries | `scope.ts` enforcement, `config.ts` loader |
| `agent-manifest.schema.json` | Per-agent capability declaration | Lead routing logic, `scripts/new.ts` scaffolder |

## JSON Schema dialect

All schemas use **JSON Schema 2020-12** (`$schema: "https://json-schema.org/draft/2020-12/schema"`).

## Adding a new message type

1. Create `<type>.schema.json` with `$ref` to `bus-message.schema.json` for the envelope.
2. Define the `payload` shape specific to the new type.
3. Add the type string to the `type` enum in `bus-message.schema.json`.
4. Add a corresponding TypeScript interface in `types.ts`.
5. Register the schema in the validation map inside `bus.ts`.
6. Update this overview.
