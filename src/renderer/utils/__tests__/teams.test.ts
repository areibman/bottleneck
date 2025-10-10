import { describe, it, expect } from "vitest";
import { useSettingsStore, type AuthorTeam } from "../../stores/settingsStore";

describe("AuthorTeams store helpers", () => {
  it("adds, updates, and deletes an author team", async () => {
    const store = useSettingsStore.getState();
    await store.setAuthorTeams([]);

    const created = await store.addAuthorTeam({
      name: "Frontend Team",
      members: ["alice", "bob"],
      color: "aabbcc",
      icon: "🏢",
      description: "FE group",
    });

    let teams = useSettingsStore.getState().settings.authorTeams;
    expect(teams.length).toBe(1);
    expect(teams[0].name).toBe("Frontend Team");
    expect(teams[0].members).toEqual(["alice", "bob"]);

    await store.updateAuthorTeam({
      ...created,
      name: "Frontend",
      members: ["alice", "bob", "carol"],
    } as AuthorTeam);

    teams = useSettingsStore.getState().settings.authorTeams;
    expect(teams[0].name).toBe("Frontend");
    expect(teams[0].members).toEqual(["alice", "bob", "carol"]);

    await store.deleteAuthorTeam(created.id);
    teams = useSettingsStore.getState().settings.authorTeams;
    expect(teams.length).toBe(0);
  });
});
