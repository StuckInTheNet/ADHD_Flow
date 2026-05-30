// Tree-of-thought engine with pruning.
//
// The Steve-Jobs "connecting the dots" loop:
//   1. Diverge wide — fan out N parallel branches, each running under a
//      different cognitive frame. No critic, no cross-talk. ADHD-mode.
//   2. Score every leaf on novelty / viability / fit.
//   3. Cluster — surface the SHAPE of the idea space, not just the leaves.
//   4. Prune to top-K and DEEPEN those by recursive expansion. This is
//      where the agent "focuses" — connecting one dot to many others.
//   5. Pick the non-obvious-but-viable one. Flag traps. Provoke once.
//
// Convergence happens after divergence, never during.

import pLimit from "p-limit";
import { randomUUID } from "node:crypto";
import { divergeBranch } from "./divergence.js";
import { scoreIdeas } from "./scoring.js";
import { clusterIdeas } from "./clustering.js";
import { deepenIdea } from "./deepening.js";
import { redTeamIdea } from "./red-teaming.js";
import { frameRegistry } from "./frames.js"; // Use the new frame registry
import type {
  Branch,
  Cluster,
  DeepenedIdea,
  Idea,
  RunOptions,
  RunResult,
  Score,
} from "./types.js";

export async function run(opts: RunOptions): Promise<RunResult> {
  const {
    problem,
    context,
    framesPerRun = 5,
    ideasPerFrame = 6,
    topK = 3,
    concurrency = 4,
    codeMode = true,
    model,
    scoringWeights,
    onEvent,
  } = opts;

  const frames = frameRegistry.selectFrames(framesPerRun, codeMode); // Use frameRegistry
  const limit = pLimit(concurrency);

  // PHASE 1 — DIVERGE. Pure parallel fan-out. No branch sees another.
  const branches = await Promise.all(
    frames.map((f) =>
      limit(async () => {
        onEvent?.({ kind: "frame:start", frameId: f.id, frameLabel: f.label });
        const b = await divergeBranch(problem, context, f, ideasPerFrame, model);
        onEvent?.({ kind: "frame:done", frameId: f.id, count: b.ideas.length });
        return b;
      }),
    ),
  );

  const allIdeas: Idea[] = branches.flatMap((b) => b.ideas);

  // PHASE 2 — SCORE + CLUSTER. Critic comes back online.
  const [scoreMap, clusters] = await Promise.all([
    scoreIdeas(problem, allIdeas, model, scoringWeights),
    clusterIdeas(problem, allIdeas, model),
  ]);
  for (const i of allIdeas) i.score = scoreMap.get(i.id);
  // Stamp cluster label onto each idea for nicer rendering.
  for (const c of clusters) for (const id of c.ideaIds) {
    const idea = allIdeas.find((x) => x.id === id);
    if (idea) idea.cluster = c.label;
  }
  onEvent?.({ kind: "score:done", total: allIdeas.length });
  onEvent?.({ kind: "cluster:done", clusters: clusters.length });

  // Shortlist: top by total, excluding traps. Traps reported separately.
  const traps = allIdeas.filter((i) => i.score?.trap);
  const ranked = allIdeas
    .filter((i) => i.score && !i.score.trap)
    .sort((a, b) => (b.score!.total - a.score!.total));
  const shortlist = ranked.slice(0, Math.max(2, Math.min(4, topK + 1)));

  // Non-obvious pick = highest novelty among the viable shortlist.
  const nonObviousPick =
    shortlist.length === 0
      ? null
      : [...shortlist].sort(
          (a, b) =>
            (b.score!.novelty + b.score!.viability * 0.5) -
            (a.score!.novelty + a.score!.viability * 0.5),
        )[0];

  // PHASE 3 — FOCUS / DEEPEN top-K. This is the "connecting the dots" pass.
  const toDeepen = ranked.slice(0, topK);
  const deepened = await Promise.all(
    toDeepen.map((idea) =>
      limit(async () => {
        onEvent?.({ kind: "deepen:start", ideaId: idea.id, text: idea.text });
        const [d, redTeamCritique] = await Promise.all([
          deepenIdea(problem, idea, allIdeas, model),
          redTeamIdea(problem, idea, model),
        ]);
        d.redTeamCritique = redTeamCritique;
        onEvent?.({ kind: "deepen:done", ideaId: idea.id });
        return d;
      }),
    ),
  );

  // One provocation = a wild-tagged frame's lowest-scoring-but-highest-novelty leaf,
  // reframed as a question. Cheap, doesn't need another LLM call.
  const wildcard = allIdeas
    .filter((i) => i.score)
    .sort((a, b) => b.score!.novelty - a.score!.novelty)[0];
  const provocation = wildcard
    ? `What if we took this seriously: ${wildcard.text}`
    : "What's the assumption nobody named yet?";

  return {
    problem,
    branches,
    clusters,
    shortlist,
    nonObviousPick,
    traps,
    deepened,
    provocation,
  };
}
