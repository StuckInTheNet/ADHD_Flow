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
import { renderMarkdown, renderJson, renderYaml, renderGraphviz } from "./core/render.js"; // Updated path and function
import { renderHtml } from "./core/html-renderer.js"; // New import
import type { RunEvent, RunOptions } from "./core/types.js"; // Updated path

type Flags = {
  problem: string;
  context?: string;
  frames?: number;
  ideas?: number;
  top?: number;
  concurrency?: number;
  codeMode: boolean;
  outputFormat: "json" | "markdown" | "yaml" | "dot" | "html";
  quiet: boolean;
  model?: string;
  scoringSystemPrompt?: string;
  redTeamSystemPrompt?: string;
  githubOwner?: string; // New
  githubRepo?: string;  // New
  githubToken?: string; // New
  createIssueFromIdeaId?: string; // New
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
      case "--output": f.outputFormat = argv[++i] as "json" | "markdown" | "yaml" | "dot" | "html"; break; // Handle output format
      case "--scoring-prompt": f.scoringSystemPrompt = readFileSync(argv[++i], "utf8"); break; // New
      case "--red-team-prompt": f.redTeamSystemPrompt = readFileSync(argv[++i], "utf8"); break; // New
      case "--github-owner": f.githubOwner = argv[++i]; break; // New
      case "--github-repo": f.githubRepo = argv[++i]; break; // New
      case "--github-token": f.githubToken = argv[++i]; break; // New
      case "--create-issue-from-idea": f.createIssueFromIdeaId = argv[++i]; break; // New
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
  --output FORMAT   output format: json, markdown, yaml, dot, or html (default markdown)
  --scoring-prompt PATH file to inject as custom scoring system prompt
  --red-team-prompt PATH file to inject as custom red team system prompt
  --github-owner OWNER GitHub repository owner (for issue creation)
  --github-repo REPO   GitHub repository name (for issue creation)
  --github-token TOKEN GitHub Personal Access Token (for issue creation)
  --create-issue-from-idea ID Create GitHub issue from a specific idea ID
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
    scoringSystemPrompt: flags.scoringSystemPrompt, // New
    redTeamSystemPrompt: flags.redTeamSystemPrompt, // New
    onEvent,
  };

  const result = await run(opts);

  if (flags.createIssueFromIdeaId) {
    if (!flags.githubOwner || !flags.githubRepo || !flags.githubToken) {
      console.error("Error: --github-owner, --github-repo, and --github-token are required to create a GitHub issue.");
      process.exit(1);
    }
    const ideaToIssue = result.shortlist.find(i => i.id === flags.createIssueFromIdeaId) ||
                       result.deepened.find(d => d.ideaId === flags.createIssueFromIdeaId);
    if (!ideaToIssue) {
      console.error(`Error: Idea with ID "${flags.createIssueFromIdeaId}" not found.`);
      process.exit(1);
    }
    const issueUrl = await createGitHubIssue(
      ideaToIssue,
      flags.githubOwner,
      flags.githubRepo,
      flags.githubToken,
    );
    console.log(`GitHub Issue created: ${issueUrl}`);
  } else if (flags.outputFormat === "json") {
    process.stdout.write(renderJson(result) + "\n");
  } else if (flags.outputFormat === "yaml") {
    process.stdout.write(renderYaml(result) + "\n");
  } else if (flags.outputFormat === "dot") {
    process.stdout.write(renderGraphviz(result) + "\n");
  } else if (flags.outputFormat === "html") {
    process.stdout.write(renderHtml(result) + "\n");
  } else {
    process.stdout.write(renderMarkdown(result) + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});