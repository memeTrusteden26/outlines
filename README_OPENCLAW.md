# OpenClaw Agent Setup for LazyTask Marketplace

This guide explains how to set up and run the OpenClaw AI agent for the LazyTask Marketplace.

## Overview

The OpenClaw agent acts as an automated verification layer. It listens for job postings, parses them, and verifies completed jobs using AI (simulated via mock scripts in this version).

## Prerequisites

1.  **Node.js**: Ensure Node.js is installed.
2.  **Deployed Contracts**: You must have deployed the contracts to a network (local or testnet).
    ```bash
    npx hardhat run scripts/deploy.js --network localhost
    ```
    This generates a `deployments.json` file which the agent uses to find the contracts.

## Setup

1.  **Environment Variables**:
    Create a `.env` file in the root directory if you haven't already:
    ```
    PRIVATE_KEY=your_private_key_here
    SEPOLIA_RPC_URL=your_rpc_url
    ```
    The agent script will use the account associated with `PRIVATE_KEY` (or the default Hardhat account if running locally) to interact with the blockchain.

2.  **Agent Role**:
    The agent address must have the `ORACLE_ROLE` in the `LazyTaskMarketplace` contract to complete jobs.
    - If you deployed using `scripts/deploy.js`, the deployer account is automatically granted this role.
    - If you use a different account for the agent, you must grant it the role manually.

## Running the Mock Agent

Since a full OpenClaw installation requires external dependencies, we provide a **Mock Agent** that simulates the core functionality via a command-line interface.

Run the mock agent:
```bash
node scripts/mock-openclaw.js
```

### Commands

Once inside the interactive shell (`OpenClaw>`), you can use the following commands:

-   **Post a Job**: Simulates a user asking the agent to post a job.
    ```
    post "Coffee" 0.05
    ```
    *Usage: `post <JobType> <BountyETH> [BondETH]`*

-   **Verify a Job**: Simulates the agent verifying evidence and completing the job.
    ```
    verify 1 https://ipfs.io/ipfs/QmHash...
    ```
    *Usage: `verify <JobId> <EvidenceURL>`*
    - If the URL contains "valid_coffee" or "valid_pizza", it will be approved.
    - Otherwise, it will be rejected (or rated low).

-   **Info**: Displays the agent's address and network.
    ```
    info
    ```

-   **Exit**: Quits the agent.
    ```
    exit
    ```

## Integration with Real OpenClaw

To integrate with a real OpenClaw instance (e.g., connected to Telegram/Discord):

1.  **Skills**: The scripts in `scripts/agent-skills/` (`postJob.js`, `verifyJob.js`) are designed to be modular.
2.  **Tool Definition**: Create an OpenClaw tool definition that wraps these scripts.
3.  **Permissions**: Ensure the wallet used by the OpenClaw instance has the `ORACLE_ROLE`.

## Troubleshooting

-   **"deployments.json not found"**: Run the deployment script first.
-   **"Marketplace not connected"**: Check if `deployments.json` contains the correct address for the `LazyTaskMarketplace`.
-   **Transaction Failures**: Ensure the agent account has enough ETH for gas.
