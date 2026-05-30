import type { Idea, DeepenedIdea } from "../types.js";

export async function createGitHubIssue(
  idea: Idea | DeepenedIdea,
  owner: string,
  repo: string,
  token: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
  const title = idea.text;
  let body = "";

  if ("sketch" in idea) {
    body = `**Deepened Idea:**\n${idea.sketch}\n\n`;
    if (idea.redTeamCritique) {
      body += `**Red Team Critique:**\n${idea.redTeamCritique}\n\n`;
    }
    if (idea.childIdeas && idea.childIdeas.length > 0) {
      body += `**Child Ideas:**\n`;
      idea.childIdeas.forEach((child) => {
        body += `- ${child.text} (${child.rationale || "no rationale"})\n`;
      });
    }
  } else {
    body = `**Idea:**\n${idea.text}\n\n`;
    if (idea.rationale) {
      body += `**Rationale:**\n${idea.rationale}\n\n`;
    }
    if (idea.score) {
      body += `**Score:**\n`;
      body += `- Novelty: ${idea.score.novelty}\n`;
      body += `- Viability: ${idea.score.viability}\n`;
      body += `- Fit: ${idea.score.fit}\n`;
      body += `- Impact: ${idea.score.impact}\n`;
      body += `- Effort: ${idea.score.effort}\n`;
      body += `- Risk: ${idea.score.risk}\n`;
      body += `- Total: ${idea.score.total}\n`;
      if (idea.score.trap) {
        body += `**Trap:** ${idea.score.trap}\n`;
      }
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ADHD_Flow", // GitHub API requires a User-Agent header
    },
    body: JSON.stringify({ title, body }),
  });

  const issue = await response.json();
  if (response.status === 201) {
    return issue.html_url;
  } else {
    throw new Error(
      `Failed to create GitHub issue: ${response.status} - ${
        issue.message || JSON.stringify(issue)
      }`,
    );
  }
}