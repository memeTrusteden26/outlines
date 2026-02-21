// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract RewardEngine is ERC20, ERC20Permit, ERC20Votes, AccessControl {
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    mapping(address => uint256) public creditScores;
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18;

    event RewardsIssued(address indexed worker, uint256 amount);
    event TokensSlashed(address indexed worker, uint256 amount);
    event CreditUpdated(address indexed worker, uint256 newScore);

    constructor() ERC20("LazyToken", "LAZY") ERC20Permit("LazyToken") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function issueRewards(address _worker, uint8 _rating) external onlyRole(MARKETPLACE_ROLE) {
        if (_rating >= 4) {
            uint256 rewardAmount = 100 * 10**decimals();
            if (totalSupply() + rewardAmount <= MAX_SUPPLY) {
                _mint(_worker, rewardAmount);
                emit RewardsIssued(_worker, rewardAmount);
            }
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

    // Overrides required by Solidity

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
