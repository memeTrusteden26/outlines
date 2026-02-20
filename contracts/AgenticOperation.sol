// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AgenticOperation {
    enum IntentStatus { Authored, Active, Solved, Executed, Verified, Failed }

    struct Intent {
        address author;
        string prompt; // Description or IPFS hash
        uint256 reward;
        address solver;
        IntentStatus status;
        uint256 timestamp;
    }

    mapping(uint256 => Intent) public intents;
    uint256 public nextIntentId;

    event IntentCreated(uint256 indexed intentId, address indexed author, string prompt, uint256 reward);
    event IntentSolved(uint256 indexed intentId, address indexed solver);
    event IntentExecuted(uint256 indexed intentId, address indexed executor);
    event IntentVerified(uint256 indexed intentId, bool success);

    function createIntent(string memory _prompt) external payable returns (uint256) {
        intents[nextIntentId] = Intent({
            author: msg.sender,
            prompt: _prompt,
            reward: msg.value,
            solver: address(0),
            status: IntentStatus.Active,
            timestamp: block.timestamp
        });
        emit IntentCreated(nextIntentId, msg.sender, _prompt, msg.value);
        return nextIntentId++;
    }

    function solveIntent(uint256 _intentId) external {
        Intent storage intent = intents[_intentId];
        require(intent.status == IntentStatus.Active, "Intent not active");
        intent.solver = msg.sender;
        intent.status = IntentStatus.Solved;
        emit IntentSolved(_intentId, msg.sender);
    }

    // In a real system, verify might be separate or involve oracles
    function executeAndVerify(uint256 _intentId, bool _success) external {
        Intent storage intent = intents[_intentId];
        require(intent.status == IntentStatus.Solved, "Intent not solved");
        require(msg.sender == intent.author, "Only author can verify (simplified)");

        if (_success) {
            intent.status = IntentStatus.Verified;
            (bool success, ) = payable(intent.solver).call{value: intent.reward}("");
            require(success, "Transfer failed");
        } else {
            intent.status = IntentStatus.Failed;
            (bool success, ) = payable(intent.author).call{value: intent.reward}("");
            require(success, "Refund failed");
        }
        emit IntentVerified(_intentId, _success);
    }
}
