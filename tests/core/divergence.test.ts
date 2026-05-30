import { describe, it, expect, vi } from 'vitest';
import { divergeBranch } from '../../src/core/divergence';
import { callLLM } from '../../src/core/llm';
import type { Frame } from '../../src/core/types';

// Mock the callLLM function
vi.mock('../../src/core/llm', () => ({
  callLLM: vi.fn(),
  parseJSON: vi.fn((jsonString) => JSON.parse(jsonString)), // Keep parseJSON original behavior
}));

describe('divergeBranch', () => {
  const mockFrame: Frame = {
    id: 'test-frame',
    label: 'Test Frame',
    prompt: 'You are a test frame.',
    tags: ['general'],
  };
  const problem = 'Test Problem';
  const ideasPerFrame = 2;
  const model = 'test-model';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call LLM with correct system and user prompts', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce(
      '[{"text": "Idea 1", "rationale": "Reason 1"}, {"text": "Idea 2", "rationale": "Reason 2"}]',
    );

    await divergeBranch(problem, undefined, mockFrame, ideasPerFrame, model);

    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(callLLM).toHaveBeenCalledWith({
      model,
      systemPrompt: expect.stringContaining('DIVERGENT mode'),
      userPrompt: expect.stringContaining(`PROBLEM:\n${problem}\n\nFRAME — ${mockFrame.label}:\n${mockFrame.prompt}\n\nGenerate ${ideasPerFrame} ideas`),
    });
  });

  it('should include context in the user prompt if provided', async () => {
    const context = 'Test Context';
    (callLLM as vi.Mock).mockResolvedValueOnce(
      '[{"text": "Idea 1", "rationale": "Reason 1"}]',
    );

    await divergeBranch(problem, context, mockFrame, 1, model);

    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(callLLM).toHaveBeenCalledWith({
      model,
      systemPrompt: expect.any(String),
      userPrompt: expect.stringContaining(`CONTEXT:\n${context}`),
    });
  });

  it('should return a Branch object with parsed ideas', async () => {
    const mockLLMOutput = '[{"text": "Idea 1", "rationale": "Reason 1"}, {"text": "Idea 2", "rationale": "Reason 2"}]';
    (callLLM as vi.Mock).mockResolvedValueOnce(mockLLMOutput);

    const branch = await divergeBranch(problem, undefined, mockFrame, ideasPerFrame, model);

    expect(branch.frameId).toBe(mockFrame.id);
    expect(branch.ideas).toHaveLength(ideasPerFrame);
    expect(branch.ideas[0].text).toBe('Idea 1');
    expect(branch.ideas[0].rationale).toBe('Reason 1');
    expect(branch.ideas[0].frameId).toBe(mockFrame.id);
    expect(branch.ideas[0].depth).toBe(0);
    expect(branch.ideas[0].id).toBeDefined();
  });

  it('should return an empty ideas array if LLM output is invalid JSON', async () => {
    (callLLM as vi.Mock).mockResolvedValueOnce('invalid json');

    const branch = await divergeBranch(problem, undefined, mockFrame, ideasPerFrame, model);

    expect(branch.frameId).toBe(mockFrame.id);
    expect(branch.ideas).toHaveLength(0);
  });

  it('should return an empty ideas array if LLM call fails', async () => {
    (callLLM as vi.Mock).mockRejectedValueOnce(new Error('LLM error'));

    const branch = await divergeBranch(problem, undefined, mockFrame, ideasPerFrame, model);

    expect(branch.frameId).toBe(mockFrame.id);
    expect(branch.ideas).toHaveLength(0);
  });
});