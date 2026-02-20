// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IReputationRegistry {
    function recordJob(address _worker, uint256 _jobId, uint8 _rating, uint256 _bounty) external;
    function checkEligibility(address _worker, string memory _jobType) external view returns (bool);
}

interface IRewardEngine {
    function issueRewards(address _worker, uint8 _rating) external;
    function slash(address _worker, uint256 _amount) external;
}

contract LazyTaskMarketplace is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    enum JobStatus { Posted, Accepted, Completed, Disputed, Rejected }

    struct Job {
        address customer;
        address worker;
        uint256 bounty;
        uint256 workerBond;
        uint256 timestamp;
        string jobType;
        JobStatus status;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public nextJobId;
    address public reputationRegistry;
    address public rewardEngine;

    event JobPosted(uint256 indexed jobId, address indexed customer, uint256 bounty, uint256 bondRequired);
    event JobAccepted(uint256 indexed jobId, address indexed worker);
    event JobCompleted(uint256 indexed jobId, address indexed worker, uint8 rating);
    event JobDisputed(uint256 indexed jobId, address indexed worker, string evidenceHash);
    event JobSlashed(uint256 indexed jobId, address indexed worker, uint256 amount);

    constructor(address _reputationRegistry, address _rewardEngine) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        reputationRegistry = _reputationRegistry;
        rewardEngine = _rewardEngine;
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
            status: JobStatus.Posted
        });
        emit JobPosted(jobId, msg.sender, msg.value, _bondRequired);
    }

    function acceptJob(uint256 _jobId) public payable {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Posted, "Job not available");
        require(msg.value >= job.workerBond, "Insufficient bond");

        // Check eligibility
        require(IReputationRegistry(reputationRegistry).checkEligibility(msg.sender, job.jobType), "Not eligible");

        job.worker = msg.sender;
        job.status = JobStatus.Accepted;

        emit JobAccepted(_jobId, msg.sender);
    }

    function completeJob(uint256 _jobId, uint8 _rating) public {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.customer || hasRole(ORACLE_ROLE, msg.sender), "Not authorized");
        require(job.status == JobStatus.Accepted, "Job not accepted");

        job.status = JobStatus.Completed;

        // Transfer bounty to worker
        payable(job.worker).transfer(job.bounty);

        // Return bond to worker
        if (job.workerBond > 0) {
            payable(job.worker).transfer(job.workerBond);
        }

        IReputationRegistry(reputationRegistry).recordJob(job.worker, _jobId, _rating, job.bounty);
        IRewardEngine(rewardEngine).issueRewards(job.worker, _rating);

        emit JobCompleted(_jobId, job.worker, _rating);
    }

    function disputeJob(uint256 _jobId, string memory _evidenceHash) public {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.worker, "Only worker can dispute");

        require(job.status == JobStatus.Accepted || job.status == JobStatus.Rejected, "Invalid status for dispute");

        job.status = JobStatus.Disputed;
        emit JobDisputed(_jobId, msg.sender, _evidenceHash);
    }

    function slashBond(uint256 _jobId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Disputed || job.status == JobStatus.Accepted, "Invalid status");

        uint256 bond = job.workerBond;
        if (bond > 0) {
            // Slash bond: send to customer as compensation
            payable(job.customer).transfer(bond);
            // Also slash tokens
            try IRewardEngine(rewardEngine).slash(job.worker, bond) {} catch {}
        }

        // Refund bounty to customer (since job is failed/slashed)
        if (job.bounty > 0) {
            payable(job.customer).transfer(job.bounty);
        }

        job.status = JobStatus.Rejected;
        emit JobSlashed(_jobId, job.worker, bond);
    }
}
