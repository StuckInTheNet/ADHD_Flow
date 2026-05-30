import { describe, it, expect, beforeEach } from 'vitest';
import { FrameRegistry, Frame } from '../../src/core/frames';

describe('FrameRegistry', () => {
  let registry: FrameRegistry;

  beforeEach(() => {
    registry = new FrameRegistry();
  });

  it('should register and retrieve a frame', () => {
    const testFrame: Frame = {
      id: 'test-frame',
      label: 'Test Frame',
      prompt: 'This is a test prompt.',
      tags: ['general'],
    };
    registry.registerFrame(testFrame);
    expect(registry.getFrame('test-frame')).toEqual(testFrame);
  });

  it('should overwrite a frame if ID already exists', () => {
    const frame1: Frame = { id: 'f1', label: 'Frame 1', prompt: 'P1', tags: ['general'] };
    const frame2: Frame = { id: 'f1', label: 'Frame 1 Updated', prompt: 'P1 Updated', tags: ['general'] };
    registry.registerFrame(frame1);
    registry.registerFrame(frame2);
    expect(registry.getFrame('f1')).toEqual(frame2);
  });

  it('should return all registered frames', () => {
    const frame1: Frame = { id: 'f1', label: 'Frame 1', prompt: 'P1', tags: ['general'] };
    const frame2: Frame = { id: 'f2', label: 'Frame 2', prompt: 'P2', tags: ['code'] };
    registry.registerFrame(frame1);
    registry.registerFrame(frame2);
    const allFrames = registry.getAllFrames();
    expect(allFrames).toContainEqual(frame1);
    expect(allFrames).toContainEqual(frame2);
    expect(allFrames.length).toBeGreaterThanOrEqual(2 + 19); // 2 new + 19 default frames
  });

  describe('selectFrames', () => {
    it('should select N frames', () => {
      const selected = registry.selectFrames(3);
      expect(selected.length).toBe(3);
    });

    it('should bias towards code/design frames when codeMode is true', () => {
      const selected = registry.selectFrames(5, true);
      const codeOrDesignFrames = selected.filter(f => f.tags.includes('code') || f.tags.includes('design'));
      // It's probabilistic, but with 5 frames, most should be code/design
      expect(codeOrDesignFrames.length).toBeGreaterThanOrEqual(3);
    });

    it('should include at least one wild frame', () => {
      let hasWild = false;
      for (let i = 0; i < 10; i++) { // Run multiple times due to randomness
        const selected = registry.selectFrames(5);
        if (selected.some(f => f.tags.includes('wild'))) {
          hasWild = true;
          break;
        }
      }
      expect(hasWild).toBe(true);
    });

    it('should select from all frames when codeMode is false', () => {
      const selected = registry.selectFrames(5, false);
      // Should be able to pick any type of frame
      expect(selected.length).toBe(5);
    });
  });
});
