/**
 * Utility functions for handling Pull Request data
 */

import { PrefixTrie } from './PrefixTrie';

// Create a singleton instance of the PrefixTrie for branch name normalization
const branchPrefixTrie = new PrefixTrie();

/**
 * Extracts a common prefix from PR title and branch name for grouping related PRs.
 * Uses a Prefix Trie for efficient agent branch pattern matching and normalization.
 * 
 * @param title - The PR title
 * @param branchName - The branch name (optional)
 * @returns The extracted prefix for grouping
 */
export function getTitlePrefix(title: string, branchName?: string): string {
    // If we have a branch name, use the trie for normalization
    if (branchName) {
        // Check if this looks like an agent branch pattern
        const agentPrefixes = ["codex", "cursor", "claude", "openai", "devin", "gpt"];
        const firstPart = branchName.split('/')[0];

        if (agentPrefixes.includes(firstPart)) {
            // Use the trie to get the normalized prefix
            return branchPrefixTrie.findNormalizedPrefix(branchName);
        }
    }

    // Fallback to title-based extraction for non-agent branches
    // Remove PR number if present (e.g., "#1234 Title" -> "Title")
    const withoutNumber = title.replace(/^#?\d+\s*/, "");

    // Extract prefix before colon or first few words
    const colonMatch = withoutNumber.match(/^([^:]+):/);
    if (colonMatch) {
        return colonMatch[1].trim();
    }

    // Get first 3-4 words as prefix
    const words = withoutNumber.split(/\s+/);
    const prefixWords = words.slice(0, Math.min(3, words.length));
    return prefixWords.join(" ");
}

/**
 * Clears the branch prefix cache (useful for testing or when switching repos)
 */
export function clearPrefixCache(): void {
    branchPrefixTrie.clear();
}

/**
 * Gets all cached prefixes (useful for debugging)
 */
export function getCachedPrefixes(): string[] {
    return branchPrefixTrie.getAllPrefixes();
}
