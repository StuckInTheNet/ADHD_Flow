# ADHD Flow

Tree-of-thought brainstorming CLI built on the Claude Agent SDK.

## Stack

- TypeScript 5 + Node ESM (`"type": "module"`)
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) for LLM calls
- Vitest for tests
- Vite + React frontend in `src/ui/` (separate app, own tsconfig)

## Project Structure

- `src/cli.ts` — CLI entry point, arg parsing
- `src/core/engine.ts` — orchestrator (diverge -> score -> cluster -> deepen)
- `src/core/llm.ts` — thin wrapper around SDK `query()`
- `src/core/frames.ts` — 19 cognitive frame definitions + `FrameRegistry` class
- `src/core/types.ts` — shared TypeScript types
- `src/core/integrations/` — GitHub, Linear, Notion, Google Docs, Slack
- `src/core/render.ts` — markdown/JSON/YAML/Graphviz renderers
- `tests/core/` — Vitest tests (one per module)

## Commands

```bash
npm run dev          # Run CLI via tsx (no build needed)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled CLI
npm test             # Run Vitest
```

## Key Patterns

- **LLM calls are stateless one-shots** — each `callLLM()` gets a fresh session. No tool use during divergence (tools = convergence pressure).
- **Branches don't see each other** during divergence. Cross-pollination only happens in the deepen phase.
- **Error resilience** — core modules catch LLM/parse failures and return empty results with stderr warnings. A failed branch doesn't crash the run.
- **Frame selection** — `FrameRegistry.selectFrames()` biases toward `code`/`design` tags in code mode, always includes at least one `wild` frame.
- **Integration functions** accept `Idea | DeepenedIdea` union — use `"sketch" in idea` to narrow the type.

## Important Notes

- The `Frame` type is defined in `frames.ts`, NOT in `types.ts`
- `src/ui/` has its own `tsconfig.json` and `package.json` — it's excluded from the root tsconfig
- `scoreIdeas()` takes 5 params (problem, ideas, model, weights, systemPrompt)
- Graphviz output uses `dotEscape()` for all user-content strings
- CLI validates numeric flags and file paths before running
