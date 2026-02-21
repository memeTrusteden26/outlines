// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BadgeNFT is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 private _nextTokenId;
    string private _baseTokenURI;

    // Mapping from tokenId to badgeType
    mapping(uint256 => uint256) public badgeTypes;

    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 badgeType);

    constructor() ERC721("LazyBadge", "LZB") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _baseTokenURI = "https://api.lazytask.com/badges/";
    }

    function mintBadge(address to, uint256 badgeType) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        badgeTypes[tokenId] = badgeType;
        emit BadgeMinted(to, tokenId, badgeType);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = baseURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory base = _baseURI();
        return bytes(base).length > 0 ? string(abi.encodePacked(base, badgeTypes[tokenId].toString())) : "";
    }

    // Soulbound Implementation: Block transfers
    function transferFrom(address /*from*/, address /*to*/, uint256 /*tokenId*/) public virtual override {
        revert("BadgeNFT: Soulbound token cannot be transferred");
    }

    function safeTransferFrom(address /*from*/, address /*to*/, uint256 /*tokenId*/, bytes memory /*data*/) public virtual override {
        revert("BadgeNFT: Soulbound token cannot be transferred");
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
