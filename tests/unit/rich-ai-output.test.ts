import { describe, it, expect } from 'vitest';
import {
  parseRichAiOutput,
  sanitizeRichBlocks,
  richAiResponseSchema,
  diagramBlockSchema,
  quizBlockSchema,
  RichBlock
} from '@/lib/ai/rich-output';

describe('Rich AI Output Protocol & Safety Unit Tests', () => {
  describe('Zod Schema Validation for Discriminated Union Blocks', () => {
    it('validates a text block', () => {
      const block = { type: 'text', content: 'Here is a breakdown of Dijkstra algorithm.' };
      const res = richAiResponseSchema.safeParse({ blocks: [block] });
      expect(res.success).toBe(true);
    });

    it('validates a table block', () => {
      const block = {
        type: 'table',
        headers: ['Metric', 'Value'],
        rows: [
          ['Time Complexity', 'O((V + E) log V)'],
          ['Space Complexity', 'O(V)']
        ]
      };
      const res = richAiResponseSchema.safeParse({ blocks: [block] });
      expect(res.success).toBe(true);
    });

    it('validates a quiz block with at least 2 options and valid index', () => {
      const block = {
        type: 'quiz',
        question: 'Which data structure does Dijkstra use for the priority queue?',
        options: ['Min-Heap', 'Stack', 'Linked List'],
        answerIndex: 0,
        explanation: 'A min-heap extracts the minimum distance node in O(log V).'
      };
      const res = quizBlockSchema.safeParse(block);
      expect(res.success).toBe(true);
    });

    it('rejects a quiz block with fewer than 2 options', () => {
      const invalidQuiz = {
        type: 'quiz',
        question: 'Single option question?',
        options: ['Only One'],
        answerIndex: 0,
        explanation: 'Invalid'
      };
      const res = quizBlockSchema.safeParse(invalidQuiz);
      expect(res.success).toBe(false);
    });

    it('validates a flashcard block', () => {
      const block = {
        type: 'flashcard',
        front: 'What is idempotency?',
        back: 'An operation that produces the same result whether executed once or multiple times.',
        hint: 'Think HTTP PUT or GET'
      };
      const res = richAiResponseSchema.safeParse({ blocks: [block] });
      expect(res.success).toBe(true);
    });

    it('validates a timeline block', () => {
      const block = {
        type: 'timeline',
        title: 'Compilation Pipeline',
        events: [
          { time: 'Stage 1', title: 'Lexing', description: 'Converts source stream to tokens' },
          { time: 'Stage 2', title: 'Parsing', description: 'Builds Abstract Syntax Tree' }
        ]
      };
      const res = richAiResponseSchema.safeParse({ blocks: [block] });
      expect(res.success).toBe(true);
    });

    it('validates a diagram block (flowchart, mindmap, sequence, etc.)', () => {
      const block = {
        type: 'diagram',
        diagramType: 'flowchart',
        code: 'graph TD; A[Client] -->|Request| B[Server]; B --> C[Database];',
        accessibleText: 'Flowchart showing Client sending request to Server which queries Database.'
      };
      const res = diagramBlockSchema.safeParse(block);
      expect(res.success).toBe(true);
    });

    it('rejects diagram code that exceeds the 5000 character limit', () => {
      const oversized = {
        type: 'diagram',
        diagramType: 'flowchart',
        code: 'A'.repeat(5001),
        accessibleText: 'Oversized diagram'
      };
      const res = diagramBlockSchema.safeParse(oversized);
      expect(res.success).toBe(false);
    });

    it('validates a tool call block', () => {
      const block = {
        type: 'tool_call',
        toolName: 'search_documentation',
        status: 'completed',
        summary: 'Found 3 references in PRD.md'
      };
      const res = richAiResponseSchema.safeParse({ blocks: [block] });
      expect(res.success).toBe(true);
    });
  });

  describe('Robust Parsing & Plain-Text Fallbacks', () => {
    it('parses valid JSON string with blocks', () => {
      const jsonStr = JSON.stringify({
        blocks: [
          { type: 'text', content: 'Hello world' },
          {
            type: 'quiz',
            question: 'Is TypeScript typed?',
            options: ['Yes', 'No'],
            answerIndex: 0,
            explanation: 'TypeScript provides static typing.'
          }
        ]
      });

      const blocks = parseRichAiOutput(jsonStr);
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe('text');
      expect(blocks[1].type).toBe('quiz');
    });

    it('gracefully falls back to a plain text block when receiving raw unformatted markdown text', () => {
      const rawMarkdown = '### Key Concepts\n- Memory safety\n- Zero-cost abstractions';
      const blocks = parseRichAiOutput(rawMarkdown);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe('text');
      if (blocks[0].type === 'text') {
        expect(blocks[0].content).toBe(rawMarkdown);
      }
    });

    it('falls back safely when JSON is malformed', () => {
      const brokenJson = '{ "blocks": [{"type": "text", "content": ';
      const blocks = parseRichAiOutput(brokenJson);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe('text');
      if (blocks[0].type === 'text') {
        expect(blocks[0].content).toBe(brokenJson);
      }
    });

    it('falls back safely when receiving unexpected objects or primitives', () => {
      expect(parseRichAiOutput(null)).toEqual([{ type: 'text', content: '' }]);
      expect(parseRichAiOutput(undefined)).toEqual([{ type: 'text', content: '' }]);
      expect(parseRichAiOutput(12345)).toEqual([{ type: 'text', content: '12345' }]);
      expect(parseRichAiOutput({ randomKey: 'unexpected' })).toEqual([{ type: 'text', content: '[object Object]' }]);
    });
  });

  describe('XSS Sanitization & Injection Prevention', () => {
    it('strips <script> tags from all block types', () => {
      const dirtyBlocks: RichBlock[] = [
        {
          type: 'text',
          content: 'Normal text <script>alert("hack")</script> continuing.'
        },
        {
          type: 'table',
          headers: ['Name <script src="evil.js"></script>', 'Age'],
          rows: [['Alice <script>evil()</script>', '25']]
        },
        {
          type: 'quiz',
          question: 'Question with <script>danger()</script>',
          options: ['Option <script>xss()</script>', 'Safe'],
          answerIndex: 0,
          explanation: '<script>alert(1)</script>Safe explanation'
        },
        {
          type: 'flashcard',
          front: 'Front <script>xss()</script>',
          back: 'Back <script>xss()</script>',
          hint: 'Hint <script>xss()</script>'
        },
        {
          type: 'diagram',
          diagramType: 'mindmap',
          code: 'mindmap\n  root((Root))\n    <script>evil()</script>Item',
          accessibleText: '<script>bad()</script>Diagram description'
        }
      ];

      const cleaned = sanitizeRichBlocks(dirtyBlocks);

      // Check text block
      if (cleaned[0].type === 'text') {
        expect(cleaned[0].content).toBe('Normal text  continuing.');
      }

      // Check table block
      if (cleaned[1].type === 'table') {
        expect(cleaned[1].headers[0]).toBe('Name');
        expect(cleaned[1].rows[0][0]).toBe('Alice');
      }

      // Check quiz block
      if (cleaned[2].type === 'quiz') {
        expect(cleaned[2].question).toBe('Question with');
        expect(cleaned[2].options[0]).toBe('Option');
        expect(cleaned[2].explanation).toBe('Safe explanation');
      }

      // Check flashcard block
      if (cleaned[3].type === 'flashcard') {
        expect(cleaned[3].front).toBe('Front');
        expect(cleaned[3].back).toBe('Back');
        expect(cleaned[3].hint).toBe('Hint');
      }

      // Check diagram block
      if (cleaned[4].type === 'diagram') {
        expect(cleaned[4].code).not.toContain('<script');
        expect(cleaned[4].accessibleText).toBe('Diagram description');
      }
    });

    it('strips javascript: pseudo-protocols', () => {
      const dirtyBlocks: RichBlock[] = [
        {
          type: 'text',
          content: 'Link: javascript:alert(document.cookie)'
        }
      ];

      const cleaned = sanitizeRichBlocks(dirtyBlocks);
      if (cleaned[0].type === 'text') {
        expect(cleaned[0].content).toBe('Link: alert(document.cookie)');
      }
    });
  });
});
