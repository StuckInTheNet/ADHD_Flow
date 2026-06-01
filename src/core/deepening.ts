import { randomUUID } from "node:crypto";
import { callLLM, parseJSON } from "./llm.js";
import type { Idea, DeepenedIdea } from "./types.js";

const DEEPEN_SYSTEM = `You are in FOCUS mode. Take one promising idea and connect dots:
- Sketch how it would actually work (4-8 sentences).
- Name the load-bearing risk.
- Name the first concrete step a coder would take.
- Then generate 3-5 sub-ideas that branch off this one (variations,
  combinations with other domains, things this unlocks).
Output JSON only.`;

export async function deepenIdea(
  problem: string,
  idea: Idea,
  siblings: Idea[],
  model: string | undefined,
): Promise<DeepenedIdea> {
  const userPrompt = `PROBLEM:
${problem}

FOCUS IDEA:
${idea.text}
${idea.rationale ? `(${idea.rationale})` : ""}

SIBLING IDEAS (use for recombination if useful):
${siblings
  .filter((s) => s.id !== idea.id)
  .slice(0, 12)
  .map((s) => `- ${s.text}`)
  .join("\n")}

Output JSON:
{
  "sketch": "4-8 sentences. How it works. Load-bearing risk. First concrete step.",
  "childIdeas": [
    {"text": "...", "rationale": "variation / hybrid / unlock"}
  ]
}`;

  let raw: string;
  try {
    raw = await callLLM({
      model,
      systemPrompt: DEEPEN_SYSTEM,
      userPrompt,
    });
  } catch (error) {
    process.stderr.write(`  ! deepen failed for idea "${idea.text.slice(0, 50)}": ${error instanceof Error ? error.message : error}\n`);
    return { ideaId: idea.id, sketch: "(deepen pass failed)", childIdeas: [] };
  }

  type Out = { sketch: string; childIdeas: { text: string; rationale?: string }[] };
  let parsed: Out;
  try {
    parsed = parseJSON<Out>(raw);
  } catch {
    process.stderr.write(`  ! deepen parse failed for idea "${idea.text.slice(0, 50)}" — raw response was not valid JSON\n`);
    return { ideaId: idea.id, sketch: "(deepen parse failed)", childIdeas: [] };
  }

  const childIdeas: Idea[] = parsed.childIdeas.map((c) => ({
    id: randomUUID(),
    frameId: idea.frameId,
    text: c.text,
    rationale: c.rationale,
    depth: idea.depth + 1,
    parentId: idea.id,
  }));

  return { ideaId: idea.id, sketch: parsed.sketch, childIdeas };
}
