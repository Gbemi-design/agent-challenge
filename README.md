==========================================
      GitHealth Agent - README Document
=======================================

🔍 AGENT DESCRIPTION & PURPOSE

The GitHealth Agent is an AI-powered cybersecurity tool designed to enhance the security of open-source healthcare applications. Built using the Mastra framework, this agent scans GitHub repositories for known vulnerabilities (CVEs) in their dependencies by leveraging the OSV API.

---

🧠 SUPPORTED TOOLS
------------------

1. check-crypto-token

   - Retrieves price, FDV, symbol, volume
   - Requires: Token address
2. get-top-solana-holders

   - Lists top holders
   - Requires: Token address
3. get-newly-bonded-tokens

   - Lists fresh Solana token launches
   - Requires: None
4. get-wallet-swap-history

   - Fetches swap history of wallet
   - Requires: Wallet address

==========================================
⚙️ SETUP INSTRUCTIONS (LOCAL DEVELOPMENT)
===========================================

1. Clone the repository:
   git clone https://github.com/pinnoche/agent-challenge.git
   cd agent-challenge
2. Install dependencies:
   pnpm install
3. Start the development server:
   pnpm run dev

   The Playground will be available at:
   http://localhost:8080

==========================================
🔐 ENVIRONMENT VARIABLES
========================

Create a .env or .env.docker file with the following:

MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
API_BASE_URL=http://127.0.0.1:11434/api
MORALIS_API_KEY=moralis_api_key

(* Do NOT commit your .env file. Instead, create a .env.example without secrets. *)

==========================================
🐳 DOCKER COMMANDS
==================

1. Build the Docker image:
   docker build -t pinnoche/agent-challenge:latest .
2. Run the Docker container:
   docker run -p 8080:8080 --env-file .env.docker pinnoche/agent-challenge:latest

==========================================
🚀 NOSANA DEPLOYMENT
====================

To deploy on Nosana:

1. Update the nosana_mastra.json job file:

   - Add your Docker image under "image"
   - Include environment variables
2. Deploy via CLI:
   nosana job post --file ./nos_job_def/nosana_mastra.json --market nvidia-3090 --timeout 30
3. View your job at:
   https://dashboard.nosana.com

==========================================
💬 EXAMPLE USAGE
================

Send a request to the deployed endpoint:

curl -X POST https://`<your-url>`/api/agent/cryptoAgent 
  -H "Content-Type: application/json" 
  -d '{"input": "What is the price of token 6U7zJ7Y9TJkQeyzChJKfiDpoaSbEfJeK9NdqMuZxBvQz?"}'

==========================================
📌 NOTES
========

- This agent uses Ollama LLM (qwen2.5:1.5b).
- Mastra Playground should be accessible at http://localhost:8080 during local dev.
- On production builds or headless runs, only the API is exposed (no UI).

==========================================
📌 LINKS
========

Video Link: https://youtu.be/2yxo9pFAfUc

Docker Hub Link: https://hub.docker.com/r/pinnoche/agent-challenge

Twitter (X) Link: https://x.com/Dmj_wise/status/1941600313271525868
