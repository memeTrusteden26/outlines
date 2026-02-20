# LazyTask Marketplace

LazyTask Marketplace is a blockchain-based platform designed for "lazy" customers who are willing to pay a premium for convenience. It connects them with reliable workers who stake funds ("bond") to guarantee task completion. The system leverages AI agents for verification, dispute resolution, and automated payments, creating a trustless and efficient gig economy.

## 🚀 Core Concept

- **Lazy Bounties:** Customers post tasks with high bounties (e.g., "$500 for coffee delivery") via a simple chat interface.
- **Bonding/Staking:** Workers must stake funds ("skin in the game") to accept a job. If they fail or act maliciously, their bond is slashed.
- **Reputation System:** A portable, on-chain resume where successful jobs build reputation, unlocking higher tiers and rewards.
- **AI Verification:** AI agents (powered by OpenClaw) verify task completion evidence (e.g., photos) and automate payouts.

## 🏗 Architecture

The platform is built on three core smart contracts:

1.  **`LazyTaskMarketplace`**: The main contract handling job posting, matching, escrow, bonding, and completion logic.
2.  **`ReputationRegistry`**: Stores immutable job history and calculates worker reputation scores based on ratings and activity.
3.  **`RewardEngine`**: Manages the `LazyToken` (ERC-20) incentives, issuing rewards for high ratings and handling slashing for bad behavior.

## 🤖 AI Integration (OpenClaw)

We utilize **OpenClaw**, an open-source AI agent framework, to power the autonomous features:

-   **"Post Job" Skill**: Allows users to post tasks via chat apps (Telegram/WhatsApp) by simply saying "I'm lazy, need X done for $Y".
-   **"Verify Job Completion" Skill**: Agents analyze photo/video evidence submitted by workers using Vision LLMs to verify completion before releasing funds.
-   **Agentic Payments**: Agents can autonomously sign transactions and manage payments using standards like **x402** or **AP2**.

## 🛠 Tech Stack

-   **Smart Contracts**: Solidity, OpenZeppelin
-   **AI Framework**: OpenClaw (Local LLMs / Claude / OpenAI)
-   **Oracles**: Chainlink (for external data/AI verification if needed)
-   **Frontend**: React / Next.js (Planned)
-   **Blockchain**: Ethereum Testnet (Sepolia) / Base / Polygon

## 📦 Getting Started

### Prerequisites

-   Node.js & npm/yarn
-   Docker (for running OpenClaw)
-   Metamask or similar Web3 wallet

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/lazytask-marketplace.git
    cd lazytask-marketplace
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run OpenClaw (Agent):**
    Follow the [OpenClaw documentation](https://github.com/openclaw/openclaw) to set up your agent. Configure the `lazytask` skill in your agent's configuration.

4.  **Deploy Contracts (Local Hardhat Network):**
    ```bash
    npx hardhat node
    npx hardhat run scripts/deploy.js --network localhost
    ```

## 🔐 Security & Improvements

Recent updates have enhanced the security and reliability of the platform:

- **Gas Optimization**: Optimized job type checking using mappings to prevent gas griefing attacks.
- **Refund Logic**: Added safeguards in `acceptJob` to automatically refund excess bond payments.
- **Reputation Slashing**: Implemented `recordSlash` in `ReputationRegistry` to ensure that slashed bonds explicitly lower a worker's reputation score (recording a 0-rating job).
- **Wallet Integration**: Added a dedicated `walletManager` for secure agent key management.

## 📡 Smart Contract Addresses & ABI

To interact with the contracts, use the following addresses (after local deployment):

- **LazyTaskMarketplace**: `[Deploy to see address]`
- **ReputationRegistry**: `[Deploy to see address]`
- **RewardEngine**: `[Deploy to see address]`

Run `npx hardhat run scripts/deploy.js --network localhost` to deploy and see the addresses.

ABIs can be found in `artifacts/contracts/`.

## 🤖 Running the Agent

To run the AI agent skills locally:

1.  **Configure Environment**:
    Create a `.env` file in the root directory:
    ```env
    PRIVATE_KEY=your_private_key_here
    JSON_RPC_URL=http://127.0.0.1:8545
    ```

2.  **Use the Skills**:
    The agent skills are located in `scripts/agent-skills/`. You can integrate these into your OpenClaw agent or run them as standalone scripts.

    Example usage of `walletManager`:
    ```javascript
    const { getAgentWallet } = require("./scripts/agent-skills/walletManager");
    const wallet = getAgentWallet();
    // Use wallet to sign transactions
    ```

## 🗺 Roadmap

Check out [todo.md](./todo.md) for a detailed list of planned features and tasks.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
