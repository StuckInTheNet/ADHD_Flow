#!/usr/bin/env node
// CLI surface for ADHD Flow.
//
// Usage:
//   adhd-flow "how should we shard this queue?"
//   adhd-flow "..." --frames 6 --ideas 8 --top 4 --context ./CONTEXT.md
//   adhd-flow "..." --output json > result.json
//   adhd-flow "..." --output markdown > result.md

import { readFileSync, existsSync } from "node:fs";
import { run } from "./core/engine.js";
import { renderMarkdown, renderJson, renderYaml, renderGraphviz } from "./core/render.js"; // Updated path and function
import { renderHtml } from "./core/html-renderer.js"; // New import
import { createGitHubIssue } from "./core/integrations/github.js"; // New import
import { createLinearIssue } from "./core/integrations/linear.js"; // New import
import { createNotionPage } from "./core/integrations/notion.js"; // New import
import { createGoogleDoc } from "./core/integrations/google-docs.js"; // New import
import { postToSlack } from "./core/integrations/slack.js"; // New import
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
  githubOwner?: string;
  githubRepo?: string;
  githubToken?: string;
  createIssueFromIdeaId?: string;
  linearTeamId?: string;
  linearToken?: string;
  createLinearIssueFromIdeaId?: string;
  notionDatabaseId?: string;
  notionToken?: string;
  createNotionPageFromIdeaId?: string;
  googleDocsAccessToken?: string;
  createGoogleDocFromIdeaId?: string;
  slackChannel?: string;
  slackToken?: string;
  postToSlackFromIdeaId?: string;
};

function parsePositiveInt(flag: string, value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    console.error(`Error: ${flag} requires a positive integer, got "${value}"`);
    process.exit(1);
  }
  return n;
}

function readRequiredFile(flag: string, path: string): string {
  if (!path || !existsSync(path)) {
    console.error(`Error: ${flag} file not found: ${path}`);
    process.exit(1);
  }
  return readFileSync(path, "utf8");
}

const VALID_OUTPUT_FORMATS = new Set(["json", "markdown", "yaml", "dot", "html"]);

