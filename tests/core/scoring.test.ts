import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scoreIdeas } from '../../src/core/scoring';
import { callLLM } from '../../src/core/llm';
import type { Idea, Score, ScoringWeights } from '../../src/core/types';

// Mock the callLLM function
vi.mock('../../src/core/llm', () => ({
  callLLM: vi.fn(),
  parseJSON: vi.fn((jsonString) => JSON.parse(jsonString)),
}));

describe('scoreIdeas', () => {
  const problem = 'Test Problem';
  const mockIdeas: Idea[] = [
    { id: 'id1', frameId: 'f1', text: 'Idea 1', depth: 0 },
    { id: 'id2', frameId: 'f1', text: 'Idea 2', depth: 0 },
  ];
  const model = 'test-model';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an empty map if no ideas are provided', async () => {
    const result = await scoreIdeas(problem, [], model, undefined);
    expect(result.size).toBe(0);
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('should call LLM with correct system and user prompts', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce(
      `[
        {"id":"id1","novelty":5,"viability":7,"fit":8,"impact":6,"effort":4,"risk":3},
        {"id":"id2","novelty":6,"viability":5,"fit":7,"impact":7,"effort":5,"risk":4}
      ]`,
    );

    await scoreIdeas(problem, mockIdeas, model, undefined);

    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(callLLM).toHaveBeenCalledWith({
      model,
      systemPrompt: expect.stringContaining('CONVERGENT mode'),
      userPrompt: expect.stringContaining(`PROBLEM:\n${problem}\n\nIDEAS (id → text):\nid1 :: Idea 1\nid2 :: Idea 2`),
    });
  });

  it('should correctly parse LLM output and calculate scores with default weights', async () => {
    const mockLLMOutput = `[
      {"id":"id1","novelty":5,"viability":7,"fit":8,"impact":6,"effort":4,"risk":3},
      {"id":"id2","novelty":6,"viability":5,"fit":7,"impact":7,"effort":5,"risk":4}
    ]`;
    (callLLM as vi.Mock).mockResolvedValueOnce(mockLLMOutput);

    const result = await scoreIdeas(problem, mockIdeas, model, undefined);

    expect(result.size).toBe(2);
    const score1 = result.get('id1');
    const score2 = result.get('id2');

    expect(score1).toBeDefined();
    expect(score1?.novelty).toBe(5);
    expect(score1?.viability).toBe(7);
    expect(score1?.fit).toBe(8);
    expect(score1?.impact).toBe(6);
    expect(score1?.effort).toBe(4);
    expect(score1?.risk).toBe(3);
    // total = 5*0.2 + 7*0.3 + 8*0.2 + 6*0.2 - 4*0.1 - 3*0.1 = 1 + 2.1 + 1.6 + 1.2 - 0.4 - 0.3 = 5.2
    expect(score1?.total).toBeCloseTo(5.2);

    expect(score2).toBeDefined();
    expect(score2?.novelty).toBe(6);
    expect(score2?.viability).toBe(5);
    expect(score2?.fit).toBe(7);
    expect(score2?.impact).toBe(7);
    expect(score2?.effort).toBe(5);
    expect(score2?.risk).toBe(4);
    // total = 6*0.2 + 5*0.3 + 7*0.2 + 7*0.2 - 5*0.1 - 4*0.1 = 1.2 + 1.5 + 1.4 + 1.4 - 0.5 - 0.4 = 4.6
    expect(score2?.total).toBeCloseTo(4.6);
  });

  it('should correctly calculate scores with custom weights', async () => {
    const mockLLMOutput = `[
      {"id":"id1","novelty":5,"viability":7,"fit":8,"impact":6,"effort":4,"risk":3}
    ]`;
    (callLLM as vi.Mock).mockResolvedValueOnce(mockLLMOutput);

    const customWeights: ScoringWeights = {
      novelty: 0.5,
      viability: 0.1,
      fit: 0.1,
      impact: 0.1,
      effort: -0.1,
      risk: -0.1,
    };

    const result = await scoreIdeas(problem, [mockIdeas[0]], model, customWeights);
    const score1 = result.get('id1');

    expect(score1).toBeDefined();
    // total = 5*0.5 + 7*0.1 + 8*0.1 + 6*0.1 - 4*0.1 - 3*0.1 = 2.5 + 0.7 + 0.8 + 0.6 - 0.4 - 0.3 = 3.9
    expect(score1?.total).toBeCloseTo(3.9);
  });

  it('should handle ideas with traps', async () => {
    const mockLLMOutput = `[
      {"id":"id1","novelty":5,"viability":7,"fit":8,"impact":6,"effort":4,"risk":3,"trap":"Hidden cost"},
      {"id":"id2","novelty":6,"viability":5,"fit":7,"impact":7,"effort":5,"risk":4}
    ]`;
    (callLLM as vi.Mock).mockResolvedValueOnce(mockLLMOutput);

    const result = await scoreIdeas(problem, mockIdeas, model, undefined);
    const score1 = result.get('id1');
    expect(score1?.trap).toBe('Hidden cost');
  });

  it('should return an empty map if LLM output is invalid JSON', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce('invalid json');

    const result = await scoreIdeas(problem, mockIdeas, model, undefined);
    expect(result.size).toBe(0);
  });

  it('should return an empty map if LLM call fails', async () => {
    (callLLM as vi.Mock).mockRejectedValueOnce(new Error('LLM error'));

    const result = await scoreIdeas(problem, mockIdeas, model, undefined);
    expect(result.size).toBe(0);
  });
});