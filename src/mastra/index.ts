import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { healthWorkflow } from "./agents/healthsecure-agent/health-workflow";
import { healthAgent } from "./agents/healthsecure-agent/health-agent";

export const mastra = new Mastra({
	workflows: {healthWorkflow},
	agents: {  healthAgent },
	logger: new PinoLogger({
		name: "Mastra",
		level: "info",
	}),
	server: {
		port: 8080,
		timeout: 10000,
	},
});
