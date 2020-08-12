// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {BytesLib} from '@interlay/bitcoin-spv-sol/contracts/BytesLib.sol';
import {BTCUtils} from '@interlay/bitcoin-spv-sol/contracts/BTCUtils.sol';
import {ValidateSPV} from '@interlay/bitcoin-spv-sol/contracts/ValidateSPV.sol';
import {Relay} from './Relay.sol';

/// @title Testnet BTC Relay
contract TestRelay is Relay {
    using SafeMath for uint256;
    using BytesLib for bytes;
    using BTCUtils for bytes;

    /**
     * @notice Initializes the relay with the provided block.
     * @param header Genesis block header
     * @param height Genesis block height
     */
    constructor(bytes memory header, uint32 height)
        public
        Relay(header, height)
    {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Override to remove the difficulty check
     */
    function _submitBlockHeader(bytes memory header) internal override {
        require(header.length == 80, ERR_INVALID_HEADER_SIZE);

        bytes32 hashPrevBlock = header.extractPrevBlockLE().toBytes32();
        bytes32 hashCurrBlock = header.hash256();

        // Fail if block already exists
        require(_headers[hashCurrBlock].height == 0, ERR_DUPLICATE_BLOCK);

        // Fail if previous block hash not in current state of main chain
        require(_headers[hashPrevBlock].height > 0, ERR_PREVIOUS_BLOCK);

        uint256 target = header.extractTarget();

        // Check the PoW solution matches the target specified in the block header
        require(
            abi.encodePacked(hashCurrBlock).reverseEndianness().bytesToUint() <=
                target,
            ERR_LOW_DIFFICULTY
        );

        uint32 height = 1 + _headers[hashPrevBlock].height;

        // NO DIFFICULTY CHECK

        uint256 chainId = _headers[hashPrevBlock].chainId;
        bool isNewFork = _forks[chainId].height !=
            _headers[hashPrevBlock].height;

        if (isNewFork) {
            chainId = _incrementChainCounter();
            _initializeFork(hashCurrBlock, hashPrevBlock, chainId, height);

            _storeBlockHeader(hashCurrBlock, height, chainId);
        } else {
            _storeBlockHeader(hashCurrBlock, height, chainId);

            if (chainId == MAIN_CHAIN_ID) {
                _bestBlock = hashCurrBlock;
                _bestHeight = height;

                // extend height of main chain
                _forks[chainId].height = height;
                _chain[height] = hashCurrBlock;
            } else if (height >= _bestHeight + CONFIRMATIONS) {
                _reorgChain(chainId, height, hashCurrBlock);
            } else {
                // extend fork
                _forks[chainId].height = height;
                _forks[chainId].descendants.push(hashCurrBlock);
            }
        }
    }
}
