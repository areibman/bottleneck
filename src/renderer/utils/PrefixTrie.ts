/**
 * A Trie node for storing branch name prefixes
 */
class TrieNode {
    children: Map<string, TrieNode> = new Map();
    branches: string[] = []; // All complete branches that share this prefix
}

/**
 * Prefix Trie for efficient branch name grouping and normalization
 * 
 * Algorithm: Hybrid Heuristic + Longest Common Prefix (LCP)
 * 
 * Why hybrid is optimal for this problem:
 * 1. **Cold Start**: Heuristics allow normalization of first branch (pure LCP can't)
 * 2. **Data Refinement**: When multiple similar branches appear, LCP overrides heuristics
 * 3. **Pattern Recognition**: Uses linguistic patterns (vowel ratios, consonant clusters)
 *    to identify likely variable suffixes without hard-coding specific hash formats
 * 
 * Time Complexity:
 * - Insert: O(k) where k = number of tokens in branch name
 * - Lookup: O(1) with caching, O(k) without
 * 
 * Space Complexity: O(n * k) where n = number of unique normalized prefixes
 */
export class PrefixTrie {
    private root: TrieNode = new TrieNode();
    private agentPrefixes: Set<string>;
    private branchToNormalized: Map<string, string> = new Map();

    constructor(agentPrefixes: string[] = ["codex", "cursor", "claude", "openai", "devin", "gpt"]) {
        this.agentPrefixes = new Set(agentPrefixes);
    }

    /**
     * Tokenizes branch name into parts for trie traversal
     * Agent branches: agent/feature-name-parts -> [agent, feature, name, parts]
     */
    private tokenize(branchName: string): string[] {
        const parts = branchName.split('/');

        if (parts.length >= 2 && this.agentPrefixes.has(parts[0])) {
            const featureParts = parts.slice(1).join('/').split('-');
            return [parts[0], ...featureParts];
        }

        return parts;
    }

    /**
     * Reconstructs branch name from tokens
     */
    private reconstruct(tokens: string[], isAgentBranch: boolean): string {
        if (tokens.length === 0) return '';

        if (isAgentBranch && tokens.length > 1) {
            return `${tokens[0]}/${tokens.slice(1).join('-')}`;
        }

        return tokens.join('/');
    }

    /**
     * Heuristic: Identifies likely variable suffixes using linguistic patterns
     * 
     * Distinguishes random suffixes (abc123, ffce, axfbof) from real words (requests, size)
     * by analyzing:
     * - Presence of digits (most variable suffixes have them)
     * - Vowel ratio (random strings have fewer vowels)
     * - Unusual consonant patterns (double/triple consonants, rare combinations)
     */
    private isPotentiallyVariable(token: string): boolean {
        if (token.length < 4 || token.length > 8 || !/^[a-z0-9]+$/i.test(token)) {
            return false;
        }

        // Digits are strong indicators
        if (/\d/.test(token)) {
            return true;
        }

        // Analyze letter patterns
        const lowerToken = token.toLowerCase();
        const vowelCount = (lowerToken.match(/[aeiou]/g) || []).length;
        const vowelRatio = vowelCount / token.length;

        // Unusual consonant patterns
        // Common doubles in English: ll, ss, tt, ff, mm, nn, pp, rr, dd, bb, gg, cc, zz
        const hasUnusualDoubles = /([bcdfghjklmnpqrstvwxyz])\1/.test(lowerToken) &&
            !/ll|ss|tt|ff|mm|nn|pp|rr|dd|bb|gg|cc|zz/.test(lowerToken);
        const hasTripleConsonants = /[bcdfghjklmnpqrstvwxyz]{3,}/.test(lowerToken);
        const hasUnusualCombos = /[xzq][bcdfghjklmnpqrstvwxyz]|[bcdfghjklmnpqrstvwxyz][xzq]/.test(lowerToken);

        return (vowelRatio <= 0.35 && (hasUnusualDoubles || hasTripleConsonants || hasUnusualCombos));
    }

    /**
     * Computes longest common prefix (LCP) among multiple token arrays
     */
    private longestCommonPrefix(tokenArrays: string[][]): number {
        if (tokenArrays.length === 0) return 0;

        const minLen = Math.min(...tokenArrays.map(t => t.length));
        let commonLen = 0;

        for (let i = 0; i < minLen; i++) {
            if (tokenArrays.every(t => t[i] === tokenArrays[0][i])) {
                commonLen++;
            } else {
                break;
            }
        }

        return commonLen;
    }

