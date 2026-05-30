import { callLLM, parseJSON } from "./llm.js";
import type { Idea, Cluster } from "./types.js";

const CLUSTER_SYSTEM = `You group ideas into 3-6 clusters by their UNDERLYING ANGLE
(not by surface keywords). Cluster labels name the angle, e.g.
"remove-the-server plays", "push-work-to-client plays", "cache-shaped plays".
Output JSON only.`;

export async function clusterIdeas(
  problem: string,
  ideas: Idea[],
  model: string | undefined,
): Promise<Cluster[]> {
  if (ideas.length === 0) return [];

  const userPrompt = `PROBLEM:
${problem}

IDEAS:
${ideas.map((i) => `${i.id} :: ${i.text}`).join("\n")}

Output JSON: [{"label":"...","ideaIds":["...","..."]}]`;

  const raw = await callLLM({
    model,
    systemPrompt: CLUSTER_SYSTEM,
    userPrompt,
  });

  try {
    return parseJSON<Cluster[]>(raw);
  } catch {
    return [];
  }
}
