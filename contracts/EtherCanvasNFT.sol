// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title EtherCanvasNFT
 * @dev Simple ERC-721 contract for the EtherCanvas NFT Studio.
 * Allows anyone to mint NFTs with sequential IDs, custom IPFS metadata URIs,
 * and emits a Minted event for on-chain indexing and live dApp updates.
 */
contract EtherCanvasNFT is ERC721URIStorage {
    uint256 private _nextTokenId;

    event Minted(address indexed to, uint256 indexed tokenId, string uri);

    constructor() ERC721("EtherCanvas", "ECANVAS") {
        _nextTokenId = 1;
    }

    /**
     * @notice Mints a new NFT with the specified metadata URI to the target address.
     * @dev Anyone can call this function. Token IDs increment sequentially.
     * @param to Address that will own the newly minted NFT
     * @param uri The IPFS or HTTPS metadata URI (e.g. ipfs://bafy...)
     * @return tokenId The ID of the newly created NFT
     */
    function mint(address to, string memory uri) public returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(uri).length > 0, "URI cannot be empty");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit Minted(to, tokenId, uri);

        return tokenId;
    }

    /**
     * @notice Returns the current total number of minted tokens.
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @notice Returns the next token ID that will be minted.
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
