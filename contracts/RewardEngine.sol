// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract RewardEngine is ERC20, AccessControl {
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    mapping(address => uint256) public creditScores;

    event RewardsIssued(address indexed worker, uint256 amount);
    event TokensSlashed(address indexed worker, uint256 amount);
    event CreditUpdated(address indexed worker, uint256 newScore);

    constructor() ERC20("LazyToken", "LAZY") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function issueRewards(address _worker, uint8 _rating) external onlyRole(MARKETPLACE_ROLE) {
        if (_rating >= 4) {
            uint256 rewardAmount = 100 * 10**decimals();
            _mint(_worker, rewardAmount);
            emit RewardsIssued(_worker, rewardAmount);
            updateCredit(_worker);
        }
    }

    function updateCredit(address _worker) internal {
        // Ideally this queries ReputationRegistry, but for now simplify.
        // Assume credit score increases with rewards?
        creditScores[_worker] += 10;
        emit CreditUpdated(_worker, creditScores[_worker]);
    }

    function getTier(address _worker) public view returns (uint8) {
        // Simple tier logic based on credit score
        if (creditScores[_worker] > 100) return 2;
        if (creditScores[_worker] > 50) return 1;
        return 0;
    }

    function slash(address _worker, uint256 _amount) external onlyRole(MARKETPLACE_ROLE) {
        _burn(_worker, _amount);
        emit TokensSlashed(_worker, _amount);
    }
}
