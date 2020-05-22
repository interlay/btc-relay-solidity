pragma solidity ^0.5.15;

import {SafeMath} from "@summa-tx/bitcoin-spv-sol/contracts/SafeMath.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@summa-tx/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {ValidateSPV} from "@summa-tx/bitcoin-spv-sol/contracts/ValidateSPV.sol";
import {Relay} from "./Relay.sol";

/// @title Testnet BTC Relay
contract TestRelay is Relay {
    using SafeMath for uint256;
    using BytesLib for bytes;
    using BTCUtils for bytes;
    using ValidateSPV for bytes;

    /**
    * @notice Initializes the relay with the provided block.
    * @param _header - genesis block header
    * @param _height - genesis block height
    */
    constructor(
        bytes memory _header,
        uint256 _height
    ) public Relay(_header, _height) {}

    /**
    * @notice Parses, validates and stores Bitcoin block header1 to mapping
    * @param _header Raw Bitcoin block header bytes (80 bytes)
    * @return bytes32 Bitcoin-like double sha256 hash of submitted block
    */
    function submitBlockHeader(bytes memory _header) public returns (bytes32) {
        require(_header.length == 80, ERR_INVALID_HEADER_SIZE);

        bytes32 hashPrevBlock = _header.extractPrevBlockLE().toBytes32();
        bytes32 hashCurrBlock = _header.hash256();

        // Fail if block already exists
        // Time is always set in block header struct (prevBlockHash and height can be 0 for Genesis block)
        require(headers[hashCurrBlock].merkle == 0, ERR_DUPLICATE_BLOCK);

        // Fail if previous block hash not in current state of main chain
        require(headers[hashPrevBlock].merkle != 0, ERR_PREVIOUS_BLOCK);

        uint256 target = _header.extractTarget();

        // Check the PoW solution matches the target specified in the block header
        require(abi.encodePacked(hashCurrBlock).reverseEndianness().bytesToUint() <= target, ERR_LOW_DIFFICULTY);

        uint256 _height = 1 + headers[hashPrevBlock].height;
        uint256 timestamp = _header.extractTimestamp();

        // NO DIFFICULTY CHECK

        bytes32 merkle = _header.extractMerkleRootLE().toBytes32();
        uint256 chainWork = headers[hashPrevBlock].chainWork + _header.extractDifficulty();

        uint256 chainId = headers[hashPrevBlock].chainId;
        bool isNewFork = forks[chainId].height != headers[hashPrevBlock].height;

        if (isNewFork) {
            chainId = incrementChainCounter();

            bytes32[] memory _descendants = new bytes32[](1);
            _descendants[0] = hashCurrBlock;

            // Initialise fork
            forks[chainId] = Fork({
                height: _height,
                ancestor: hashPrevBlock,
                descendants: _descendants
            });

            storeBlockHeader(
                hashCurrBlock,
                merkle,
                _height,
                target,
                timestamp,
                chainId,
                chainWork
            );
        } else {
            storeBlockHeader(
                hashCurrBlock,
                merkle,
                _height,
                target,
                timestamp,
                chainId,
                chainWork
            );

            if (chainId == MAIN_CHAIN_ID) {
                // check that the submitted block is extending the main chain
                require(chainWork > bestScore, ERR_NOT_EXTENSION);

                bestBlock = hashCurrBlock;
                bestHeight = _height;
                bestScore = chainWork;

                // extend height of main chain
                forks[chainId].height = _height;
                chain[_height] = hashCurrBlock;
            } else if (_height >= bestHeight + CONFIRMATIONS) {
                // reorg fork to main
                uint256 ancestorId = chainId;
                uint256 forkId = incrementChainCounter();
                uint256 forkHeight = _height - 1;

                while (ancestorId != MAIN_CHAIN_ID) {
                    for (uint i = forks[ancestorId].descendants.length; i > 0; i--) {
                        // get next descendant in fork
                        bytes32 _descendant = forks[ancestorId].descendants[i-1];
                        replaceChainElement(forkHeight, forkId, _descendant);
                        forkHeight--;
                    }

                    bytes32 ancestor = forks[ancestorId].ancestor;
                    ancestorId = headers[ancestor].chainId;
                }

                emit ChainReorg(bestBlock, hashCurrBlock, chainId);

                bestBlock = hashCurrBlock;
                bestHeight = _height;
                bestScore = chainWork;

                // TODO: add new fork struct for old main

                // extend to current head
                chain[bestHeight] = bestBlock;
                headers[bestBlock].chainId = MAIN_CHAIN_ID;
            } else {
                // extend fork
                forks[chainId].height = _height;
                forks[chainId].descendants.push(hashCurrBlock);
            }
        }
    }

}
