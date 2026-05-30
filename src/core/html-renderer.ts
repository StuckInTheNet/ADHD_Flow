import type { RunResult } from "./types.js";

export function renderHtml(result: RunResult): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADHD_Flow Report for "${result.problem}"</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; margin: 20px; background-color: #f4f4f4; color: #333; }
        .container { max-width: 900px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        pre { background: #eee; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .idea-card { background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 10px; }
        .idea-card h3 { margin-top: 0; color: #555; }
        .score { font-size: 0.9em; color: #666; }
        .trap { color: red; font-weight: bold; }
        .red-team { color: #8B0000; font-style: italic; }
        .cluster-card { background: #e6f7ff; border: 1px solid #b3e0ff; border-radius: 5px; padding: 10px; margin-bottom: 10px; }
        .cluster-card h3 { margin-top: 0; color: #0056b3; }
        .provocation { background: #fffacd; border: 1px solid #ffeb3b; border-radius: 5px; padding: 15px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>ADHD_Flow Analysis for "${result.problem}"</h1>

        <h2>Shortlist of Ideas</h2>
        ${result.shortlist.map((idea, index) => `
            <div class="idea-card">
                <h3>${index + 1}. ${idea.text}</h3>
                <p class="score">Novelty: ${idea.score?.novelty}, Viability: ${idea.score?.viability}, Fit: ${idea.score?.fit}, Impact: ${idea.score?.impact}, Effort: ${idea.score?.effort}, Risk: ${idea.score?.risk}</p>
                ${idea.rationale ? `<p><em>Rationale: ${idea.rationale}</em></p>` : ''}
                ${idea.cluster ? `<p><em>Cluster: ${idea.cluster}</em></p>` : ''}
            </div>
        `).join('')}

        ${result.nonObviousPick ? `
        <h2>Non-obvious Pick</h2>
        <div class="idea-card">
            <h3>${result.nonObviousPick.text}</h3>
            <p class="score">Novelty: ${result.nonObviousPick.score?.novelty}, Viability: ${result.nonObviousPick.score?.viability}, Fit: ${result.nonObviousPick.score?.fit}, Impact: ${result.nonObviousPick.score?.impact}, Effort: ${result.nonObviousPick.score?.effort}, Risk: ${result.nonObviousPick.score?.risk}</p>
            ${result.nonObviousPick.rationale ? `<p><em>Rationale: ${result.nonObviousPick.rationale}</em></p>` : ''}
        </div>
        ` : ''}

        ${result.deepened.length > 0 ? `
        <h2>Deepened Ideas</h2>
        ${result.deepened.map((deepenedIdea, index) => {
            const originalIdea = result.shortlist.find(idea => idea.id === deepenedIdea.ideaId);
            return `
                <div class="idea-card">
                    <h3>${index + 1}. ${originalIdea ? originalIdea.text : 'Deepened Idea'}</h3>
                    <p><strong>Sketch:</strong> ${deepenedIdea.sketch}</p>
                    ${deepenedIdea.redTeamCritique ? `<p class="red-team"><strong>Red Team Critique:</strong> ${deepenedIdea.redTeamCritique}</p>` : ''}
                    ${deepenedIdea.childIdeas.length > 0 ? `
                        <p><strong>Child Ideas:</strong></p>
                        <ul>
                            ${deepenedIdea.childIdeas.map(childIdea => `<li>${childIdea.text} (${childIdea.rationale})</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `;
        }).join('')}
        ` : ''}

        ${result.traps.length > 0 ? `
        <h2>Potential Traps</h2>
        ${result.traps.map((trap, index) => `
            <div class="idea-card trap">
                <h3>${index + 1}. ${trap.text}</h3>
                ${trap.score?.trap ? `<p><em>Reason: ${trap.score.trap}</em></p>` : ''}
            </div>
        `).join('')}
        ` : ''}

        ${result.clusters.length > 0 ? `
        <h2>Idea Clusters</h2>
        ${result.clusters.map(cluster => `
            <div class="cluster-card">
                <h3>${cluster.label}</h3>
                <ul>
                    ${cluster.ideaIds.map(ideaId => {
                        const idea = result.branches.flatMap(b => b.ideas).find(i => i.id === ideaId);
                        return idea ? `<li>${idea.text}</li>` : '';
                    }).join('')}
                </ul>
            </div>
        `).join('')}
        ` : ''}

        ${result.provocation ? `
        <div class="provocation">
            <h2>Provocation</h2>
            <p>${result.provocation}</p>
        </div>
        ` : ''}
    </div>
</body>
</html>
`;
  return html;
}
