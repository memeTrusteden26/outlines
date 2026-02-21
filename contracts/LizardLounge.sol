// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./LizardToken.sol";

interface IReputationRegistry {
    function reputationScores(address _worker) external view returns (uint256);
    function setMinReputationScore(string memory _jobType, uint256 _score) external;
}

contract LizardLounge is AccessControl {
    struct Table {
        uint256 id;
        string name;
        string topic;
        address host;
        bool isPublic; // If true, anyone can join without approval (optional future use)
    }

    uint256 public nextTableId = 1; // 0 is the Main Lounge
    mapping(uint256 => Table) public tables;
    mapping(uint256 => mapping(address => bool)) public tableMembers;

    address public reputationRegistry;
    LizardToken public lizardToken;
    uint256 public constant MIN_REP_TO_ANNOUNCE = 100; // Minimum score to register a new skill

    mapping(address => uint256) public equippedLizard;
    mapping(address => bool) public hasEquipped;

    event TableCreated(uint256 indexed tableId, string name, address indexed host, string topic);
    event JoinRequested(uint256 indexed tableId, address indexed agent);
    event JoinApproved(uint256 indexed tableId, address indexed agent);
    event Message(uint256 indexed tableId, address indexed sender, string content, uint256 timestamp, string lizardName);
    event SkillAnnounced(address indexed agent, string skill);
    event MemberKicked(uint256 indexed tableId, address indexed agent);
    event LizardEquipped(address indexed user, uint256 tokenId);

    constructor(address _reputationRegistry, address _lizardToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        reputationRegistry = _reputationRegistry;
        lizardToken = LizardToken(_lizardToken);
    }

    // --- Social Features ---

    // ID 0 is the Main Lounge, open to all
    function postMessage(uint256 _tableId, string memory _content) external {
        if (_tableId != 0) {
            require(tableMembers[_tableId][msg.sender], "Not a member of this table");
        }

        string memory lizardName = "";
        if (hasEquipped[msg.sender]) {
            uint256 tokenId = equippedLizard[msg.sender];
            // verify ownership still holds
            try lizardToken.ownerOf(tokenId) returns (address owner) {
                if (owner == msg.sender) {
                    lizardName = lizardToken.lizardNames(tokenId);
                }
            } catch {
                // Token might not exist or other error, ignore
            }
        }

        emit Message(_tableId, msg.sender, _content, block.timestamp, lizardName);
    }

    // --- Lizard Features ---
    function equipLizard(uint256 tokenId) external {
        require(lizardToken.ownerOf(tokenId) == msg.sender, "You do not own this lizard");
        equippedLizard[msg.sender] = tokenId;
        hasEquipped[msg.sender] = true;
        emit LizardEquipped(msg.sender, tokenId);
    }

    // --- Table Management ---

    function createTable(string memory _name, string memory _topic) external returns (uint256) {
        uint256 tableId = nextTableId++;
        tables[tableId] = Table({
            id: tableId,
            name: _name,
            topic: _topic,
            host: msg.sender,
            isPublic: false
        });

        // Host is automatically a member
        tableMembers[tableId][msg.sender] = true;

        emit TableCreated(tableId, _name, msg.sender, _topic);
        return tableId;
    }

    function requestJoin(uint256 _tableId) external {
        require(tables[_tableId].host != address(0), "Table does not exist");
        require(!tableMembers[_tableId][msg.sender], "Already a member");
        emit JoinRequested(_tableId, msg.sender);
    }

    function approveJoin(uint256 _tableId, address _agent) external {
        require(tables[_tableId].host == msg.sender, "Only host can approve");
        tableMembers[_tableId][_agent] = true;
        emit JoinApproved(_tableId, _agent);
    }

    function kickMember(uint256 _tableId, address _agent) external {
        require(tables[_tableId].host == msg.sender, "Only host can kick");
        require(_agent != msg.sender, "Cannot kick self");
        tableMembers[_tableId][_agent] = false;
        emit MemberKicked(_tableId, _agent);
    }

    // --- Skill Generation ---

    function announceSkill(string memory _skill) external {
        // Check reputation
        uint256 score = IReputationRegistry(reputationRegistry).reputationScores(msg.sender);
        require(score >= MIN_REP_TO_ANNOUNCE, "Reputation too low to generate skill");

        // Register skill in ReputationRegistry (default min score 0)
        // This requires LizardLounge to have SKILL_REGISTRY_ROLE
        IReputationRegistry(reputationRegistry).setMinReputationScore(_skill, 0);

        emit SkillAnnounced(msg.sender, _skill);
    }
}
