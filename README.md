# LazyTaskDiamond

A modular, agentic marketplace on Ethereum for "lazy" bounties: Post overpaid tasks (e.g., $500 for coffee), workers bond and fulfill with AI-verified evidence, atomic settlement via intents, and on-chain reputation/rewards. Built with Diamond (EIP-2535) for upgradeability, ERC-8165-inspired workflows, and Foundry.

## Features
- Intent-based job posting (signed bounties with constraints).
- Worker bonding/slashing for toxicity mitigation.
- AI oracle verification (e.g., photo evidence for tasks).
- Atomic fulfillment with reputation updates.
- Use case: AI-verified coffee delivery bounty.

## Setup
1. Install Foundry: `curl -L https://foundry.paradigm.xyz | bash`
2. `forge install`
3. Test: `forge test`
4. Deploy: `forge script script/Deploy.s.sol --rpc-url <sepolia-url> --broadcast`

Dependencies: OpenZeppelin contracts (via remappings).

## Contracts
- LazyTaskIntentHub: Diamond proxy.
- Facets: SubmissionFacet, FulfillmentFacet.
- Libraries: LibDiamond.

MIT License.
