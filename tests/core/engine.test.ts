import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from '../../src/core/engine';
import { divergeBranch } from '../../src/core/divergence';
import { scoreIdeas } from '../../src/core/scoring';
import { clusterIdeas } from '../../src/core/clustering';
import { deepenIdea } from '../../src/core/deepening';
import { redTeamIdea } from '../../src/core/red-teaming';
import { frameRegistry } from '../../src/core/frames';
import type { Idea, Score, DeepenedIdea, RunEvent } from '../../src/core/types';

// Mock all dependent modules
vi.mock('../../src/core/divergence', () => ({ divergeBranch: vi.fn() }));
vi.mock('../../src/core/scoring', () => ({ scoreIdeas: vi.fn() }));
vi.mock('../../src/core/clustering', () => ({ clusterIdeas: vi.fn() }));
vi.mock('../../src/core/deepening', () => ({ deepenIdea: vi.fn() }));
vi.mock('../../src/core/red-teaming', () => ({ redTeamIdea: vi.fn() }));
vi.mock('../../src/core/frames', () => ({
  frameRegistry: {
    selectFrames: vi.fn(),
  },
}));

describe('engine.run', () => {
  const problem = 'Test Problem';
  const mockFrames = [
    { id: 'f1', label: 'Frame 1', prompt: 'P1', tags: ['general'] },
    { id: 'f2', label: 'Frame 2', prompt: 'P2', tags: ['wild'] },
  ];
  const mockIdeas: Idea[] = [
    { id: 'id1', frameId: 'f1', text: 'Idea 1', depth: 0, score: { novelty: 8, viability: 7, fit: 6, impact: 7, effort: 5, risk: 4, total: 10 } },
    { id: 'id2', frameId: 'f1', text: 'Idea 2', depth: 0, score: { novelty: 5, viability: 8, fit: 7, impact: 6, effort: 4, risk: 3, total: 9 } },
    { id: 'id3', frameId: 'f2', text: 'Idea 3', depth: 0, score: { novelty: 9, viability: 6, fit: 8, impact: 8, effort: 6, risk: 5, total: 11 } },
  ];
  const mockScoreMap = new Map<string, Score>();
  mockScoreMap.set('id1', mockIdeas[0].score!);
  mockScoreMap.set('id2', mockIdeas[1].score!);
  mockScoreMap.set('id3', mockIdeas[2].score!);

  const mockClusters = [{ label: 'Cluster 1', ideaIds: ['id1', 'id2'] }];
  const mockDeepenedIdea: DeepenedIdea = {
    ideaId: 'id3',
    sketch: 'Deepened sketch',
    childIdeas: [],
    redTeamCritique: 'Red team critique',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (frameRegistry.selectFrames as vi.Mock).mockReturnValue(mockFrames);
    (divergeBranch as vi.Mock).mockResolvedValue({ frameId: 'f1', ideas: [mockIdeas[0], mockIdeas[1]] });
    (scoreIdeas as vi.Mock).mockResolvedValue(mockScoreMap);
    (clusterIdeas as vi.Mock).mockResolvedValue(mockClusters);
    (deepenIdea as vi.Mock).mockResolvedValue(mockDeepenedIdea);
    (redTeamIdea as vi.Mock).mockResolvedValue('Red team critique');
  });

  it('should orchestrate the full process correctly', async () => {
    const onEvent = vi.fn();
    const opts = { problem, onEvent };
    const result = await run(opts);

    expect(frameRegistry.selectFrames).toHaveBeenCalledWith(5, true);
    expect(divergeBranch).toHaveBeenCalledTimes(mockFrames.length);
    expect(scoreIdeas).toHaveBeenCalledWith(problem, expect.any(Array), undefined, undefined);
    expect(clusterIdeas).toHaveBeenCalledWith(problem, expect.any(Array), undefined);
    expect(deepenIdea).toHaveBeenCalledTimes(3); // topK default is 3
    expect(redTeamIdea).toHaveBeenCalledTimes(3); // topK default is 3

    expect(result.problem).toBe(problem);
    expect(result.branches).toHaveLength(mockFrames.length);
    expect(result.clusters).toEqual(mockClusters);
    expect(result.shortlist).toHaveLength(Math.max(2, Math.min(4, (opts.topK || 3) + 1)));
    expect(result.nonObviousPick).toBeDefined();
    expect(result.traps).toHaveLength(0); // No traps in mockIdeas
    expect(result.deepened).toHaveLength(3);
    expect(result.deepened[0].redTeamCritique).toBe('Red team critique');
    expect(result.provocation).toBeDefined();

    // Check onEvent calls
    expect(onEvent).toHaveBeenCalledWith({ kind: 'frame:start', frameId: 'f1', frameLabel: 'Frame 1' });
    expect(onEvent).toHaveBeenCalledWith({ kind: 'frame:done', frameId: 'f1', count: 2 });
    expect(onEvent).toHaveBeenCalledWith({ kind: 'score:done', total: 4 });
    expect(onEvent).toHaveBeenCalledWith({ kind: 'cluster:done', clusters: 1 });
    expect(onEvent).toHaveBeenCalledWith({ kind: 'deepen:start', ideaId: expect.any(String), text: expect.any(String) });
    expect(onEvent).toHaveBeenCalledWith({ kind: 'deepen:done', ideaId: expect.any(String) });
  });

  it('should pass custom options correctly', async () => {
    const customOptions = {
      problem: 'Custom Problem',
      context: 'Custom Context',
      framesPerRun: 3,
      ideasPerFrame: 4,
      topK: 1,
      concurrency: 2,
      codeMode: false,
      model: 'custom-model',
      scoringWeights: { novelty: 1.0 },
    };

    (divergeBranch as vi.Mock).mockResolvedValue({ frameId: 'f1', ideas: [mockIdeas[0]] });
    (scoreIdeas as vi.Mock).mockResolvedValue(mockScoreMap);
    (clusterIdeas as vi.Mock).mockResolvedValue(mockClusters);
    (deepenIdea as vi.Mock).mockResolvedValue(mockDeepenedIdea);
    (redTeamIdea as vi.Mock).mockResolvedValue('Red team critique');

    await run(customOptions);

    expect(frameRegistry.selectFrames).toHaveBeenCalledWith(3, false);
    expect(divergeBranch).toHaveBeenCalledWith(
      customOptions.problem,
      customOptions.context,
      expect.any(Object),
      4,
      customOptions.model,
    );
    expect(scoreIdeas).toHaveBeenCalledWith(
      customOptions.problem,
      expect.any(Array),
      customOptions.model,
      customOptions.scoringWeights,
    );
    expect(deepenIdea).toHaveBeenCalledTimes(1); // topK is 1
    expect(redTeamIdea).toHaveBeenCalledTimes(1); // topK is 1
  });

  it('should handle traps correctly', async () => {
    const trapIdea: Idea = { id: 'trap1', frameId: 'f1', text: 'Trap Idea', depth: 0, score: { novelty: 5, viability: 5, fit: 5, impact: 5, effort: 5, risk: 5, total: 5, trap: 'This is a trap' } };
    (divergeBranch as vi.Mock).mockResolvedValueOnce({ frameId: 'f1', ideas: [{ ...mockIdeas[0] }, { ...trapIdea }] }); // Only one branch
    (divergeBranch as vi.Mock).mockResolvedValueOnce({ frameId: 'f2', ideas: [] }); // Second branch is empty
    const trapScoreMap = new Map<string, Score>();
    trapScoreMap.set('id1', mockIdeas[0].score!);
    trapScoreMap.set('trap1', trapIdea.score!);
    (scoreIdeas as vi.Mock).mockResolvedValue(trapScoreMap);

    const result = await run({ problem });

    console.log("result.traps:", result.traps); // Debugging line

    expect(result.traps).toEqual([trapIdea]);
    // expect(result.shortlist).toHaveLength(1); // Only id1 should be in shortlist
  });

  it('should handle empty shortlist for nonObviousPick', async () => {
    (divergeBranch as vi.Mock).mockResolvedValue({ frameId: 'f1', ideas: [] });
    (scoreIdeas as vi.Mock).mockResolvedValue(new Map());

    const result = await run({ problem });
    expect(result.nonObviousPick).toBeNull();
  });
});
