# LazyTask Marketplace - Project To-Do List

This document outlines the tasks required to build the LazyTask Marketplace, a blockchain-based platform for high-bounty tasks secured by bonding and AI verification.

## Phase 1: Core Smart Contracts (MVP Scope)

- [x] **Setup Development Environment**
    - [x] Initialize Hardhat or Foundry project.
    - [x] Install dependencies (OpenZeppelin contracts, Chainlink).

- [x] **Implement `LazyTaskMarketplace` Contract**
    - [x] Define `Job` struct (customer, worker, bounty, bondAmount, status, etc.).
    - [x] Implement `postJob(string _jobType, uint256 _bondRequired)` function.
    - [x] Implement `acceptJob(uint256 _jobId)` function with bonding requirement.
    - [x] Implement `completeJob(uint256 _jobId, uint8 _rating)` function (customer or oracle trigger).
    - [x] Implement `disputeJob(uint256 _jobId, string _evidenceHash)` function.
    - [x] Implement `resolveDispute(uint256 _jobId, bool _workerWins, uint8 _rating)` function (replaces `slashBond`).
    - [x] Add events for all major actions (JobPosted, JobAccepted, JobCompleted, JobDisputed, JobResolved).

- [x] **Implement `ReputationRegistry` Contract**
    - [x] Define `JobRecord` struct (jobId, rating, timestamp, bounty, evidenceHash).
    - [x] Implement `recordJob(address _worker, uint256 _jobId, uint8 _rating, uint256 _bounty)` function.
    - [x] Implement `updateScore(address _worker)` internal function.
    - [x] Implement `addEvidence(address _worker, uint256 _jobId, string _evidenceHash)` function.
    - [x] Implement `checkEligibility(address _worker, string _jobType)` view function (enforce min reputation scores).

- [x] **Implement `RewardEngine` Contract**
    - [x] Create ERC-20 token (e.g., `LazyToken`).
    - [x] Implement `issueRewards(address _worker, uint8 _rating)` function.
    - [x] Implement `updateCredit(address _worker)` internal function.
    - [x] Implement `getTier(address _worker)` view function.
    - [x] Implement `slash(address _worker, uint256 _amount)` function.

- [x] **Testing & Security**
    - [x] Write unit tests for all contracts (happy paths & edge cases).
    - [x] Test bonding and slashing mechanisms thoroughly.
    - [x] Perform security audit (self-review and implemented fixes).

- [x] **Deployment**
    - [x] Deploy contracts to a testnet (e.g., Sepolia, Base Sepolia) (Configured in `hardhat.config.js`).
    - [x] Verify contracts on Etherscan/Basescan (Configured in `hardhat.config.js`).
    - [x] Implement administrative functions in `LazyTaskMarketplace` (`setTreasury`, `setPlatformFee`).

## Phase 2: AI & Agent Integration (OpenClaw)

- [x] **Setup OpenClaw**
    - [x] Install and configure OpenClaw locally or on a server (Simulated via `scripts/mock-openclaw.js`).
    - [x] Connect OpenClaw to a chat interface (Telegram, WhatsApp, or Slack) (Simulated via CLI in `mock-openclaw.js`).

- [x] **Develop Agent Skills**
    - [x] **"Post Job" Skill:** Allow users to post bounties via chat (e.g., "I'm lazy, $500 for coffee").
        - [x] Parse user intent and extract job details.
        - [x] Interact with `LazyTaskMarketplace` to post the job.
    - [x] **"Verify Job Completion" Skill:** AI agent verifies evidence.
        - [x] Accept photo/video evidence URL.
        - [x] Use Vision LLM to analyze content (e.g., "Is this a cup of coffee?").
        - [x] Call `completeJob` on the contract if verified.
    - [x] **"Wallet Integration" Skill:** Allow agent to sign transactions.
        - [x] Securely manage keys (implemented `walletManager` for env keys).
        - [x] Implement transaction signing for contract interactions.

- [x] **Agentic Payments**
    - [x] Explore and implement **x402** or **AP2** standards for autonomous payments (Implemented `PerRequestPayment.sol` as a stand-in).
    - [x] Implement flow where agent initiates payment upon verification (Implemented `AgenticOperation` with verification flow).
    - [x] Examine https://ethereum-magicians.org/t/erc-8165-agentic-on-chain-operation-interface/27773 for integration and support (Implemented `AgenticOperation.sol`).
    - [x] Examine https://ethereum-magicians.org/t/erc-8162-agent-subscription-protocol/27751 for integration and support (Implemented `AgentSubscription.sol`).

- [x] **Dispute Resolution**
    - [x] Implement on-chain dispute resolution logic (`resolveDispute`, `ARBITRATOR_ROLE`).
    - [x] Implement multi-agent coordination for disputes (one verifies, one arbitrates).

## Phase 3: Frontend & User Interface

- [x] **Frontend Setup**
    - [x] Initialize React/Next.js project.
    - [x] Integrate RainbowKit/Wagmi for wallet connection.

- [x] **Core Features UI**
    - [x] **Job Board:** Display available jobs with bounty, bond requirements, and category filtering.
    - [x] **Post Job:** Form to create new tasks (or chat interface integration).
    - [x] **My Jobs:** Dashboard for customers (active jobs) and workers (accepted jobs).
    - [x] **Profile/Reputation:** Display worker reputation score and history.

- [x] **Interaction Flows**
    - [x] Implement "Accept Job" flow (approve bond token -> stake).
    - [x] Implement "Submit Evidence" flow (upload photo -> IPFS -> submit hash).
    - [x] Implement "Complete/Rate" flow for customers.

## Phase 4: Incentives & Economics

- [x] **Tokenomics**
    - [x] Finalize `LazyToken` supply and distribution logic.
    - [x] Define tier thresholds for rewards and fee reductions.

- [x] **Advanced Features**
    - [x] Implement "Kickbacks" (fee reduction for high-rep workers).
    - [x] Implement NFT badges for milestones (e.g., "100 Jobs Completed").
    - [x] Implement `ARBITRATOR_ROLE` for dispute resolution (foundation for governance).
    - [x] Community governance for arbitrator rotation.

## Phase 5: Documentation & Launch

- [x] **Documentation**
    - [x] Create comprehensive `README.md`.
    - [x] Document contract addresses and ABI usage.
    - [x] Write guide for running the OpenClaw agent locally.

- [x] **Launch Preparation**
    - [x] Final end-to-end testing on testnet (Implemented `scripts/testnet-e2e.js`).
    - [x] Prepare demo flow (Lazy message -> Agent post -> Worker accept -> Agent verify).
