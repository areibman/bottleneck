export function areAllTeamMembersSelected(
  selectedAuthorLogins: Set<string>,
  teamMemberLogins: string[],
): boolean {
  if (teamMemberLogins.length === 0) return false;
  return teamMemberLogins.every((login) => selectedAuthorLogins.has(login));
}

export function areAnyTeamMembersSelected(
  selectedAuthorLogins: Set<string>,
  teamMemberLogins: string[],
): boolean {
  return teamMemberLogins.some((login) => selectedAuthorLogins.has(login));
}

export function addTeamMembersToSelection(
  selectedAuthorLogins: Set<string>,
  teamMemberLogins: string[],
): Set<string> {
  const next = new Set(selectedAuthorLogins);
  for (const login of teamMemberLogins) {
    next.add(login);
  }
  // Never keep the special "all" token when specific authors are selected
  next.delete("all");
  return next;
}

export function removeTeamMembersFromSelection(
  selectedAuthorLogins: Set<string>,
  teamMemberLogins: string[],
): Set<string> {
  const next = new Set(selectedAuthorLogins);
  for (const login of teamMemberLogins) {
    next.delete(login);
  }
  next.delete("all");
  return next;
}

export function toggleTeamInSelection(
  selectedAuthorLogins: Set<string>,
  teamMemberLogins: string[],
): Set<string> {
  const allSelected = areAllTeamMembersSelected(selectedAuthorLogins, teamMemberLogins);
  return allSelected
    ? removeTeamMembersFromSelection(selectedAuthorLogins, teamMemberLogins)
    : addTeamMembersToSelection(selectedAuthorLogins, teamMemberLogins);
}

export function normalizeSelectionAgainstAllToken(
  selection: Set<string>,
  allAuthorLogins: string[],
): Set<string> {
  // If the set contains all individual authors, add the special "all" token
  const hasAllIndividuals = allAuthorLogins.every((login) => selection.has(login));
  if (hasAllIndividuals) {
    const next = new Set(selection);
    next.add("all");
    return next;
  }
  // If not all selected, ensure "all" is not set
  const next = new Set(selection);
  next.delete("all");
  return next;
}
