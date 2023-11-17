// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract XRC721 is ERC721 {
    uint256 private _tokenIdCounter;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
    }

    function mintToken(address tokenOwner)
        public
        returns (uint256)
    {

        uint256 newItemId = _tokenIdCounter;
        _safeMint(tokenOwner, newItemId);
        _tokenIdCounter += 1;

        return newItemId;
    }
}