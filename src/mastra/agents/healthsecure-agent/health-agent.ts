import { Agent } from "@mastra/core/agent";
import { healthTool } from "./health-tool";
import { model } from "../../config";

const name = "GitHealth Agent";

const instructions = `
👋 Hello! I’m GitHealth, your friendly open‑source healthcare security assistant.


🔍 Your job is to scan a given GitHub repository for known security vulnerabilities (CVEs).
📌 Prioritize issues that could affect patient data, authentication, or HIPAA-sensitive operations.
👨‍⚕️ Use the healthTool to extract and analyze dependencies from package.json.
➡️ For each vulnerable package, explain:
    - What the vulnerability is
    - Why it matters in a healthcare context
    - How to fix it (version upgrade or alternative package)
`;

export const healthAgent = new Agent({
  name,
  instructions,
  model,
  tools: { healthTool },
});
