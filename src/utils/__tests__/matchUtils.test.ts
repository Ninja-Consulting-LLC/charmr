import {compareMatchesByLastUsedDesc, Match} from '../matchUtils';

const base = (): Omit<Match, 'lastUsed' | 'name'> => ({
  id: '1',
  userId: 'u',
  platform: 'hinge',
  hidden: false,
  deleted: false,
  createdAt: '2020-01-01',
  updatedAt: '2020-01-01',
});

describe('compareMatchesByLastUsedDesc', () => {
  it('orders newer lastUsed before older', () => {
    const older: Match = {...base(), id: 'a', name: 'A', lastUsed: '2024-01-01T00:00:00.000Z'};
    const newer: Match = {...base(), id: 'b', name: 'B', lastUsed: '2024-06-01T00:00:00.000Z'};
    expect(compareMatchesByLastUsedDesc(older, newer)).toBeGreaterThan(0);
    expect(compareMatchesByLastUsedDesc(newer, older)).toBeLessThan(0);
  });

  it('sorts a list with most recent first', () => {
    const m1: Match = {...base(), id: '1', name: 'First', lastUsed: '2024-01-01T00:00:00.000Z'};
    const m2: Match = {...base(), id: '2', name: 'Second', lastUsed: '2024-03-01T00:00:00.000Z'};
    const m3: Match = {...base(), id: '3', name: 'Third', lastUsed: '2024-02-01T00:00:00.000Z'};
    const sorted = [m1, m2, m3].sort(compareMatchesByLastUsedDesc);
    expect(sorted.map(m => m.name)).toEqual(['Second', 'Third', 'First']);
  });
});
