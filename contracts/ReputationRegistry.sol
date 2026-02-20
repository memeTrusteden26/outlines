// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IBadgeNFT {
    function mintBadge(address to, uint256 badgeType) external;
}

contract ReputationRegistry is AccessControl {
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    address public badgeNFT;

    struct JobRecord {
        uint256 jobId;
        uint8 rating; // 1-5
        uint256 timestamp;
        uint256 bounty;
        string evidenceHash; // IPFS hash for photos/proofs
    }

    mapping(address => JobRecord[]) public workerHistory;
    mapping(address => uint256) public reputationScores;
    mapping(address => uint256) public totalRatings;
    mapping(string => uint256) public minReputationScores;

    event JobRecorded(address indexed worker, uint256 indexed jobId, uint8 rating);
    event EvidenceAdded(address indexed worker, uint256 indexed jobId, string evidenceHash);
    event ScoreUpdated(address indexed worker, uint256 newScore);
    event MinScoreSet(string jobType, uint256 minScore);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setBadgeNFT(address _badgeNFT) external onlyRole(DEFAULT_ADMIN_ROLE) {
        badgeNFT = _badgeNFT;
    }

    function setMinReputationScore(string memory _jobType, uint256 _score) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minReputationScores[_jobType] = _score;
        emit MinScoreSet(_jobType, _score);
    }

    // Record from Marketplace
    function recordJob(address _worker, uint256 _jobId, uint8 _rating, uint256 _bounty) external onlyRole(MARKETPLACE_ROLE) {
        workerHistory[_worker].push(JobRecord(_jobId, _rating, block.timestamp, _bounty, ""));
        totalRatings[_worker] += _rating;
        updateScore(_worker);

        // Check for Badge Milestones
        if (badgeNFT != address(0)) {
            uint256 count = workerHistory[_worker].length;
            if (count == 1) {
                IBadgeNFT(badgeNFT).mintBadge(_worker, 1); // Badge Type 1: First Step
            } else if (count == 5) {
                IBadgeNFT(badgeNFT).mintBadge(_worker, 2); // Badge Type 2: Reliable
            } else if (count == 10) {
                IBadgeNFT(badgeNFT).mintBadge(_worker, 3); // Badge Type 3: Expert
            }
        }

        emit JobRecorded(_worker, _jobId, _rating);
    }

    // Record a slashed job (rating 0)
    function recordSlash(address _worker, uint256 _jobId) external onlyRole(MARKETPLACE_ROLE) {
        workerHistory[_worker].push(JobRecord(_jobId, 0, block.timestamp, 0, ""));
        // totalRatings doesn't increase since rating is 0
        updateScore(_worker);
        emit JobRecorded(_worker, _jobId, 0);
    }

    // Update score (e.g., average + activity bonus)
    function updateScore(address _worker) internal {
        uint256 count = workerHistory[_worker].length;
        if (count == 0) return;

        // Simple average scaled by 100 (1-5 becomes 100-500)
        // O(1) calculation using tracked total
        reputationScores[_worker] = (totalRatings[_worker] * 100) / count;
        emit ScoreUpdated(_worker, reputationScores[_worker]);
    }

    // Challenge rating (worker adds evidence)
    function addEvidence(address _worker, uint256 _jobId, string memory _evidenceHash) public {
        // Allow worker to add evidence for their own job, or admin/marketplace
        require(msg.sender == _worker || hasRole(MARKETPLACE_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not authorized");

        JobRecord[] storage history = workerHistory[_worker];
        bool found = false;
        for (uint256 i = 0; i < history.length; i++) {
            if (history[i].jobId == _jobId) {
                history[i].evidenceHash = _evidenceHash;
                found = true;
                break;
            }
        }
        require(found, "Job not found");
        emit EvidenceAdded(_worker, _jobId, _evidenceHash);
    }

    // Check eligibility for job tiers
    function checkEligibility(address _worker, string memory _jobType) external view returns (bool) {
        uint256 requiredScore = minReputationScores[_jobType];
        if (requiredScore == 0) return true; // No requirement
        return reputationScores[_worker] >= requiredScore;
    }

    function getWorkerHistory(address _worker) external view returns (JobRecord[] memory) {
        return workerHistory[_worker];
    }

    function getJobCount(address _worker) external view returns (uint256) {
        return workerHistory[_worker].length;
    }
}
