import { PrefixTrie } from '../PrefixTrie';

describe('PrefixTrie', () => {
    let trie: PrefixTrie;

    beforeEach(() => {
        trie = new PrefixTrie();
    });

    describe('Agent branch normalization', () => {
        it('should normalize codex branches with hashes', () => {
            const branches = [
                'codex/preserve-filter-state-in-pull-requests-ze1fs5',
                'codex/preserve-filter-state-in-pull-requests-9mfd9s',
                'codex/preserve-filter-state-in-pull-requests-0sueql',
                'codex/preserve-filter-state-in-pull-requests'
            ];

            const normalized = branches.map(b => trie.findNormalizedPrefix(b));

            // All should normalize to the same prefix
            expect(normalized[0]).toBe('codex/preserve-filter-state-in-pull-requests');
            expect(normalized[1]).toBe('codex/preserve-filter-state-in-pull-requests');
            expect(normalized[2]).toBe('codex/preserve-filter-state-in-pull-requests');
            expect(normalized[3]).toBe('codex/preserve-filter-state-in-pull-requests');

            // All should be equal
            expect(new Set(normalized).size).toBe(1);
        });

        it('should handle cursor branches with hashes', () => {
            const branches = [
                'cursor/fix-local-development-console-errors-658d',
                'cursor/fix-local-development-console-errors',
                'cursor/fix-local-development-console-errors-ab12'
            ];

            const normalized = branches.map(b => trie.findNormalizedPrefix(b));

            // All should normalize to the same prefix
            expect(new Set(normalized).size).toBe(1);
            expect(normalized[0]).toBe('cursor/fix-local-development-console-errors');
        });

        it('should not remove legitimate words that look like hashes', () => {
            // "pull" and "requests" shouldn't be removed even though they're 4+ chars
            const branch = 'codex/preserve-filter-state-in-pull-requests';
            const normalized = trie.findNormalizedPrefix(branch);

            expect(normalized).toBe('codex/preserve-filter-state-in-pull-requests');
        });

        it('should handle different agent prefixes', () => {
            const branches = [
                'claude/implement-feature-abc123',
                'openai/implement-feature-def456',
                'devin/implement-feature-789xyz'
            ];

            const normalized = branches.map(b => trie.findNormalizedPrefix(b));

            expect(normalized[0]).toBe('claude/implement-feature');
            expect(normalized[1]).toBe('openai/implement-feature');
            expect(normalized[2]).toBe('devin/implement-feature');
        });

        it('should normalize branches with all-letter hash suffixes', () => {
            const branches = [
                'codex/reduce-app-dmg-package-size-axfbof',
                'codex/reduce-app-dmg-package-size',
                'codex/reduce-app-dmg-package-size-trroza'
            ];

            const normalized = branches.map(b => trie.findNormalizedPrefix(b));

            // All should normalize to the same prefix
            expect(normalized[0]).toBe('codex/reduce-app-dmg-package-size');
            expect(normalized[1]).toBe('codex/reduce-app-dmg-package-size');
            expect(normalized[2]).toBe('codex/reduce-app-dmg-package-size');

            // All should be equal
            expect(new Set(normalized).size).toBe(1);
        });

        it('should normalize branches with 4-character hash suffixes', () => {
            const branches = [
                'cursor/fix-dev-mode-not-working-ffce',
                'cursor/fix-dev-mode-not-working-78a0',
                'cursor/fix-dev-mode-not-working-99df',
                'cursor/fix-dev-mode-not-working'
            ];

            const normalized = branches.map(b => trie.findNormalizedPrefix(b));

            // All should normalize to the same prefix
            expect(normalized[0]).toBe('cursor/fix-dev-mode-not-working');
            expect(normalized[1]).toBe('cursor/fix-dev-mode-not-working');
            expect(normalized[2]).toBe('cursor/fix-dev-mode-not-working');
            expect(normalized[3]).toBe('cursor/fix-dev-mode-not-working');

            // All should be equal
            expect(new Set(normalized).size).toBe(1);
        });
    });

    describe('Caching behavior', () => {
        it('should cache normalized prefixes', () => {
            const branch1 = 'codex/feature-name-hash1';
            const branch2 = 'codex/feature-name-hash2';

            // First call inserts into trie
            const result1 = trie.findNormalizedPrefix(branch1);

            // Second call should find the cached normalized version
            const result2 = trie.findNormalizedPrefix(branch2);

            expect(result1).toBe(result2);
            expect(result1).toBe('codex/feature-name');

            // Check that it's actually cached
            const allPrefixes = trie.getAllPrefixes();
            expect(allPrefixes).toContain('codex/feature-name');
        });

        it('should clear cache when requested', () => {
            trie.findNormalizedPrefix('codex/feature-abc123');
            expect(trie.getAllPrefixes().length).toBeGreaterThan(0);

            trie.clear();
            expect(trie.getAllPrefixes().length).toBe(0);
        });
    });

    describe('Non-agent branches', () => {
        it('should not process non-agent branches', () => {
            const branch = 'feature/some-feature-name-1234';
            const normalized = trie.findNormalizedPrefix(branch);

            // Should return as-is since "feature" is not an agent prefix
            expect(normalized).toBe('feature/some-feature-name-1234');
        });
    });

    describe('Agent suffix handling', () => {
        it('should strip known agent suffixes (codex, opus, gemini, etc)', () => {
            // Test with various agent suffixes
            const branches = [
                'cursor/issue-12-codex',
                'cursor/issue-12-opus',
                'cursor/issue-12-gemini',
                'cursor/issue-12-sonnet',
                'cursor/issue-12-haiku'
            ];

            const normalized = branches.map(b => trie.findNormalizedPrefix(b));

            // All should normalize to cursor/issue-12
            expect(new Set(normalized).size).toBe(1);
            expect(normalized[0]).toBe('cursor/issue-12');
        });

        it('should NOT group branches with different issue numbers', () => {
            // Branches with different issue numbers should stay separate
            const branches = [
                'cursor/issue-12-gemini3',
                'cursor/issue-14-codex',
                'cursor/issue-14-opus',
                'cursor/issue-12-codex',
                'cursor/issue-13-codex'
            ];

            const results: Record<string, string> = {};
            for (const branch of branches) {
                results[branch] = trie.findNormalizedPrefix(branch);
            }

            // Issue 12 branches should group together
            expect(results['cursor/issue-12-gemini3']).toBe('cursor/issue-12');
            expect(results['cursor/issue-12-codex']).toBe('cursor/issue-12');
            
            // Issue 14 branches should group together
            expect(results['cursor/issue-14-codex']).toBe('cursor/issue-14');
            expect(results['cursor/issue-14-opus']).toBe('cursor/issue-14');
            
            // Issue 13 branch should be separate
            expect(results['cursor/issue-13-codex']).toBe('cursor/issue-13');

            // Different issues should NOT be grouped together
            expect(results['cursor/issue-12-gemini3']).not.toBe(results['cursor/issue-14-codex']);
            expect(results['cursor/issue-13-codex']).not.toBe(results['cursor/issue-12-codex']);

            // Should have exactly 3 unique groups
            expect(trie.getAllPrefixes().length).toBe(3);
        });

        it('should handle insertion order correctly', () => {
            // Test that order doesn't matter - issue-14 first, then issue-12
            const trie1 = new PrefixTrie();
            trie1.findNormalizedPrefix('cursor/issue-14-codex');
            const result1 = trie1.findNormalizedPrefix('cursor/issue-12-gemini3');

            // Test with opposite order - issue-12 first, then issue-14
            const trie2 = new PrefixTrie();
            trie2.findNormalizedPrefix('cursor/issue-12-gemini3');
            const result2 = trie2.findNormalizedPrefix('cursor/issue-14-codex');

            // Both should maintain separate groups regardless of order
            expect(result1).toBe('cursor/issue-12');
            expect(result2).toBe('cursor/issue-14');
        });
    });
});