    /**
     * Finds branches that share the exact same normalized prefix path,
     * allowing for variations in the final token only.
     * 
     * For tokens ['cursor', 'issue', '12', 'codex'], this finds:
     * - Branches at the parent node cursor/issue/12 (shorter prefixes)
     * - Branches at the terminal node cursor/issue/12/codex
     * - Branches at siblings of terminal (e.g., cursor/issue/12/opus)
     * 
     * This ensures we group branches that share all but the last token,
     * while not grouping entirely different subtrees (e.g., issue-12 vs issue-14).
     */
    private findSimilarBranches(tokens: string[]): string[] {
        if (tokens.length === 0) return [];

        let current = this.root;
        let parent: TrieNode | null = null;

        // Traverse to the terminal node, keeping track of parent
        for (const token of tokens) {
            if (!current.children.has(token)) {
                return [];
            }
            parent = current;
            current = current.children.get(token)!;
        }

        // Collect branches from:
        // 1. Parent node - branches that are shorter prefixes (e.g., cursor/issue-12 vs cursor/issue-12-codex)
        // 2. Siblings at parent level - branches with different last token
        // 3. This terminal node - branches that end exactly here
        // 4. Immediate children - branches with one more token
        const branches: string[] = [];
        
        // Add branches from parent (shorter prefixes)
        if (parent && tokens.length > 2) {
            branches.push(...parent.branches);
            // Add branches from all siblings (children of parent)
            for (const [, siblingNode] of parent.children) {
                branches.push(...siblingNode.branches);
            }
        } else {
            // For short paths, just use current node and children
            branches.push(...current.branches);
            for (const [, childNode] of current.children) {
                branches.push(...childNode.branches);
            }
        }

        return branches;
    }

    /**
     * Inserts a branch and returns its normalized form
     * 
     * Process:
     * 1. Check cache (O(1) lookup)
     * 2. Apply heuristic to detect potential variable suffix
     * 3. Insert into trie at normalized position
     * 4. Find similar branches using LCP
     * 5. If multiple similar branches exist, use their common prefix (data overrides heuristic)
     */
    insert(branchName: string): string {
        if (this.branchToNormalized.has(branchName)) {
            return this.branchToNormalized.get(branchName)!;
        }

        const tokens = this.tokenize(branchName);
        if (tokens.length === 0) return branchName;

        const isAgentBranch = this.agentPrefixes.has(tokens[0]);

        if (!isAgentBranch) {
            this.branchToNormalized.set(branchName, branchName);
            return branchName;
        }

        // Apply heuristic: check if last token looks variable
        const hasVariableSuffix = tokens.length > 2 && this.isPotentiallyVariable(tokens[tokens.length - 1]);
        const normalizedTokens = hasVariableSuffix ? tokens.slice(0, -1) : tokens;

        // Insert into trie - only store branch at terminal node
        let current = this.root;
        for (const token of normalizedTokens) {
            if (!current.children.has(token)) {
                current.children.set(token, new TrieNode());
            }
            current = current.children.get(token)!;
        }
        // Store branch only at the terminal node to avoid incorrect grouping
        if (!current.branches.includes(branchName)) {
            current.branches.push(branchName);
        }

        // Apply LCP if similar branches exist
        const similarBranches = this.findSimilarBranches(normalizedTokens);

        if (similarBranches.length > 1) {
            const allTokens = similarBranches.map(b => this.tokenize(b));
            const lcpLength = this.longestCommonPrefix(allTokens);

            if (lcpLength >= 2) {
                const commonTokens = allTokens[0].slice(0, lcpLength);
                const normalized = this.reconstruct(commonTokens, true);

                // Update all similar branches
                for (const branch of similarBranches) {
                    this.branchToNormalized.set(branch, normalized);
                }

                return normalized;
            }
        }

        // No similar branches found, use heuristic result
        const normalized = this.reconstruct(normalizedTokens, isAgentBranch);
        this.branchToNormalized.set(branchName, normalized);
        return normalized;
    }

    /**
     * Finds the normalized prefix for a branch name (alias for insert)
     */
    findNormalizedPrefix(branchName: string): string {
        return this.insert(branchName);
    }

    /**
     * Gets all unique normalized prefixes
     */
    getAllPrefixes(): string[] {
        const uniquePrefixes = new Set(this.branchToNormalized.values());
        return Array.from(uniquePrefixes);
    }

    /**
     * Clears all stored data
     */
    clear(): void {
        this.root = new TrieNode();
        this.branchToNormalized.clear();
    }
}
