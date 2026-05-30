import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redTeamIdea } from '../../src/core/red-teaming';
import { callLLM } from '../../src/core/llm';
import type { Idea } from '../../src/core/types';

// Mock the callLLM function
vi.mock('../../src/core/llm', () => ({
  callLLM: vi.fn(),
  parseJSON: vi.fn((jsonString) => JSON.parse(jsonString)),
}));

describe('redTeamIdea', () => {
  const problem = 'Test Problem';
  const mockIdea: Idea = {
    id: 'idea1',
    frameId: 'f1',
    text: 'Main Idea',
    depth: 0,
  };
  const model = 'test-model';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call LLM with correct system and user prompts', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce('{"critique": "Critique text"}');

    await redTeamIdea(problem, mockIdea, model);

    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(callLLM).toHaveBeenCalledWith({
      model,
      systemPrompt: expect.stringContaining('You are a skeptical and experienced engineer'),
      userPrompt: expect.stringContaining(`PROBLEM:\n${problem}\n\nIDEA TO CRITIQUE:\n${mockIdea.text}`),
    });
  });

  it('should return a critique string from LLM output', async () => {
    const mockLLMOutput = '{"critique": "Critique text"}';
    (callLLM as vi.Mock).mockResolvedValueOnce(mockLLMOutput);

    const result = await redTeamIdea(problem, mockIdea, model);

    expect(result).toBe('Critique text');
  });

  it('should return a default message if LLM output is invalid JSON', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce('invalid json');

    const result = await redTeamIdea(problem, mockIdea, model);

    expect(result).toBe('(red team pass failed to parse)');
  });

  it('should return a default message if LLM call fails', async () => {
    (callLLM as vi.Mock).mockRejectedValueOnce(new Error('LLM error'));

    const result = await redTeamIdea(problem, mockIdea, model);

    expect(result).toBe('(red team pass failed to parse)');
  });
});