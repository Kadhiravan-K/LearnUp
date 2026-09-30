import { describe, it, expect } from 'vitest';

export function calculateMemoryOffset(baseAddress: number, index: number, typeSize: number): number {
  return baseAddress + index * typeSize;
}

export function validateAnswer(selectedOptionIndex: number, correctOptionIndex: number): boolean {
  return selectedOptionIndex === correctOptionIndex;
}

describe('AI Study Assistant Logic', () => {
  it('calculates pointer offset arithmetic according to C99 and ARM word stride', () => {
    const base = 0x4000c000;
    const offset = calculateMemoryOffset(base, 2, 4); // 2 elements of 4-byte uint32_t
    expect(offset).toBe(0x4000c008);
  });

  it('validates interactive quiz response correctly', () => {
    expect(validateAnswer(1, 1)).toBe(true);
    expect(validateAnswer(0, 1)).toBe(false);
  });
});
