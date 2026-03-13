// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract LizardToken is ERC721, ERC721Enumerable, AccessControl {
    using Strings for uint256;

    uint256 private _nextTokenId;
    mapping(uint256 => string) public lizardNames;

    event LizardBorn(uint256 indexed tokenId, string name, address indexed owner);

    constructor() ERC721("Lizard Lab", "LZRD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(string memory name) external {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(name).length <= 32, "Name too long"); // prevent huge names

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        lizardNames[tokenId] = name;

        emit LizardBorn(tokenId, name, msg.sender);
    }

    function breed(uint256 parent1Id, uint256 parent2Id) external {
        require(ownerOf(parent1Id) == msg.sender, "Not owner of parent 1");
        require(ownerOf(parent2Id) == msg.sender, "Not owner of parent 2");

        string memory name1 = lizardNames[parent1Id];
        string memory name2 = lizardNames[parent2Id];

        // Simple concatenation logic: "Space" + "Lizard" -> "Space Lizard"
        string memory newName = string(abi.encodePacked(name1, " ", name2));

        require(bytes(newName).length <= 64, "Resulting name too long"); // slightly larger limit for combos

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        lizardNames[tokenId] = newName;

        emit LizardBorn(tokenId, newName, msg.sender);
    }

    // --- View Functions ---

    function getLizardsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 count = balanceOf(owner);
        uint256[] memory tokens = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokens;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory name = lizardNames[tokenId];

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "', name, '",',
                        '"description": "A unique lizard bred in the Lizard Lab.",',
                        '"attributes": [{"trait_type": "Name", "value": "', name, '"}]}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    // --- Overrides required by Solidity ---

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
