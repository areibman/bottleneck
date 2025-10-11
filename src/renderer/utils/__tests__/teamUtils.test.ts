import { describe, it, expect } from 'vitest';
import {
  areAllTeamMembersSelected,
  areAnyTeamMembersSelected,
  addTeamMembersToSelection,
  removeTeamMembersFromSelection,
  toggleTeamInSelection,
  normalizeSelectionAgainstAllToken,
} from '../teamUtils';

describe('teamUtils', () => {
  it('areAllTeamMembersSelected works', () => {
    const sel = new Set(['a', 'b', 'c']);
    expect(areAllTeamMembersSelected(sel, ['a', 'b'])).toBe(true);
    expect(areAllTeamMembersSelected(sel, ['a', 'd'])).toBe(false);
    expect(areAllTeamMembersSelected(sel, [])).toBe(false);
  });

  it('areAnyTeamMembersSelected works', () => {
    const sel = new Set(['a', 'b']);
    expect(areAnyTeamMembersSelected(sel, ['x', 'b'])).toBe(true);
    expect(areAnyTeamMembersSelected(sel, ['x', 'y'])).toBe(false);
  });

  it('addTeamMembersToSelection adds and clears all token', () => {
    const sel = new Set(['all']);
    const res = addTeamMembersToSelection(sel, ['a', 'b']);
    expect(res.has('all')).toBe(false);
    expect(res.has('a')).toBe(true);
    expect(res.has('b')).toBe(true);
  });

  it('removeTeamMembersFromSelection removes and clears all token', () => {
    const sel = new Set(['a', 'b', 'all']);
    const res = removeTeamMembersFromSelection(sel, ['a']);
    expect(res.has('a')).toBe(false);
    expect(res.has('b')).toBe(true);
    expect(res.has('all')).toBe(false);
  });

  it('toggleTeamInSelection toggles correctly', () => {
    const sel = new Set(['a']);
    const res1 = toggleTeamInSelection(sel, ['a', 'b']);
    expect(res1.has('a')).toBe(true);
    expect(res1.has('b')).toBe(true);
    const res2 = toggleTeamInSelection(res1, ['a', 'b']);
    expect(res2.has('a')).toBe(false);
    expect(res2.has('b')).toBe(false);
  });

  it('normalizeSelectionAgainstAllToken sets all when complete', () => {
    const allAuthors = ['a', 'b', 'c'];
    const sel = new Set(['a', 'b', 'c']);
    const res = normalizeSelectionAgainstAllToken(sel, allAuthors);
    expect(res.has('all')).toBe(true);
  });

  it('normalizeSelectionAgainstAllToken removes all when incomplete', () => {
    const allAuthors = ['a', 'b', 'c'];
    const sel = new Set(['a', 'b', 'all']);
    const res = normalizeSelectionAgainstAllToken(sel, allAuthors);
    expect(res.has('all')).toBe(false);
  });
});
