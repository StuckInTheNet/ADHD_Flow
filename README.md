# ADHD Flow

A tree-of-thought brainstorming engine built on the [Claude Agent SDK](https://docs.anthropic.com/en/docs/claude-agent-sdk). Fans out parallel divergent ideas under different cognitive frames, scores them, prunes traps, and deepens the survivors.

Think of it as structured ADHD: let the ideas scatter first, then focus.

## How It Works

```
Problem
  |
  v
DIVERGE ──> N parallel branches, each under a different cognitive frame
  |          (hardware engineer, adversary, biologist, speedrunner, ...)
  |          No branch sees another. No critic. Pure generation.
  v
SCORE ────> Novelty / Viability / Fit / Impact / Effort / Risk
  |          Flag traps (ideas that look good but hide fatal flaws)
  v
CLUSTER ──> Group ideas by underlying angle, not surface keywords
  v
DEEPEN ───> Top-K ideas get recursive expansion + red-team critique
  v
OUTPUT ───> Shortlist, non-obvious pick, traps, provocation
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/StuckInTheNet/ADHD_Flow.git
cd ADHD_Flow
npm install

# Run (requires ANTHROPIC_API_KEY in environment)
npm run dev -- "design a rate limiter that survives a leader election"
```

## Usage

```bash
# Basic brainstorm
adhd-flow "how should we shard this queue?"

# More frames, JSON output
adhd-flow "optimize this endpoint" --frames 8 --output json

# With context file (code, constraints, docs)
adhd-flow "refactor this module" --context ./snippet.ts --top 5

# Non-engineering problem
adhd-flow "name this product" --no-code-mode --frames 6

# Custom scoring criteria
adhd-flow "..." --scoring-prompt ./my-scoring.txt

# Quiet mode (suppress progress, just output)
adhd-flow "..." --quiet --output json > result.json
```

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--frames N` | Parallel divergence branches | 5 |
| `--ideas N` | Ideas per branch | 6 |
| `--top N` | How many to deepen | 3 |
| `--concurrency N` | Max parallel LLM calls | 4 |
| `--context PATH` | File to inject as context | -- |
| `--model NAME` | Override the SDK model | -- |
| `--no-code-mode` | Don't bias frames toward engineering | -- |
| `--output FORMAT` | `json`, `markdown`, `yaml`, `dot`, `html` | `markdown` |
| `--scoring-prompt PATH` | Custom scoring system prompt | -- |
| `--red-team-prompt PATH` | Custom red-team system prompt | -- |
| `--quiet` | Suppress progress events | -- |

## Integrations

After a run, push a specific idea to an external service:

- **GitHub Issues**: `--create-issue-from-idea ID --github-owner OWNER --github-repo REPO --github-token TOKEN`
- **Linear**: `--create-linear-issue-from-idea ID --linear-team-id ID --linear-token TOKEN`
- **Notion**: `--create-notion-page-from-idea ID --notion-database-id ID --notion-token TOKEN`
- **Google Docs**: `--create-google-doc-from-idea ID --google-docs-access-token TOKEN`
- **Slack**: `--post-to-slack-from-idea ID --slack-channel CHANNEL --slack-token TOKEN`

## Output Formats

- **markdown** (default) -- human-readable report with shortlist, deepened ideas, traps, clusters, provocation
- **json** -- full structured output for programmatic use
- **yaml** -- same as JSON, YAML syntax
- **dot** -- Graphviz DOT graph of the idea space
- **html** -- standalone HTML report

## Cognitive Frames

Each run picks N frames from a registry of 19 built-in perspectives:

| Frame | Angle |
|-------|-------|
| Hardware engineer | Latency, memory layout, physical constraints |
| Adversary | Exploit, fail, sabotage the obvious solution |
| Biology | Immune systems, neural plasticity, evolution |
| Speedrunner | Glitches, skips, abusive-but-legal shortcuts |
| Inversion | Guarantee NOT-X, then negate back |
| 10-year-old | Naive, unencumbered, convention-free |
| On-call at 3am | What design prevents the page? |
| Ant colony | Emergent, decentralized, local-rules-only |
| ... | + 11 more (logistics, game design, markets, etc.) |

In code mode (default), frames are biased toward engineering tags. At least one "wild" frame is always included to keep divergence weird.

## Architecture

```
src/
  cli.ts              # CLI entry point + arg parsing
  core/
    engine.ts          # Orchestrator: diverge -> score -> cluster -> deepen
    divergence.ts      # Fan-out: one LLM call per frame, pure generation
    scoring.ts         # Critic: score ideas on 6 axes, flag traps
    clustering.ts      # Group ideas by underlying angle
    deepening.ts       # Recursive expansion of top-K ideas
    red-teaming.ts     # Adversarial critique of deepened ideas
    frames.ts          # Frame registry (19 built-in cognitive perspectives)
    llm.ts             # Thin wrapper around Claude Agent SDK query()
    render.ts          # Markdown, JSON, YAML, Graphviz renderers
    html-renderer.ts   # Standalone HTML report renderer
    types.ts           # TypeScript types
    integrations/      # GitHub, Linear, Notion, Google Docs, Slack
  ui/                  # React + Vite frontend (separate app)
```

## License

MIT
