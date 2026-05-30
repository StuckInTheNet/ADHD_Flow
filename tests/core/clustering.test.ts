import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clusterIdeas } from '../../src/core/clustering';
import { callLLM } from '../../src/core/llm';
import type { Idea, Cluster } from '../../src/core/types';

// Mock the callLLM function
vi.mock('../../src/core/llm', () => ({
  callLLM: vi.fn(),
  parseJSON: vi.fn((jsonString) => JSON.parse(jsonString)),
}));

describe('clusterIdeas', () => {
  const problem = 'Test Problem';
  const mockIdeas: Idea[] = [
    { id: 'id1', frameId: 'f1', text: 'Idea 1', depth: 0 },
    { id: 'id2', frameId: 'f1', text: 'Idea 2', depth: 0 },
    { id: 'id3', frameId: 'f2', text: 'Idea 3', depth: 0 },
  ];
  const model = 'test-model';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an empty array if no ideas are provided', async () => {
    const result = await clusterIdeas(problem, [], model);
    expect(result).toEqual([]);
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('should call LLM with correct system and user prompts', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce(
      `[
        {"label":"Cluster 1","ideaIds":["id1","id2"]},
        {"label":"Cluster 2","ideaIds":["id3"]}
      ]`,
    );

    await clusterIdeas(problem, mockIdeas, model);

    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(callLLM).toHaveBeenCalledWith({
      model,
      systemPrompt: expect.stringContaining('You group ideas into 3-6 clusters'),
      userPrompt: expect.stringContaining(`PROBLEM:\n${problem}\n\nIDEAS:\nid1 :: Idea 1\nid2 :: Idea 2\nid3 :: Idea 3`),
    });
  });

  it('should correctly parse LLM output and return Cluster objects', async () => {
    const mockLLMOutput = `[
      {"label":"Cluster 1","ideaIds":["id1","id2"]},
      {"label":"Cluster 2","ideaIds":["id3"]}
    ]`;
    (callLLM as vi.Mock).mockResolvedValueOnce(mockLLMOutput);

    const result = await clusterIdeas(problem, mockIdeas, model);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: 'Cluster 1', ideaIds: ['id1', 'id2'] });
    expect(result[1]).toEqual({ label: 'Cluster 2', ideaIds: ['id3'] });
  });

  it('should return an empty array if LLM output is invalid JSON', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce('invalid json');

    const result = await clusterIdeas(problem, mockIdeas, model);
    expect(result).toEqual([]);
  });

  it('should return an empty array if LLM call fails', async () => {
    (callLLM as vi.Mock).mockRejectedValueOnce(new Error('LLM error'));

    const result = await clusterIdeas(problem, mockIdeas, model);
    expect(result).toEqual([]);
  });
});