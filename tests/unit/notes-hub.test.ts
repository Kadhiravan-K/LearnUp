import { describe, it, expect } from 'vitest';

interface NoteRecord {
  id: string;
  course: string;
  title: string;
  content: string;
  tags: string[];
  type: 'code' | 'text' | 'lemma';
}

export function filterNotes(notes: NoteRecord[], query: string, category: string) {
  return notes.filter((n) => {
    const matchesQuery =
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.content.toLowerCase().includes(query.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));

    if (!matchesQuery) return false;
    if (category === 'lemmas') return n.type === 'lemma';
    if (category === 'code') return n.type === 'code';
    return true;
  });
}

describe('Notes Hub Logic', () => {
  const mockNotes: NoteRecord[] = [
    {
      id: 'n1',
      course: 'Embedded Systems',
      title: 'Pointer Arithmetic',
      content: 'Pointer stride alignment rules on ARM Cortex',
      tags: ['#embedded', '#arm'],
      type: 'code'
    },
    {
      id: 'n2',
      course: 'Distributed Systems',
      title: 'Raft Quorum',
      content: 'AppendEntries majority quorum calculation',
      tags: ['#raft', '#quorum'],
      type: 'code'
    },
    {
      id: 'n3',
      course: 'Database Internals',
      title: 'LSM Compaction',
      content: 'Bloom filter bits calculation formula',
      tags: ['#lsm', '#storage'],
      type: 'lemma'
    }
  ];

  it('filters notes by search query', () => {
    const results = filterNotes(mockNotes, 'Cortex', 'all');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('n1');
  });

  it('filters notes by category', () => {
    const lemmas = filterNotes(mockNotes, '', 'lemmas');
    expect(lemmas.length).toBe(1);
    expect(lemmas[0].id).toBe('n3');
  });
});
