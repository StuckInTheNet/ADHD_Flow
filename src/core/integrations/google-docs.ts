import type { Idea, DeepenedIdea } from "../types.js";
import { google } from "googleapis";

export async function createGoogleDoc(
  idea: Idea | DeepenedIdea,
  accessToken: string,
): Promise<string> {
  const docs = google.docs({ version: "v1", auth: accessToken });

  let title = "";
  let content = "";

  if ("sketch" in idea) {
    title = `ADHD_Flow Idea: ${idea.ideaId}`;
    content = `Deepened Idea:\n${idea.sketch}\n\n`;
    if (idea.redTeamCritique) {
      content += `Red Team Critique:\n${idea.redTeamCritique}\n\n`;
    }
    if (idea.childIdeas && idea.childIdeas.length > 0) {
      content += `Child Ideas:\n`;
      idea.childIdeas.forEach((child) => {
        content += `- ${child.text} (${child.rationale || "no rationale"})\n`;
      });
    }
  } else {
    title = `ADHD_Flow Idea: ${idea.text}`;
    content = `Idea:\n${idea.text}\n\n`;
    if (idea.rationale) {
      content += `Rationale:\n${idea.rationale}\n\n`;
    }
    if (idea.score) {
      content += `Score:\n`;
      content += `- Novelty: ${idea.score.novelty}\n`;
      content += `- Viability: ${idea.score.viability}\n`;
      content += `- Fit: ${idea.score.fit}\n`;
      content += `- Impact: ${idea.score.impact}\n`;
      content += `- Effort: ${idea.score.effort}\n`;
      content += `- Risk: ${idea.score.risk}\n`;
      content += `- Total: ${idea.score.total}\n`;
      if (idea.score.trap) {
        content += `Trap: ${idea.score.trap}\n`;
      }
    }
  }

  const createResponse = await docs.documents.create({
    requestBody: {
      title: title,
    },
  });

  const documentId = createResponse.data.documentId;
  if (!documentId) {
    throw new Error("Failed to create Google Doc: No document ID returned.");
  }

  await docs.documents.batchUpdate({
    documentId: documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: {
              index: 1,
            },
            text: content,
          },
        },
      ],
    },
  });

  return `https://docs.google.com/document/d/${documentId}/edit`;
}
