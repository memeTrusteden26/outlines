// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";

interface ILazyTaskMarketplace {
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function ARBITRATOR_ROLE() external view returns (bytes32);
}

contract ArbitratorGovernance is AccessControl {
    IVotes public token;
    ILazyTaskMarketplace public marketplace;

    struct Proposal {
        uint256 id;
        address proposer;
        address candidate;
        uint256 snapshotBlock;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        mapping(address => bool) hasVoted;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    uint256 public votingDuration = 1 days;
    uint256 public minProposalThreshold = 100 * 10**18;

    event ProposalCreated(uint256 indexed id, address indexed proposer, address indexed candidate, uint256 snapshotBlock, uint256 endTime);
    event Voted(uint256 indexed id, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id, address indexed candidate);

    constructor(address _token, address _marketplace) {
        token = IVotes(_token);
        marketplace = ILazyTaskMarketplace(_marketplace);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setVotingDuration(uint256 _duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingDuration = _duration;
    }

    function propose(address _candidate) external returns (uint256) {
        require(token.getVotes(msg.sender) >= minProposalThreshold, "Insufficient votes to propose");

        proposalCount++;
        Proposal storage p = proposals[proposalCount];
        p.id = proposalCount;
        p.proposer = msg.sender;
        p.candidate = _candidate;
        p.snapshotBlock = block.number - 1;
        p.endTime = block.timestamp + votingDuration;

        emit ProposalCreated(proposalCount, msg.sender, _candidate, p.snapshotBlock, p.endTime);
        return proposalCount;
    }

    function vote(uint256 _proposalId, bool _support) external {
        Proposal storage p = proposals[_proposalId];
        require(block.timestamp <= p.endTime, "Voting ended");
        require(!p.hasVoted[msg.sender], "Already voted");

        uint256 weight = token.getPastVotes(msg.sender, p.snapshotBlock);
        require(weight > 0, "No voting power");

        p.hasVoted[msg.sender] = true;
        if (_support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }

        emit Voted(_proposalId, msg.sender, _support, weight);
    }

    function execute(uint256 _proposalId) external {
        Proposal storage p = proposals[_proposalId];
        require(block.timestamp > p.endTime, "Voting not ended");
        require(!p.executed, "Already executed");

        require(p.forVotes > p.againstVotes, "Proposal failed");

        p.executed = true;

        // Grant new role
        bytes32 role = marketplace.ARBITRATOR_ROLE();
        marketplace.grantRole(role, p.candidate);

        emit ProposalExecuted(_proposalId, p.candidate);
    }
}
