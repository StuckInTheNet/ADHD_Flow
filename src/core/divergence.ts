import { randomUUID } from "node:crypto";
import { callLLM, parseJSON } from "./llm.js";
import type { Branch, Idea, Frame } from "./types.js";

const DIVERGE_SYSTEM = `You are in DIVERGENT mode. You are a generator, not a critic.
Rules:
- Output a JSON array only. No prose before/after.
- Generate the requested number of distinct ideas.
- Each idea is a SHORT phrase or single sentence. No paragraphs.
- Push past the obvious. The first 3 ideas you'd think of are banned —
  assume the reader already had those. Aim for the awkward middle.
- Bad, weird, and absurd ideas are welcome; they seed better ones.
- Do not evaluate, hedge, or rank. Just generate.`;

export async function divergeBranch(
  problem: string,
  context: string | undefined,
  frame: Frame,
  ideasPerFrame: number,
  model: string | undefined,
): Promise<Branch> {
  const userPrompt = `PROBLEM:
${problem}

${context ? `CONTEXT:\n${context}\n\n` : ""}FRAME — ${frame.label}:
${frame.prompt}

Generate ${ideasPerFrame} ideas under this frame.
Output JSON array: [{"text": "...", "rationale": "..."}]
- text: one phrase/sentence, the idea itself
- rationale: 1 short clause on why this frame surfaces it (optional)`;

  const raw = await callLLM({
    model,
    systemPrompt: DIVERGE_SYSTEM,
    userPrompt,
  });

  type Row = { text: string; rationale?: string };
  let rows: Row[];
  try {
    rows = parseJSON<Row[]>(raw);
  } catch {
    return { frameId: frame.id, ideas: [] };
  }

  const ideas: Idea[] = rows.map((r) => ({
    id: randomUUID(),
    frameId: frame.id,
    text: r.text,
    rationale: r.rationale,
    depth: 0,
  }));
  return { frameId: frame.id, ideas };
}
