import type { Idea, DeepenedIdea } from "../types.js";

export async function createNotionPage(
  idea: Idea | DeepenedIdea,
  databaseId: string,
  token: string,
): Promise<string> {
  const url = `https://api.notion.com/v1/pages`;
  const title = idea.text;
  let content = "";

  if ("sketch" in idea) {
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
      "Notion-Version": "2022-06-28", // Required Notion API version
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
        // Assuming a 'Description' rich_text property in Notion database
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

  const page = await response.json();

  if (response.ok) {
    return page.url;
  } else {
    throw new Error(
      `Failed to create Notion page: ${
        page.message || JSON.stringify(page)
      }`,
    );
  }
}