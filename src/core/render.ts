import type { RunResult } from "./types.js";

export function renderMarkdown(result: RunResult): string {
  let markdown = `# ADHD_Flow Analysis for "${result.problem}"\n\n`;

  // Shortlist
  markdown += `## Shortlist of Ideas\n\n`;
  result.shortlist.forEach((idea, index) => {
    markdown += `${index + 1}. **${idea.text}** [N${idea.score?.novelty} V${idea.score?.viability} F${idea.score?.fit} I${idea.score?.impact} E${idea.score?.effort} R${idea.score?.risk}]\n`;
    if (idea.rationale) {
      markdown += `   *Rationale: ${idea.rationale}*\n`;
    }
    if (idea.cluster) {
      markdown += `   *Cluster: ${idea.cluster}*\n`;
    }
    markdown += `\n`;
  });

  // Non-obvious Pick
  if (result.nonObviousPick) {
    markdown += `## Non-obvious Pick\n\n`;
    markdown += `**${result.nonObviousPick.text}** [N${result.nonObviousPick.score?.novelty} V${result.nonObviousPick.score?.viability} F${result.nonObviousPick.score?.fit} I${result.nonObviousPick.score?.impact} E${result.nonObviousPick.score?.effort} R${result.nonObviousPick.score?.risk}]\n`;
    if (result.nonObviousPick.rationale) {
      markdown += `*Rationale: ${result.nonObviousPick.rationale}*\n`;
    }
    markdown += `\n`;
  }

  // Deepened Ideas
  if (result.deepened.length > 0) {
    markdown += `## Deepened Ideas\n\n`;
    result.deepened.forEach((deepenedIdea, index) => {
      const originalIdea = result.shortlist.find(
        (idea) => idea.id === deepenedIdea.ideaId,
      );
      if (originalIdea) {
        markdown += `### ${index + 1}. ${originalIdea.text}\n\n`;
      }
      markdown += `**Sketch:** ${deepenedIdea.sketch}\n\n`;
      if (deepenedIdea.redTeamCritique) {
        markdown += `**Red Team Critique:** ${deepenedIdea.redTeamCritique}\n\n`;
      }
      if (deepenedIdea.childIdeas.length > 0) {
        markdown += `**Child Ideas:**\n`;
        deepenedIdea.childIdeas.forEach((childIdea) => {
          markdown += `*   ${childIdea.text} (*${childIdea.rationale}*)\n`;
        });
        markdown += `\n`;
      }
    });
  }

  // Potential Traps
  if (result.traps.length > 0) {
    markdown += `## Potential Traps\n\n`;
    result.traps.forEach((trap, index) => {
      markdown += `${index + 1}. **${trap.text}**\n`;
      if (trap.score?.trap) {
        markdown += `   *Reason: ${trap.score.trap}*\n`;
      }
      markdown += `\n`;
    });
  }

  // Clusters
  if (result.clusters.length > 0) {
    markdown += `## Idea Clusters\n\n`;
    result.clusters.forEach((cluster) => {
      markdown += `### ${cluster.label}\n`;
      cluster.ideaIds.forEach((ideaId) => {
        const idea = result.branches.flatMap(b => b.ideas).find(i => i.id === ideaId);
        if (idea) {
          markdown += `*   ${idea.text}\n`;
        }
      });
      markdown += `\n`;
    });
  }

  // Provocation
  if (result.provocation) {
    markdown += `## Provocation\n\n`;
    markdown += `${result.provocation}\n\n`;
  }

  return markdown;
}

export function renderJson(result: RunResult): string {
  return JSON.stringify(result, null, 2);
}