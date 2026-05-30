import { callLLM, parseJSON } from "./llm.js";
import type { Idea, Score, ScoringWeights } from "./types.js";

const SCORE_SYSTEM = `You are in CONVERGENT mode. You are now the critic.
Score each idea on six axes 0-10:
- novelty: distance from the obvious default solution
- viability: could this actually ship / work in practice
- fit: how directly it addresses the stated problem
- impact: significance if successful
- effort: effort to implement
- risk: potential downsides
If the idea looks attractive but is a TRAP (hidden cost, false economy,
will-not-scale, premature abstraction), set "trap" to a one-line reason.
Otherwise omit "trap".
Output JSON only.`;

export async function scoreIdeas(
  problem: string,
  ideas: Idea[],
  model: string | undefined,
  scoringWeights: ScoringWeights | undefined,
  systemPrompt: string | undefined, // New parameter
): Promise<Map<string, Score>> {
  if (ideas.length === 0) return new Map();

  const userPrompt = `PROBLEM:
${problem}

IDEAS (id → text):
${ideas.map((i) => `${i.id} :: ${i.text}`).join("\n")}

Score each. Output JSON array:
[{"id":"...","novelty":0-10,"viability":0-10,"fit":0-10,"impact":0-10,"effort":0-10,"risk":0-10,"trap":"... or omit"}]`;

  let raw: string;
  try {
    raw = await callLLM({
      model,
      systemPrompt: systemPrompt || SCORE_SYSTEM, // Use configurable prompt
      userPrompt,
    });
  } catch (error) {
    return new Map();
  }

  type Row = { id: string; novelty: number; viability: number; fit: number; impact: number; effort: number; risk: number; trap?: string };
  let rows: Row[];
  try {
    rows = parseJSON<Row[]>(raw);
  } catch {
    return new Map();
  }

  const out = new Map<string, Score>();
  const weights = {
    novelty: 0.2,
    viability: 0.3,
    fit: 0.2,
    impact: 0.2,
    effort: -0.1,
    risk: -0.1,
    ...scoringWeights,
  };

  for (const r of rows) {
    const total =
      r.novelty * weights.novelty +
      r.viability * weights.viability +
      r.fit * weights.fit +
      r.impact * weights.impact +
      r.effort * weights.effort +
      r.risk * weights.risk;
    out.set(r.id, {
      novelty: r.novelty,
      viability: r.viability,
      fit: r.fit,
      impact: r.impact,
      effort: r.effort,
      risk: r.risk,
      total,
      trap: r.trap,
    });
  }
  return out;
}
