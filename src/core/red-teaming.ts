import { callLLM, parseJSON } from "./llm.js";
import type { Idea } from "./types.js";

const RED_TEAM_SYSTEM = `You are a skeptical and experienced engineer. Your job is to find all the reasons why this idea will fail. Be ruthless.
Output JSON only.
{"critique": "..."}
`;

export async function redTeamIdea(
  problem: string,
  idea: Idea,
  model: string | undefined,
): Promise<string> {
  const userPrompt = `PROBLEM:
${problem}

IDEA TO CRITIQUE:
${idea.text}

Find all the reasons why this idea will fail.
Output JSON: {"critique": "..."}`;

  const raw = await callLLM({
    model,
    systemPrompt: RED_TEAM_SYSTEM,
    userPrompt,
  });

  type Out = { critique: string };
  try {
    const parsed = parseJSON<Out>(raw);
    return parsed.critique;
  } catch {
    return "(red team pass failed to parse)";
  }
}
