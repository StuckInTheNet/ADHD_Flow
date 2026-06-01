import type { Idea, DeepenedIdea } from "../types.js";

export async function postToSlack(
  idea: Idea | DeepenedIdea,
  channel: string,
  token: string,
): Promise<string> {
  const url = `https://slack.com/api/chat.postMessage`;
  let messageText = "";

  if ("sketch" in idea) {
    messageText = `*Deepened Idea:* ${idea.sketch}\n\n`;
    if (idea.redTeamCritique) {
      messageText += `*Red Team Critique:* ${idea.redTeamCritique}\n\n`;
    }
    if (idea.childIdeas && idea.childIdeas.length > 0) {
      messageText += `*Child Ideas:*\n`;
      idea.childIdeas.forEach((child) => {
        messageText += `- ${child.text} (${child.rationale || "no rationale"})\n`;
      });
    }
  } else {
    messageText = `*Idea:* ${idea.text}\n\n`;
    if (idea.rationale) {
      messageText += `*Rationale:* ${idea.rationale}\n\n`;
    }
    if (idea.score) {
      messageText += `*Score:*\n`;
      messageText += `- Novelty: ${idea.score.novelty}\n`;
      messageText += `- Viability: ${idea.score.viability}\n`;
      messageText += `- Fit: ${idea.score.fit}\n`;
      messageText += `- Impact: ${idea.score.impact}\n`;
      messageText += `- Effort: ${idea.score.effort}\n`;
      messageText += `- Risk: ${idea.score.risk}\n`;
      messageText += `- Total: ${idea.score.total}\n`;
      if (idea.score.trap) {
        messageText += `*Trap:* ${idea.score.trap}\n`;
      }
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: channel,
      text: messageText,
    }),
  });

  const result = (await response.json()) as Record<string, any>;

  if (response.ok && result.ok) {
    return result.message.permalink as string;
  } else {
    throw new Error(
      `Failed to post to Slack: ${
        result.error ? result.error : response.statusText
      }`,
    );
  }
}
