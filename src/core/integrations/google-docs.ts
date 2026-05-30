import type { Idea, DeepenedIdea } from "../types.js";
import { google } from "googleapis";

// This function will need to be called with an authenticated Google API client.
// For a real application, you'd handle OAuth2 flow to get the accessToken.
// For simplicity in this example, we assume a pre-authenticated client or a service account.
export async function createGoogleDoc(
  idea: Idea | DeepenedIdea,
  accessToken: string, // OAuth2 access token
): Promise<string> {
  const docs = google.docs({ version: "v1", auth: accessToken });

  const title = `ADHD_Flow Idea: ${idea.text}`;
  let content = "";

  if ("sketch" in idea) {
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

  // 1. Create a new blank document
  const createResponse = await docs.documents.create({
    requestBody: {
      title: title,
    },
  });

  const documentId = createResponse.data.documentId;
  if (!documentId) {
    throw new Error("Failed to create Google Doc: No document ID returned.");
  }

  // 2. Append content to the document
  const requests = [
    {
      insertText: {
        location: {
          endOfSegmentLocation: {}, // Appends to the end of the document body
        },
        text: content,
      },
    },
  ];

  await docs.documents.batchUpdate({
    documentId: documentId,
    requestBody: {
      requests: requests,
    },
  });

  return `https://docs.google.com/document/d/${documentId}/edit`;
}