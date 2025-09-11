declare global {
  interface Window {
    electronAPI: {
      github: {
        authenticate: () => Promise<any>;
        getUser: () => Promise<any>;
        getRepos: () => Promise<any[]>;
        getPRs: (repo: string, state: string) => Promise<any[]>;
        getPRDetails: (repo: string, prNumber: number) => Promise<any>;
        getPRFiles: (repo: string, prNumber: number) => Promise<any[]>;
        getPRComments: (repo: string, prNumber: number) => Promise<any[]>;
        createReview: (repo: string, prNumber: number, review: any) => Promise<any>;
        mergePR: (repo: string, prNumber: number, mergeMethod: string) => Promise<any>;
      };
      git: {
        clone: (url: string, path: string) => Promise<any>;
        checkout: (repoPath: string, branch: string) => Promise<any>;
        getBranches: (repoPath: string) => Promise<any[]>;
        getDiff: (repoPath: string, base: string, head: string) => Promise<any>;
      };
      db: {
        savePR: (pr: any) => Promise<any>;
        getPRs: (filters: any) => Promise<any[]>;
        saveComment: (comment: any) => Promise<any>;
        getComments: (prId: string) => Promise<any[]>;
      };
      dialog: {
        selectDirectory: () => Promise<string | null>;
      };
    };
  }
}

export {};