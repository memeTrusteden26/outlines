// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IReputationRegistry {
    function recordJob(address _worker, uint256 _jobId, uint8 _rating, uint256 _bounty) external;
    function recordSlash(address _worker, uint256 _jobId) external;
    function checkEligibility(address _worker, string memory _jobType) external view returns (bool);
    function reputationScores(address _worker) external view returns (uint256);
    function getJobCount(address _worker) external view returns (uint256);
}

interface IRewardEngine {
    function issueRewards(address _worker, uint8 _rating) external;
    function slash(address _worker, uint256 _amount) external;
}

contract LazyTaskMarketplace is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    enum JobStatus { Posted, Accepted, Completed, Disputed, Rejected }

    struct Job {
        address customer;
        address worker;
        uint256 bounty;
        uint256 workerBond;
        uint256 timestamp;
        string jobType;
        JobStatus status;
        string evidenceHash;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public nextJobId;
    address public reputationRegistry;
    address public rewardEngine;
    address public treasury;
    uint256 public platformFeeBps = 500; // 5%
    string[] public activeJobTypes;
    mapping(bytes32 => bool) public activeJobTypesMap;

    event JobPosted(uint256 indexed jobId, address indexed customer, uint256 bounty, uint256 bondRequired);
    event JobAccepted(uint256 indexed jobId, address indexed worker);
    event JobCompleted(uint256 indexed jobId, address indexed worker, uint8 rating);
    event JobDisputed(uint256 indexed jobId, address indexed worker, string evidenceHash);
    event JobResolved(uint256 indexed jobId, bool workerWins);
    event JobSlashed(uint256 indexed jobId, address indexed worker, uint256 amount);
    event EvidenceSubmitted(uint256 indexed jobId, address indexed worker, string evidenceHash);
    event FeeTaken(uint256 indexed jobId, uint256 fee, uint256 workerEarnings);

    constructor(address _reputationRegistry, address _rewardEngine) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ARBITRATOR_ROLE, msg.sender);
        reputationRegistry = _reputationRegistry;
        rewardEngine = _rewardEngine;
        treasury = msg.sender;
    }

    function postJob(string memory _jobType, uint256 _bondRequired) public payable {
        require(msg.value > 0, "Bounty required");
        uint256 jobId = nextJobId++;
        jobs[jobId] = Job({
            customer: msg.sender,
            worker: address(0),
            bounty: msg.value,
            workerBond: _bondRequired,
            timestamp: block.timestamp,
            jobType: _jobType,
            status: JobStatus.Posted,
            evidenceHash: ""
        });

        bytes32 typeHash = keccak256(bytes(_jobType));
        if (!activeJobTypesMap[typeHash]) {
            activeJobTypesMap[typeHash] = true;
            activeJobTypes.push(_jobType);
        }

        emit JobPosted(jobId, msg.sender, msg.value, _bondRequired);
    }

    function getActiveJobTypes() external view returns (string[] memory) {
        return activeJobTypes;
    }

    function acceptJob(uint256 _jobId) public payable {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Posted, "Job not available");
        require(msg.value >= job.workerBond, "Insufficient bond");

        // Check eligibility
        require(IReputationRegistry(reputationRegistry).checkEligibility(msg.sender, job.jobType), "Not eligible");

        job.worker = msg.sender;
        job.status = JobStatus.Accepted;

        // Refund excess bond
        if (msg.value > job.workerBond) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - job.workerBond}("");
            require(success, "Refund failed");
        }

        emit JobAccepted(_jobId, msg.sender);
    }

    function submitEvidence(uint256 _jobId, string memory _evidenceHash) public {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.worker, "Only worker");
        require(job.status == JobStatus.Accepted, "Job not accepted");
        job.evidenceHash = _evidenceHash;
        emit EvidenceSubmitted(_jobId, msg.sender, _evidenceHash);
    }

    function completeJob(uint256 _jobId, uint8 _rating) public {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.customer || hasRole(ORACLE_ROLE, msg.sender), "Not authorized");
        require(job.status == JobStatus.Accepted, "Job not accepted");

        _finalizeJob(_jobId, _rating);
    }

    function _finalizeJob(uint256 _jobId, uint8 _rating) internal {
        Job storage job = jobs[_jobId];
        job.status = JobStatus.Completed;

        // Calculate Fee with Kickbacks
        uint256 score = IReputationRegistry(reputationRegistry).reputationScores(job.worker);
        uint256 count = IReputationRegistry(reputationRegistry).getJobCount(job.worker);
        uint256 feeBps = platformFeeBps;

        if (score >= 450 && count >= 5) {
            feeBps = 0; // Platinum: 0% fee
        } else if (score >= 400 && count >= 3) {
            feeBps = 250; // Gold: 2.5% fee
        }

        uint256 fee = (job.bounty * feeBps) / 10000;
        uint256 workerEarnings = job.bounty - fee;

        // Transfer bounty to worker
        (bool success, ) = payable(job.worker).call{value: workerEarnings}("");
        require(success, "Transfer failed");

        if (fee > 0) {
            (bool feeSuccess, ) = payable(treasury).call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        // Return bond to worker
        if (job.workerBond > 0) {
            (bool bondSuccess, ) = payable(job.worker).call{value: job.workerBond}("");
            require(bondSuccess, "Bond transfer failed");
        }

        IReputationRegistry(reputationRegistry).recordJob(job.worker, _jobId, _rating, job.bounty);
        IRewardEngine(rewardEngine).issueRewards(job.worker, _rating);

        emit JobCompleted(_jobId, job.worker, _rating);
        emit FeeTaken(_jobId, fee, workerEarnings);
    }

    function disputeJob(uint256 _jobId, string memory _evidenceHash) public {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.worker, "Only worker can dispute");

        require(job.status == JobStatus.Accepted || job.status == JobStatus.Rejected, "Invalid status for dispute");

        job.status = JobStatus.Disputed;
        emit JobDisputed(_jobId, msg.sender, _evidenceHash);
    }

    function resolveDispute(uint256 _jobId, bool _workerWins, uint8 _rating) external onlyRole(ARBITRATOR_ROLE) {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Disputed, "Job not disputed");

        if (_workerWins) {
            _finalizeJob(_jobId, _rating);
        } else {
            uint256 bond = job.workerBond;
            if (bond > 0) {
                // Slash bond: send to customer as compensation
                (bool success, ) = payable(job.customer).call{value: bond}("");
                require(success, "Bond transfer failed");
                // Also slash tokens
                try IRewardEngine(rewardEngine).slash(job.worker, bond) {} catch {}
            }

            // Record slash in reputation registry (penalize score)
            try IReputationRegistry(reputationRegistry).recordSlash(job.worker, _jobId) {} catch {}

            // Refund bounty to customer (since job is failed/slashed)
            if (job.bounty > 0) {
                (bool success, ) = payable(job.customer).call{value: job.bounty}("");
                require(success, "Bounty refund failed");
            }

            job.status = JobStatus.Rejected;
            emit JobSlashed(_jobId, job.worker, bond);
        }

        emit JobResolved(_jobId, _workerWins);
    }
}
