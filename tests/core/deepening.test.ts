import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepenIdea } from '../../src/core/deepening';
import { callLLM } from '../../src/core/llm';
import type { Idea, DeepenedIdea } from '../../src/core/types';

// Mock the callLLM function
vi.mock('../../src/core/llm', () => ({
  callLLM: vi.fn(),
  parseJSON: vi.fn((jsonString) => JSON.parse(jsonString)),
}));

describe('deepenIdea', () => {
  const problem = 'Test Problem';
  const mockIdea: Idea = {
    id: 'idea1',
    frameId: 'f1',
    text: 'Main Idea',
    rationale: 'Main Rationale',
    depth: 0,
  };
  const mockSiblings: Idea[] = [
    { id: 'sib1', frameId: 'f1', text: 'Sibling 1', depth: 0 },
    { id: 'sib2', frameId: 'f2', text: 'Sibling 2', depth: 0 },
  ];
  const model = 'test-model';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call LLM with correct system and user prompts', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce(
      '{"sketch": "Sketch text", "childIdeas": [{"text": "Child 1", "rationale": "Var 1"}]}',
    );

    await deepenIdea(problem, mockIdea, mockSiblings, model);

    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(callLLM).toHaveBeenCalledWith({
      model,
      systemPrompt: expect.stringContaining('You are in FOCUS mode'),
      userPrompt: expect.stringContaining(`PROBLEM:\n${problem}\n\nFOCUS IDEA:\n${mockIdea.text}`),
    });
    expect(callLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining('SIBLING IDEAS (use for recombination if useful):\n- Sibling 1\n- Sibling 2'),
      }),
    );
  });

  it('should return a DeepenedIdea object with parsed sketch and child ideas', async () => {
    const mockLLMOutput = '{"sketch": "Sketch text", "childIdeas": [{"text": "Child 1", "rationale": "Var 1"}]}';
    (callLLM as vi.Mock).mockResolvedValueOnce(mockLLMOutput);

    const result = await deepenIdea(problem, mockIdea, mockSiblings, model);

    expect(result.ideaId).toBe(mockIdea.id);
    expect(result.sketch).toBe('Sketch text');
    expect(result.childIdeas).toHaveLength(1);
    expect(result.childIdeas[0].text).toBe('Child 1');
    expect(result.childIdeas[0].rationale).toBe('Var 1');
    expect(result.childIdeas[0].parentId).toBe(mockIdea.id);
    expect(result.childIdeas[0].depth).toBe(mockIdea.depth + 1);
  });

  it('should return a DeepenedIdea with default values if LLM output is invalid JSON', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce('invalid json');

    const result = await deepenIdea(problem, mockIdea, mockSiblings, model);

    expect(result.ideaId).toBe(mockIdea.id);
    expect(result.sketch).toBe('(deepen parse failed)');
    expect(result.childIdeas).toEqual([]);
  });

  it('should return a DeepenedIdea with default values if LLM call fails', async () => {
    (callLLM as vi.Mock).mockRejectedValueOnce(new Error('LLM error'));

    const result = await deepenIdea(problem, mockIdea, mockSiblings, model);

    expect(result.ideaId).toBe(mockIdea.id);
    expect(result.sketch).toBe('(deepen pass failed)');
    expect(result.childIdeas).toEqual([]);
  });
});