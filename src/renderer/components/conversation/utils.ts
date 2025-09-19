import { VercelDeployment } from "./types";

export const extractLinks = (text: string): { text: string; url: string }[] => {
  const links: { text: string; url: string }[] = [];

  // Match markdown links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    links.push({ text: match[1], url: match[2] });
  }

  // Match plain URLs
  const urlRegex = /(?:^|\s)(https?:\/\/[^\s<]+)/g;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1];
    // Only add if not already captured as markdown link
    if (!links.some((l) => l.url === url)) {
      // Try to extract a meaningful name from the URL
      let text = "Link";
      if (url.includes("vercel.app")) text = "Preview";
      else if (url.includes("github.com")) text = "GitHub";
      else if (url.includes("netlify")) text = "Preview";
      else {
        try {
          const urlObj = new URL(url);
          text = urlObj.hostname.replace("www.", "");
        } catch {
          text = "Link";
        }
      }
      links.push({ text, url });
    }
  }

  return links;
};

export const parseVercelDeployments = (text: string): VercelDeployment[] => {
  const deployments: VercelDeployment[] = [];

  // Split by lines and look for table rows
  const lines = text.split("\n");
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for table headers
    if (line.includes("| Project") && line.includes("| Deployment")) {
      inTable = true;
      continue;
    }

    // Check for "Skipped Deployments" section - could be used for filtering in the future
    if (line.includes("Skipped Deployments")) {
      // Currently we parse all deployments, but this could be used to separate them
      continue;
    }

    // Parse table rows
    if (inTable && line.startsWith("|") && !line.includes("---")) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell);

      if (cells.length >= 4) {
        // Extract project name and link
        const projectCell = cells[0];
        const projectMatch = projectCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
        const project = projectMatch ? projectMatch[1] : projectCell;

        // Extract status
        const deploymentCell = cells[1];
        let status: VercelDeployment["status"] = "Ready";
        if (deploymentCell.toLowerCase().includes("ready")) status = "Ready";
        else if (deploymentCell.toLowerCase().includes("ignored"))
          status = "Ignored";
        else if (deploymentCell.toLowerCase().includes("building"))
          status = "Building";
        else if (deploymentCell.toLowerCase().includes("error"))
          status = "Error";
        else if (deploymentCell.toLowerCase().includes("canceled"))
          status = "Canceled";

        // Extract preview link
        const previewCell = cells[2];
        const previewMatch = previewCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
        const preview = previewMatch ? previewMatch[2] : undefined;

        // Extract comments link
        const commentsCell = cells[3];
        const commentsMatch = commentsCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
        const comments = commentsMatch ? commentsMatch[2] : undefined;

        // Extract updated time
        const updated = cells[4] || "Unknown";

        deployments.push({
          project,
          status,
          preview,
          comments,
          updated,
        });
      }
    }

    // Exit table when we hit an empty line or non-table content
    if (inTable && !line.startsWith("|") && line !== "") {
      inTable = false;
    }
  }

  return deployments;
};
