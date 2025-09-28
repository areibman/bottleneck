export const resolveAuthToken = async (): Promise<string | null> => {
  if (window.electron) {
    try {
      return await window.electron.auth.getToken();
    } catch (error) {
      console.error("Failed to resolve auth token from electron:", error);
      return null;
    }
  }

  try {
    const authStore = require("../authStore").useAuthStore.getState();
    return authStore.token;
  } catch (error) {
    console.error("Failed to resolve auth token from authStore:", error);
    return null;
  }
};

