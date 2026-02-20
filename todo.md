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
    - [x] Implement `slashBond(uint256 _jobId)` internal/admin function.
    - [x] Add events for all major actions (JobPosted, JobAccepted, JobCompleted, JobDisputed).

- [x] **Implement `ReputationRegistry` Contract**
    - [x] Define `JobRecord` struct (jobId, rating, timestamp, bounty, evidenceHash).
    - [x] Implement `recordJob(address _worker, uint256 _jobId, uint8 _rating, uint256 _bounty)` function.
    - [x] Implement `updateScore(address _worker)` internal function.
    - [x] Implement `addEvidence(address _worker, uint256 _jobId, string _evidenceHash)` function.
    - [x] Implement `checkEligibility(address _worker, string _jobType)` view function.

- [x] **Implement `RewardEngine` Contract**
    - [x] Create ERC-20 token (e.g., `LazyToken`).
    - [x] Implement `issueRewards(address _worker, uint8 _rating)` function.
    - [x] Implement `updateCredit(address _worker)` internal function.
    - [x] Implement `getTier(address _worker)` view function.
    - [x] Implement `slash(address _worker, uint256 _amount)` function.

- [x] **Testing & Security**
    - [x] Write unit tests for all contracts (happy paths & edge cases).
    - [x] Test bonding and slashing mechanisms thoroughly.
    - [ ] Perform security audit (self-review or tools like Slither).

- [ ] **Deployment**
    - [ ] Deploy contracts to a testnet (e.g., Sepolia, Base Sepolia).
    - [ ] Verify contracts on Etherscan/Basescan.

## Phase 2: AI & Agent Integration (OpenClaw)

- [ ] **Setup OpenClaw**
    - [ ] Install and configure OpenClaw locally or on a server.
    - [ ] Connect OpenClaw to a chat interface (Telegram, WhatsApp, or Slack).

- [x] **Develop Agent Skills**
    - [x] **"Post Job" Skill:** Allow users to post bounties via chat (e.g., "I'm lazy, $500 for coffee").
        - [x] Parse user intent and extract job details.
        - [x] Interact with `LazyTaskMarketplace` to post the job.
    - [x] **"Verify Job Completion" Skill:** AI agent verifies evidence.
        - [x] Accept photo/video evidence URL.
        - [x] Use Vision LLM to analyze content (e.g., "Is this a cup of coffee?").
        - [x] Call `completeJob` on the contract if verified.
    - [ ] **"Wallet Integration" Skill:** Allow agent to sign transactions.
        - [ ] Securely manage keys (or use MPC/session keys).
        - [ ] Implement transaction signing for contract interactions.

- [ ] **Agentic Payments**
    - [ ] Explore and implement **x402** or **AP2** standards for autonomous payments.
    - [ ] Implement flow where agent initiates payment upon verification.

- [ ] **Dispute Resolution**
    - [ ] Implement multi-agent coordination for disputes (one verifies, one arbitrates).

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

- [ ] **Advanced Features**
    - [x] Implement "Kickbacks" (fee reduction for high-rep workers).
    - [ ] Implement NFT badges for milestones (e.g., "100 Jobs Completed").
    - [ ] Community governance for arbitrator rotation.

## Phase 5: Documentation & Launch

- [ ] **Documentation**
    - [ ] Create comprehensive `README.md`.
    - [ ] Document contract addresses and ABI usage.
    - [ ] Write guide for running the OpenClaw agent locally.

- [ ] **Launch Preparation**
    - [ ] Final end-to-end testing on testnet.
    - [ ] Prepare demo flow (Lazy message -> Agent post -> Worker accept -> Agent verify).
