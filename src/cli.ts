#!/usr/bin/env node
// CLI surface for ADHD_Flow.
//
// Usage:
//   adhd-flow "how should we shard this queue?"
//   adhd-flow "..." --frames 6 --ideas 8 --top 4 --context ./CONTEXT.md
//   adhd-flow "..." --output json > result.json
//   adhd-flow "..." --output markdown > result.md

import { readFileSync } from "node:fs";
import { run } from "./core/engine.js"; // Updated path
import { renderMarkdown, renderJson } from "./core/render.js"; // Updated path and function
import type { RunEvent, RunOptions } from "./core/types.js"; // Updated path

type Flags = {
  problem: string;
  context?: string;
  frames?: number;
  ideas?: number;
  top?: number;
  concurrency?: number;
  codeMode: boolean;
  outputFormat: "json" | "markdown"; // Changed from json: boolean
  quiet: boolean;
  model?: string;
};

function parse(argv: string[]): Flags {
  const f: Flags = { problem: "", codeMode: true, outputFormat: "markdown", quiet: false }; // Default to markdown
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--frames": f.frames = Number(argv[++i]); break;
      case "--ideas": f.ideas = Number(argv[++i]); break;
      case "--top": f.top = Number(argv[++i]); break;
      case "--concurrency": f.concurrency = Number(argv[++i]); break;
      case "--context": f.context = readFileSync(argv[++i], "utf8"); break;
      case "--model": f.model = argv[++i]; break;
      case "--no-code-mode": f.codeMode = false; break;
      case "--output": f.outputFormat = argv[++i] as "json" | "markdown"; break; // Handle output format
      case "--quiet": f.quiet = true; break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
      default:
        rest.push(a);
    }
  }
  f.problem = rest.join(" ").trim();
  return f;
}

function printHelp() {
  console.log(`ADHD_Flow — a skill for coding agents

  Stop your agent from picking the first answer. Fans out many parallel
  divergent thoughts under different cognitive frames, scores them,
  prunes traps, and deepens the survivors. Tree-of-thought with pruning,
  built on the Claude Agent SDK.

USAGE
  adhd-flow "<problem>" [flags]

FLAGS
  --frames N        number of parallel divergence branches (default 5)
  --ideas N         ideas per branch (default 6)
  --top N           how many to deepen / focus on (default 3)
  --concurrency N   max parallel LLM calls (default 4)
  --context PATH    file to inject as context (code, constraints, stack)
  --model NAME      override the SDK model
  --no-code-mode    don't bias frames toward engineering
  --output FORMAT   output format: json or markdown (default markdown)
  --quiet           suppress progress events
  -h, --help

EXAMPLES
  adhd-flow "design a rate limiter that survives a leader election"
  adhd-flow "name this function" --frames 3 --ideas 8 --top 2
  adhd-flow "..." --context ./snippet.ts --output json > out.json
`);
}

async function main() {
  const flags = parse(process.argv.slice(2));
  if (!flags.problem) { printHelp(); process.exit(1); }

  const onEvent = flags.quiet ? undefined : (e: RunEvent) => {
    switch (e.kind) {
      case "frame:start": process.stderr.write(`  ▸ ${e.frameLabel}…\n`); break;
      case "frame:done":  process.stderr.write(`    ${e.count} ideas (${e.frameId})\n`); break;
      case "score:done":  process.stderr.write(`  scored ${e.total} ideas\n`); break;
      case "cluster:done":process.stderr.write(`  ${e.clusters} clusters\n`); break;
      case "deepen:start":process.stderr.write(`  ◎ focus → ${e.text}\n`); break;
      case "warn":        process.stderr.write(`  ! ${e.message}\n`); break;
    }
  };

  const opts: RunOptions = {
    problem: flags.problem,
    context: flags.context,
    framesPerRun: flags.frames,
    ideasPerFrame: flags.ideas,
    topK: flags.top,
    concurrency: flags.concurrency,
    codeMode: flags.codeMode,
    model: flags.model,
    onEvent,
  };

  const result = await run(opts);

  if (flags.outputFormat === "json") {
    process.stdout.write(renderJson(result) + "\n");
  } else {
    process.stdout.write(renderMarkdown(result) + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});