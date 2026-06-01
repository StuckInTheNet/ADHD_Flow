import type { Idea, DeepenedIdea } from "../types.js";

export async function createNotionPage(
  idea: Idea | DeepenedIdea,
  databaseId: string,
  token: string,
): Promise<string> {
  const url = `https://api.notion.com/v1/pages`;
  let title = "";
  let content = "";

  if ("sketch" in idea) {
    title = `Deepened idea: ${idea.ideaId}`;
    content = `**Deepened Idea:**\n${idea.sketch}\n\n`;
    if (idea.redTeamCritique) {
      content += `**Red Team Critique:**\n${idea.redTeamCritique}\n\n`;
    }
    if (idea.childIdeas && idea.childIdeas.length > 0) {
      content += `**Child Ideas:**\n`;
      idea.childIdeas.forEach((child) => {
        content += `- ${child.text} (${child.rationale || "no rationale"})\n`;
      });
    }
  } else {
    title = idea.text;
    content = `**Idea:**\n${idea.text}\n\n`;
    if (idea.rationale) {
      content += `**Rationale:**\n${idea.rationale}\n\n`;
    }
    if (idea.score) {
      content += `**Score:**\n`;
      content += `- Novelty: ${idea.score.novelty}\n`;
      content += `- Viability: ${idea.score.viability}\n`;
      content += `- Fit: ${idea.score.fit}\n`;
      content += `- Impact: ${idea.score.impact}\n`;
      content += `- Effort: ${idea.score.effort}\n`;
      content += `- Risk: ${idea.score.risk}\n`;
      content += `- Total: ${idea.score.total}\n`;
      if (idea.score.trap) {
        content += `**Trap:** ${idea.score.trap}\n`;
      }
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: {
        database_id: databaseId,
      },
      properties: {
        Title: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
        Description: {
          rich_text: [
            {
              text: {
                content: content,
              },
            },
          ],
        },
      },
    }),
  });

  const page = (await response.json()) as Record<string, unknown>;

  if (response.ok) {
    return page.url as string;
  } else {
    throw new Error(
      `Failed to create Notion page: ${
        (page.message as string) || JSON.stringify(page)
      }`,
    );
  }
}
