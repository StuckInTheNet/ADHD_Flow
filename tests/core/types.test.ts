import { describe, it, expect } from 'vitest';
import type { Idea, Score, RunOptions } from '../../src/core/types';

describe('Types', () => {
  it('should define Idea type correctly', () => {
    const idea: Idea = {
      id: '1',
      frameId: 'test-frame',
      text: 'Test Idea',
      depth: 0,
    };
    expect(idea).toBeDefined();
    expect(idea.id).toBe('1');
  });

  it('should define Score type correctly', () => {
    const score: Score = {
      novelty: 5,
      viability: 7,
      fit: 8,
      impact: 6,
      effort: 4,
      risk: 3,
      total: 0, // Will be calculated by the engine
    };
    expect(score).toBeDefined();
    expect(score.novelty).toBe(5);
  });

  it('should define RunOptions type correctly', () => {
    const options: RunOptions = {
      problem: 'Test Problem',
      framesPerRun: 3,
      ideasPerFrame: 5,
    };
    expect(options).toBeDefined();
    expect(options.problem).toBe('Test Problem');
  });
});
