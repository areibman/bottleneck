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
});
