import type { Repository } from "../../services/github";

export const loadRecentlyViewedRepos = async (): Promise<Repository[]> => {
  if (window.electron?.settings) {
    try {
      const result = await window.electron.settings.get("recentlyViewedRepos");
      if (result.success && result.value) {
        return result.value as Repository[];
      }
    } catch (error) {
      console.error("Failed to load recently viewed repos:", error);
    }
  }
  return [];
};

export const saveRecentlyViewedRepos = async (repos: Repository[]) => {
  if (window.electron?.settings) {
    try {
      await window.electron.settings.set("recentlyViewedRepos", repos);
    } catch (error) {
      console.error("Failed to save recently viewed repos:", error);
    }
  }
};

export const loadSelectedRepo = async (): Promise<Repository | null> => {
  if (window.electron?.settings) {
    try {
      const result = await window.electron.settings.get("selectedRepo");
      if (result.success && result.value) {
        return result.value as Repository;
      }
    } catch (error) {
      console.error("Failed to load selected repo:", error);
    }
  }
  return null;
};

export const saveSelectedRepo = async (repo: Repository | null) => {
  if (window.electron?.settings) {
    try {
      await window.electron.settings.set("selectedRepo", repo);
    } catch (error) {
      console.error("Failed to save selected repo:", error);
    }
  }
};

