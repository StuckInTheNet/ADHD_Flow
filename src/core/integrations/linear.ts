import type { Idea, DeepenedIdea } from "../types.js";

export async function createLinearIssue(
  idea: Idea | DeepenedIdea,
  teamId: string,
  token: string,
): Promise<string> {
  const url = `https://api.linear.app/graphql`;
  const title = idea.text;
  let description = "";

  if ("sketch" in idea) {
    description = `**Deepened Idea:**\n${idea.sketch}\n\n`;
    if (idea.redTeamCritique) {
      description += `**Red Team Critique:**\n${idea.redTeamCritique}\n\n`;
    }
    if (idea.childIdeas && idea.childIdeas.length > 0) {
      description += `**Child Ideas:**\n`;
      idea.childIdeas.forEach((child) => {
        description += `- ${child.text} (${child.rationale || "no rationale"})\n`;
      });
    }
  } else {
    description = `**Idea:**\n${idea.text}\n\n`;
    if (idea.rationale) {
      description += `**Rationale:**\n${idea.rationale}\n\n`;
    }
    if (idea.score) {
      description += `**Score:**\n`;
      description += `- Novelty: ${idea.score.novelty}\n`;
      description += `- Viability: ${idea.score.viability}\n`;
      description += `- Fit: ${idea.score.fit}\n`;
      description += `- Impact: ${idea.score.impact}\n`;
      description += `- Effort: ${idea.score.effort}\n`;
      description += `- Risk: ${idea.score.risk}\n`;
      description += `- Total: ${idea.score.total}\n`;
      if (idea.score.trap) {
        description += `**Trap:** ${idea.score.trap}\n`;
      }
    }
  }

  const query = `
    mutation IssueCreate($teamId: String!, $title: String!, $description: String) {
      issueCreate(
        input: {
          teamId: $teamId,
          title: $title,
          description: $description
        }
      ) {
        success
        issue {
          id
          title
          url
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { teamId, title, description },
    }),
  });

  const result = await response.json();

  if (response.ok && result.data?.issueCreate?.success) {
    return result.data.issueCreate.issue.url;
  } else {
    throw new Error(
      `Failed to create Linear issue: ${
        result.errors ? JSON.stringify(result.errors) : response.statusText
      }`,
    );
  }
}