import * as yaml from 'js-yaml'; // Import js-yaml
import type { RunResult } from "./types.js";

export function renderMarkdown(result: RunResult): string {
  let markdown = `# ADHD Flow Analysis for "${result.problem}"\n\n`;

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

export function renderYaml(result: RunResult): string {
  return yaml.dump(result);
}

function dotEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export function renderGraphviz(result: RunResult): string {
  let dot = `digraph ADHD_Flow {\n`;
  dot += `  rankdir=LR;\n`;
  dot += `  node [shape=box, style="rounded,filled", fillcolor="#e0e0e0", fontname="Helvetica"];\n`;
  dot += `  edge [fontname="Helvetica", fontsize=10];\n\n`;

  dot += `  subgraph cluster_problem {\n`;
  dot += `    label="Problem";\n`;
  dot += `    style="filled";\n`;
  dot += `    fillcolor="#d0e0f0";\n`;
  dot += `    problem [label="${dotEscape(result.problem)}", shape=oval, fillcolor="#a0c0e0"];\n`;
  dot += `  }\n\n`;

  // Ideas and their scores
  result.shortlist.forEach((idea) => {
    dot += `  "${idea.id}" [label="${dotEscape(idea.text)}\\n(N:${idea.score?.novelty} V:${idea.score?.viability} F:${idea.score?.fit} I:${idea.score?.impact} E:${idea.score?.effort} R:${idea.score?.risk})", fillcolor="#f0f0f0"];\n`;
    dot += `  problem -> "${idea.id}" [label="shortlist"];\n`;
  });

  if (result.nonObviousPick) {
    dot += `  "${result.nonObviousPick.id}" [label="${dotEscape(result.nonObviousPick.text)}\\n(Non-obvious Pick)", fillcolor="#c0f0c0"];\n`;
    dot += `  problem -> "${result.nonObviousPick.id}" [label="non-obvious"];\n`;
  }

  result.deepened.forEach((deepenedIdea) => {
    dot += `  "${deepenedIdea.ideaId}_deepened" [label="Deepened: ${dotEscape(deepenedIdea.sketch)}", shape=note, fillcolor="#f8f8f8"];\n`;
    dot += `  "${deepenedIdea.ideaId}" -> "${deepenedIdea.ideaId}_deepened" [label="deepened"];\n`;

    if (deepenedIdea.redTeamCritique) {
      dot += `  "${deepenedIdea.ideaId}_redteam" [label="Red Team: ${dotEscape(deepenedIdea.redTeamCritique)}", shape=note, fillcolor="#f8d0d0"];\n`;
      dot += `  "${deepenedIdea.ideaId}" -> "${deepenedIdea.ideaId}_redteam" [label="critique"];\n`;
    }

    deepenedIdea.childIdeas.forEach((childIdea) => {
      dot += `  "${childIdea.id}" [label="${dotEscape(childIdea.text)}", fillcolor="#f0f0f0", fontsize=9];\n`;
      dot += `  "${deepenedIdea.ideaId}_deepened" -> "${childIdea.id}" [label="child idea"];\n`;
    });
  });

  result.traps.forEach((trap) => {
    dot += `  "${trap.id}" [label="TRAP: ${dotEscape(trap.text)}\\n(${dotEscape(trap.score?.trap ?? "")})", fillcolor="#ffcccc", fontcolor="red"];\n`;
    dot += `  problem -> "${trap.id}" [label="trap"];\n`;
  });

  result.clusters.forEach((cluster) => {
    dot += `  subgraph cluster_${cluster.label.replace(/\W/g, '_')} {\n`;
    dot += `    label="${dotEscape(cluster.label)}";\n`;
    dot += `    style="filled";\n`;
    dot += `    fillcolor="#f0f8ff";\n`;
    cluster.ideaIds.forEach((ideaId) => {
      // Ensure idea nodes are defined before referencing in subgraph
      const idea = result.branches.flatMap(b => b.ideas).find(i => i.id === ideaId);
      if (idea) {
        dot += `    "${idea.id}";\n`;
      }
    });
    dot += `  }\n`;
  });

  if (result.provocation) {
    dot += `  provocation [label="Provocation: ${dotEscape(result.provocation)}", shape=diamond, fillcolor="#ffffcc"];\n`;
    dot += `  problem -> provocation [label="provokes"];\n`;
  }

  dot += `}\n`;
  return dot;
}