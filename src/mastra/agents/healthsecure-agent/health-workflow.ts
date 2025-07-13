import { Agent } from "@mastra/core/agent";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { healthAgent } from "./health-agent";
import { healthTool } from "./health-tool";

// Step 1: Scan the repo
const scanRepo = createStep({
  id: "scan-health-dependencies",
  description: "Scans GitHub repo for vulnerable dependencies using OSV",
  inputSchema: z.object({
    repoUrl: z.string().url().describe("GitHub repository URL"),
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
  execute: async ({ inputData, runtimeContext }) => {
    if (!inputData.repoUrl) {
      return { findings: [], error: "Missing repoUrl in input data" };
    }

    const result = await healthTool.execute({
      context: { repoUrl: inputData.repoUrl },
      runtimeContext,
    });

    return result;
  },
});

// Step 2: Generate readable summary
const explainVulnerabilities = createStep({
  id: "summarize-security-issues",
  description: "Explains why vulnerabilities are critical and how to fix them",
  inputSchema: z.object({
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
  outputSchema: z.object({
    report: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.error) {
      return { report: `Error occurred: ${inputData.error}. Please verify the repository URL or ensure package.json exists.` };
    }

    const prompt = `
You are a cybersecurity analyst. Explain the following vulnerabilities in healthcare terms:

${JSON.stringify(inputData.findings, null, 2)}

- Identify which ones relate to patient data or system availability.
- Recommend how to patch or replace the packages.
- Use clear, simple language a tech lead can understand.
If no vulnerabilities are found, confirm the repository's health and suggest enabling GitHub Advanced Security for continuous monitoring.
`;

    const response = await healthAgent.stream([
      { role: "user", content: prompt },
    ]);

    let report = "";
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      report += chunk;
    }

    return { report };
  },
});

// Chain both steps
const healthWorkflow = createWorkflow({
  id: "healthsecure-workflow",
  inputSchema: z.object({
    repoUrl: z.string().url().describe("GitHub repository URL"),
  }),
  outputSchema: z.object({
    report: z.string(),
  }),
})
  .then(scanRepo)
  .then(explainVulnerabilities);

healthWorkflow.commit();

export { healthWorkflow };