function parse(argv: string[]): Flags {
  const f: Flags = { problem: "", codeMode: true, outputFormat: "markdown", quiet: false };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--frames": f.frames = parsePositiveInt("--frames", argv[++i]); break;
      case "--ideas": f.ideas = parsePositiveInt("--ideas", argv[++i]); break;
      case "--top": f.top = parsePositiveInt("--top", argv[++i]); break;
      case "--concurrency": f.concurrency = parsePositiveInt("--concurrency", argv[++i]); break;
      case "--context": f.context = readRequiredFile("--context", argv[++i]); break;
      case "--model": f.model = argv[++i]; break;
      case "--no-code-mode": f.codeMode = false; break;
      case "--output": {
        const fmt = argv[++i];
        if (!VALID_OUTPUT_FORMATS.has(fmt)) {
          console.error(`Error: --output must be one of: ${[...VALID_OUTPUT_FORMATS].join(", ")}. Got "${fmt}"`);
          process.exit(1);
        }
        f.outputFormat = fmt as Flags["outputFormat"];
        break;
      }
      case "--scoring-prompt": f.scoringSystemPrompt = readRequiredFile("--scoring-prompt", argv[++i]); break;
      case "--red-team-prompt": f.redTeamSystemPrompt = readRequiredFile("--red-team-prompt", argv[++i]); break;
      case "--github-owner": f.githubOwner = argv[++i]; break;
      case "--github-repo": f.githubRepo = argv[++i]; break;
      case "--github-token": f.githubToken = argv[++i]; break;
      case "--create-issue-from-idea": f.createIssueFromIdeaId = argv[++i]; break;
      case "--linear-team-id": f.linearTeamId = argv[++i]; break;
      case "--linear-token": f.linearToken = argv[++i]; break;
      case "--create-linear-issue-from-idea": f.createLinearIssueFromIdeaId = argv[++i]; break;
      case "--notion-database-id": f.notionDatabaseId = argv[++i]; break;
      case "--notion-token": f.notionToken = argv[++i]; break;
      case "--create-notion-page-from-idea": f.createNotionPageFromIdeaId = argv[++i]; break;
      case "--google-docs-access-token": f.googleDocsAccessToken = argv[++i]; break;
      case "--create-google-doc-from-idea": f.createGoogleDocFromIdeaId = argv[++i]; break;
      case "--slack-channel": f.slackChannel = argv[++i]; break;
      case "--slack-token": f.slackToken = argv[++i]; break;
      case "--post-to-slack-from-idea": f.postToSlackFromIdeaId = argv[++i]; break;
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
  console.log(`ADHD Flow — a skill for coding agents

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
  --linear-team-id ID   Linear team ID (for issue creation)
  --linear-token TOKEN  Linear Personal Access Token (for issue creation)
  --create-linear-issue-from-idea ID Create Linear issue from a specific idea ID
  --notion-database-id ID Notion database ID (for page creation)
  --notion-token TOKEN  Notion Integration Token (for page creation)
  --create-notion-page-from-idea ID Create Notion page from a specific idea ID
  --google-docs-access-token TOKEN Google Docs OAuth2 Access Token (for doc creation)
  --create-google-doc-from-idea ID Create Google Doc from a specific idea ID
  --slack-channel CHANNEL Slack channel ID or name (for posting messages)
  --slack-token TOKEN   Slack Bot User OAuth Token (for posting messages)
  --post-to-slack-from-idea ID Post to Slack from a specific idea ID
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
    scoringSystemPrompt: flags.scoringSystemPrompt,
    redTeamSystemPrompt: flags.redTeamSystemPrompt,
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
  } else if (flags.createLinearIssueFromIdeaId) {
    if (!flags.linearTeamId || !flags.linearToken) {
      console.error("Error: --linear-team-id and --linear-token are required to create a Linear issue.");
      process.exit(1);
    }
    const ideaToIssue = result.shortlist.find(i => i.id === flags.createLinearIssueFromIdeaId) ||
                       result.deepened.find(d => d.ideaId === flags.createLinearIssueFromIdeaId);
    if (!ideaToIssue) {
      console.error(`Error: Idea with ID "${flags.createLinearIssueFromIdeaId}" not found.`);
      process.exit(1);
    }
    const issueUrl = await createLinearIssue(
      ideaToIssue,
      flags.linearTeamId,
      flags.linearToken,
    );
    console.log(`Linear Issue created: ${issueUrl}`);
  } else if (flags.createNotionPageFromIdeaId) {
    if (!flags.notionDatabaseId || !flags.notionToken) {
      console.error("Error: --notion-database-id and --notion-token are required to create a Notion page.");
      process.exit(1);
    }
    const ideaToPage = result.shortlist.find(i => i.id === flags.createNotionPageFromIdeaId) ||
                       result.deepened.find(d => d.ideaId === flags.createNotionPageFromIdeaId);
    if (!ideaToPage) {
      console.error(`Error: Idea with ID "${flags.createNotionPageFromIdeaId}" not found.`);
      process.exit(1);
    }
    const pageUrl = await createNotionPage(
      ideaToPage,
      flags.notionDatabaseId,
      flags.notionToken,
    );
    console.log(`Notion Page created: ${pageUrl}`);
  } else if (flags.createGoogleDocFromIdeaId) {
    if (!flags.googleDocsAccessToken) {
      console.error("Error: --google-docs-access-token is required to create a Google Doc.");
      process.exit(1);
    }
    const ideaToDoc = result.shortlist.find(i => i.id === flags.createGoogleDocFromIdeaId) ||
                      result.deepened.find(d => d.ideaId === flags.createGoogleDocFromIdeaId);
    if (!ideaToDoc) {
      console.error(`Error: Idea with ID "${flags.createGoogleDocFromIdeaId}" not found.`);
      process.exit(1);
    }
    const docUrl = await createGoogleDoc(
      ideaToDoc,
      flags.googleDocsAccessToken,
    );
    console.log(`Google Doc created: ${docUrl}`);
  } else if (flags.postToSlackFromIdeaId) {
    if (!flags.slackChannel || !flags.slackToken) {
      console.error("Error: --slack-channel and --slack-token are required to post to Slack.");
      process.exit(1);
    }
    const ideaToPost = result.shortlist.find(i => i.id === flags.postToSlackFromIdeaId) ||
                       result.deepened.find(d => d.ideaId === flags.postToSlackFromIdeaId);
    if (!ideaToPost) {
      console.error(`Error: Idea with ID "${flags.postToSlackFromIdeaId}" not found.`);
      process.exit(1);
    }
    const slackUrl = await postToSlack(
      ideaToPost,
      flags.slackChannel,
      flags.slackToken,
    );
    console.log(`Slack message posted: ${slackUrl}`);
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