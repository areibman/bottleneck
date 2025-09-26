/**
 * A Trie node for storing branch name prefixes
 */
class TrieNode {
    children: Map<string, TrieNode> = new Map();
    isEndOfPrefix: boolean = false;
    normalizedValue?: string; // Stores the normalized version of this prefix
}

/**
 * Prefix Trie for efficient branch name grouping and normalization
 * Handles agent branch patterns like codex/feature-name-hash
 */
export class PrefixTrie {
    private root: TrieNode = new TrieNode();
    private agentPrefixes: Set<string>;

    constructor(agentPrefixes: string[] = ["codex", "cursor", "claude", "openai", "devin", "gpt"]) {
        this.agentPrefixes = new Set(agentPrefixes);
    }

    /**
     * Splits a branch name into tokens for trie traversal
     */
    private tokenize(branchName: string): string[] {
        // Split by '/' first to separate agent prefix from feature name
        const parts = branchName.split('/');

        if (parts.length >= 2 && this.agentPrefixes.has(parts[0])) {
            // For agent branches, keep agent prefix as first token
            // Then split the feature name by dashes
            const featureParts = parts.slice(1).join('/').split('-');
            return [parts[0], ...featureParts];
        }

        // For non-agent branches, split by common delimiters
        return branchName.split(/[\/\-_]/);
    }

    /**
     * Checks if a token is likely a hash suffix
     */
    private isHashSuffix(token: string): boolean {
        // Hash characteristics:
        // - 4-6 characters long
        // - Alphanumeric only
        // - Contains at least one digit (to distinguish from words)
        return token.length >= 4 &&
            token.length <= 6 &&
            /^[a-z0-9]+$/i.test(token) &&
            /\d/.test(token);
    }

    /**
     * Inserts a branch name into the trie and returns its normalized form
     */
    insert(branchName: string): string {
        const tokens = this.tokenize(branchName);

        if (tokens.length === 0) return branchName;

        // Check if this is an agent branch
        const isAgentBranch = this.agentPrefixes.has(tokens[0]);

        // For agent branches, check if the last token is a hash
        let normalizedTokens = tokens;
        if (isAgentBranch && tokens.length > 2) {
            const lastToken = tokens[tokens.length - 1];
            if (this.isHashSuffix(lastToken)) {
                // Remove the hash suffix for normalization
                normalizedTokens = tokens.slice(0, -1);
            }
        }

        // Build the normalized name
        const normalized = isAgentBranch
            ? `${normalizedTokens[0]}/${normalizedTokens.slice(1).join('-')}`
            : normalizedTokens.join('-');

        // Insert into trie
        let current = this.root;
        for (const token of normalizedTokens) {
            if (!current.children.has(token)) {
                current.children.set(token, new TrieNode());
            }
            current = current.children.get(token)!;
        }
        current.isEndOfPrefix = true;
        current.normalizedValue = normalized;

        return normalized;
    }

    /**
     * Finds the normalized prefix for a branch name
     */
    findNormalizedPrefix(branchName: string): string {
        const tokens = this.tokenize(branchName);

        if (tokens.length === 0) return branchName;

        const isAgentBranch = this.agentPrefixes.has(tokens[0]);

        // For agent branches, try to find without the potential hash
        if (isAgentBranch && tokens.length > 2) {
            const lastToken = tokens[tokens.length - 1];
            if (this.isHashSuffix(lastToken)) {
                // Try to find the prefix without the hash
                const withoutHash = tokens.slice(0, -1);
                const result = this.searchPrefix(withoutHash);
                if (result) return result;
            }
        }

        // Try to find with full tokens
        const result = this.searchPrefix(tokens);
        if (result) return result;

        // If not found, normalize on the fly
        return this.insert(branchName);
    }

    /**
     * Searches for a prefix in the trie
     */
    private searchPrefix(tokens: string[]): string | null {
        let current = this.root;

        for (const token of tokens) {
            if (!current.children.has(token)) {
                return null;
            }
            current = current.children.get(token)!;
        }

        return current.normalizedValue || null;
    }

    /**
     * Gets all stored prefixes (for debugging/inspection)
     */
    getAllPrefixes(): string[] {
        const prefixes: string[] = [];

        const traverse = (node: TrieNode) => {
            if (node.isEndOfPrefix && node.normalizedValue) {
                prefixes.push(node.normalizedValue);
            }
            for (const child of node.children.values()) {
                traverse(child);
            }
        };

        traverse(this.root);
        return prefixes;
    }

    /**
     * Clears the trie
     */
    clear(): void {
        this.root = new TrieNode();
    }
}
