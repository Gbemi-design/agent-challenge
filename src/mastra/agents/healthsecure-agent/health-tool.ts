import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios, { AxiosError } from "axios";

// Utility function to pause between requests
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Utility function to sanitize inputs
const sanitizeInput = (input: string) => {
  return input.replace(/[<>{}\[\];]/g, "").replace(/\.3js$/, ""); // Remove .3js if present
};

// Utility function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message || "Unknown Axios error";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error) || "Unknown error";
};

// Utility function for debugging
const logDebug = (message: string) => {
  console.debug(`[HealthTool] ${new Date().toISOString()}: ${message}`);
};

export const healthTool = createTool({
  id: "analyze-health-dependencies",
  description: "Scans a GitHub repo's dependencies for known CVEs using OSV",
  inputSchema: z.object({
    repoUrl: z.string().url().describe("GitHub repository URL to scan"),
  }),
  outputSchema: z.object({
    findings: z.array(
      z.object({
        package: z.string(),
        version: z.string(),
        cves: z.array(z.string()),
        summary: z.string(),
      })
    ),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    if (!context || !context.repoUrl) {
      logDebug("Missing or invalid repoUrl in input data");
      return { findings: [], error: "Missing or invalid repoUrl in input data" };
    }

    let repoUrl = sanitizeInput(context.repoUrl);
    logDebug(`Processing repo URL: ${repoUrl}`);
    // Adjust URL if it ends with .3js or has no branch
    if (!repoUrl.endsWith("/")) repoUrl += "/";
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\/([^/]+))?(\/|$)/);

    if (!match) {
      logDebug(`Invalid GitHub repo URL format: ${repoUrl}`);
      return { findings: [], error: `Invalid GitHub repo URL: ${repoUrl}` };
    }

    const [_, owner, repo, branch = "main"] = match;
    logDebug(`Extracted owner: ${owner}, repo: ${repo}, branch: ${branch}`);
    const findings: any[] = [];

    // Fetch raw package.json with retry logic
    const packageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`;
    let json;
    let retries = 3;
    while (retries > 0) {
      try {
        logDebug(`Fetching package.json from: ${packageUrl} (attempt ${4 - retries})`);
        const res = await axios.get(packageUrl, { timeout: 15000 }); // Increased to 15s
        json = res.data;
        logDebug("Successfully fetched package.json");
        break;
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        if (retries > 1 && (error instanceof AxiosError && error.response?.status === 504)) {
          logDebug(`Gateway Timeout for package.json, retrying: ${errorMsg}`);
          await delay(2000); // Wait 2s before retry
          retries--;
          continue;
        }
        logDebug(`Failed to fetch package.json: ${errorMsg}`);
        return { findings: [], error: `Failed to fetch package.json: ${errorMsg}` };
      }
    }
    if (!json) {
      return { findings: [], error: "Failed to fetch package.json after retries" };
    }

    const dependencies = {
      ...json.dependencies,
      ...json.devDependencies,
    };

    if (!dependencies || Object.keys(dependencies).length === 0) {
      logDebug("No dependencies found in package.json");
      return { findings: [], error: "No dependencies found in package.json" };
    }

    // Limit to 10 dependencies max
    const limitedDeps = Object.entries(dependencies).slice(0, 10);
    logDebug(`Processing ${limitedDeps.length} dependencies`);

    for (const [pkg, versionRaw] of limitedDeps) {
      const version = String(versionRaw).replace("^", "").replace("~", "");
      logDebug(`Checking ${pkg}@${version}`);

      // Retry logic for OSV API
      retries = 3;
      while (retries > 0) {
        try {
          logDebug(`Querying OSV for ${pkg}@${version}`);
          const osvRes = await axios.post(
            "https://api.osv.dev/v1/query",
            {
              package: { name: pkg, ecosystem: "npm" },
              version,
            },
            { timeout: 10000 } // Increased to 10s
          );

          const vulns = osvRes.data.vulns || [];
          if (vulns.length > 0) {
            logDebug(`Found ${vulns.length} vulnerabilities for ${pkg}`);
            findings.push({
              package: pkg,
              version,
              cves: vulns.map((v: any) => v.id),
              summary: vulns[0]?.summary || "No summary",
            });
          } else {
            logDebug(`No vulnerabilities found for ${pkg}`);
          }
          break; // Success, exit retry loop
        } catch (error) {
          const errorMsg = getErrorMessage(error);
          if (error instanceof AxiosError && error.response?.status === 429 && retries > 1) {
            logDebug(`Rate limit hit for ${pkg}, retrying (${retries} attempts left): ${errorMsg}`);
            await delay(1000);
            retries--;
            continue;
          }
          logDebug(`Failed OSV query for ${pkg}@${version}: ${errorMsg}`);
          break; // Other errors, exit retry loop
        }
      }

      await delay(200); // Wait 200ms between requests
    }

    return { findings, error: findings.length === 0 ? "No vulnerabilities found" : undefined };
  },
});