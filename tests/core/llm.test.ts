import { describe, it, expect, vi } from 'vitest';
import { callLLM, parseJSON } from '../../src/core/llm';
import { query } from '@anthropic-ai/claude-agent-sdk';

// Mock the @anthropic-ai/claude-agent-sdk
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

describe('llm', () => {
  describe('parseJSON', () => {
    it('should parse a simple JSON string', () => {
      const jsonString = '{"key": "value"}';
      expect(parseJSON(jsonString)).toEqual({ key: 'value' });
    });

    it('should parse a JSON string wrapped in ```json fences', () => {
      const jsonString = '```json\n{"key": "value"}\n```';
      expect(parseJSON(jsonString)).toEqual({ key: 'value' });
    });

    it('should parse a JSON string wrapped in ``` fences', () => {
      const jsonString = '```\n{"key": "value"}\n```';
      expect(parseJSON(jsonString)).toEqual({ key: 'value' });
    });

    it('should parse a JSON array', () => {
      const jsonString = '[{"key": "value"}]';
      expect(parseJSON(jsonString)).toEqual([{ key: 'value' }]);
    });

    it('should handle preamble before JSON', () => {
      const jsonString = 'Some preamble text\n```json\n{"key": "value"}\n```';
      expect(parseJSON(jsonString)).toEqual({ key: 'value' });
    });

    it('should handle preamble before raw JSON', () => {
      const jsonString = 'Some preamble text\n{"key": "value"}';
      expect(parseJSON(jsonString)).toEqual({ key: 'value' });
    });

    it('should return an empty object for invalid JSON', () => {
      const jsonString = 'invalid json';
      expect(() => parseJSON(jsonString)).toThrow();
    });
  });

  describe('callLLM', () => {
    it('should call the Claude Agent SDK query function', async () => {
      // Mock the query function's return value
      (query as vi.Mock).mockImplementation(async function* () {
        yield { type: 'assistant', message: { content: [{ type: 'text', text: '{"test": "response"}' }] } };
        yield { type: 'result', subtype: 'success' };
      });

      const opts = {
        model: 'claude-3-opus-20240229',
        systemPrompt: 'Test System Prompt',
        userPrompt: 'Test User Prompt',
      };

      const result = await callLLM(opts);

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith({
        prompt: opts.userPrompt,
        options: {
          model: opts.model,
          systemPrompt: { type: 'preset', preset: 'claude_code', append: opts.systemPrompt },
          allowedTools: [],
          permissionMode: 'bypassPermissions',
        },
      });
      expect(result).toBe('{"test": "response"}');
    });

    it('should throw an error if LLM call fails', async () => {
      (query as vi.Mock).mockImplementation(async function* () {
        yield { type: 'result', subtype: 'error', error: { message: 'LLM error' } };
      });

      const opts = {
        model: 'claude-3-opus-20240229',
        systemPrompt: 'Test System Prompt',
        userPrompt: 'Test User Prompt',
      };

      await expect(callLLM(opts)).rejects.toThrow('LLM call failed: error');
    });
  });
});