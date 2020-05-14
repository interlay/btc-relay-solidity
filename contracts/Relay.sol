pragma solidity ^0.5.15;

import {SafeMath} from "@summa-tx/bitcoin-spv-sol/contracts/SafeMath.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@summa-tx/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {ValidateSPV} from "@summa-tx/bitcoin-spv-sol/contracts/ValidateSPV.sol";

import "@nomiclabs/buidler/console.sol";

/// @title BTC Relay contract.
/// @notice This Relay currently is WIP and assumes:
/// (i) constant difficulty
/// (ii) no forks occur on Bitcoin
contract Relay {
    using SafeMath for uint256;
    using BytesLib for bytes;
    using BTCUtils for bytes;
    using ValidateSPV for bytes;

    struct Header {
        bytes header; // 80 bytes block header
        uint256 height; // height of this block header
        uint256 chainWork; // accumulated PoW at this height
        uint256 chainId; // identifier of chain fork
        bytes32 prevHash; // previous block hash
    }

    // mapping of block hashes to block headers (ALL ever submitted, i.e., incl. forks)
    mapping(bytes32 => Header) public headers;

    // mapping of fork ids to best heights
    mapping(uint256 => uint256) public chains;

    // block with the most accumulated work, i.e., blockchain tip
    bytes32 public heaviestBlock;
    uint256 public highScore;

    // incrementing counter to track forks
    uint256 private chainCounter = 0;

    uint256 private mainChainId = 0;

    // header of the block at the start of the difficulty period
    bytes public epochStart;

    // CONSTANTS
    /*
    * Bitcoin difficulty constants
    */
    uint256 public constant DIFFICULTY_ADJUSTMENT_INTERVAL = 2016;
    uint256 public constant DIFF_TARGET = 0xffff0000000000000000000000000000000000000000000000000000;
    uint256 public constant TARGET_TIMESPAN = 14 * 24 * 60 * 60; // 2 weeks
    uint256 public constant UNROUNDED_MAX_TARGET = 2**224 - 1;
    uint256 public constant TARGET_TIMESPAN_DIV_4 = TARGET_TIMESPAN / 4; // store division as constant to save costs
    uint256 public constant TARGET_TIMESPAN_MUL_4 = TARGET_TIMESPAN * 4; // store multiplucation as constant to save costs

    // EVENTS
    /*
    * @param _digest block header hash of block header submitted for storage
    * @param _height height of the stored block
    */
    event StoreHeader(bytes32 indexed _digest, uint256 indexed _height);
    /*
    * @param _from previous best block hash
    * @param _to new best block hash
    * @param _id identifier of the fork triggering the reorg
    */
    event ChainReorg(bytes32 indexed _from, bytes32 indexed _to, uint256 indexed _id);

    // EXCEPTION MESSAGES
    string ERR_INVALID_HEADER_SIZE = "Invalid block header size";
    string ERR_DUPLICATE_BLOCK = "Block already stored";
    string ERR_PREV_BLOCK = "Previous block hash not found";
    string ERR_LOW_DIFF = "PoW hash does not meet difficulty target of header";
    string ERR_DIFF_TARGET_HEADER = "Incorrect difficulty target specified in block header";
    string ERR_NOT_MAIN_CHAIN = "Main chain submission indicated, but submitted block is on a fork";
    string ERR_FORK_PREV_BLOCK = "Previous block hash does not match last block in fork submission";
    string ERR_NOT_FORK = "Indicated fork submission, but block is in main chain";

    /**
    * @notice Initializes the relay with the provided block.
    * @param _header - genesis block header
    * @param _height - genesis block height
    */
    constructor(
        bytes memory _header,
        uint256 _height
    ) public {
        require(_header.length == 80, ERR_INVALID_HEADER_SIZE);
        bytes32 digest = _header.hash256();
        uint256 difficulty = _header.extractDifficulty();
        console.log("difficulty =", difficulty);
        uint256 chainId = mainChainId;

        heaviestBlock = digest;
        epochStart = _header;
        chains[chainId] = _height;

        storeBlockHeader(digest, _header, _height, chainId, difficulty);
    }

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
        require(headers[hashCurrBlock].header.length <= 0, ERR_DUPLICATE_BLOCK);
        // Fail if previous block hash not in current state of main chain
        require(headers[hashPrevBlock].header.length > 0, ERR_PREV_BLOCK);

        // Fails if previous block header is not stored
        uint256 chainWorkPrevBlock = headers[hashPrevBlock].chainWork;
        uint256 target = _header.extractTarget();
        uint256 _height = 1 + headers[hashPrevBlock].height;

        // Check the PoW solution matches the target specified in the block header
        require(abi.encodePacked(hashCurrBlock).reverseEndianness().bytesToUint() <= target, ERR_LOW_DIFF);
        // Check the specified difficulty target is correct
        require(isCorrectDifficultyTarget(
            epochStart,
            headers[hashPrevBlock].header,
            _header,
            _height
        ), ERR_DIFF_TARGET_HEADER);

        uint256 difficulty = _header.extractDifficulty();
        uint256 chainWork = chainWorkPrevBlock + difficulty;

        uint256 chainId = headers[hashPrevBlock].chainId;
        bool is_fork = chains[chainId] != headers[hashPrevBlock].height;

        if (is_fork) {
            chainCounter = chainCounter.add(1);
            chainId = chainCounter;
            console.log("Forking with chainId =", chainId);

            // Initialise fork height
            chains[chainId] = _height;

            storeBlockHeader(hashCurrBlock, _header, _height, chainId, chainWork);
        } else {
            // Check that the submitted block is extending the main chain
            require(chainWork > highScore, ERR_NOT_MAIN_CHAIN);

            if (chainId != mainChainId) {
                console.log("Chain reorg");
                emit ChainReorg(heaviestBlock, hashCurrBlock, chainId);
                mainChainId = chainId;
            }

            heaviestBlock = hashCurrBlock;
            highScore = chainWork;

            // Extend height of main chain
            chains[chainId] = _height;

            storeBlockHeader(hashCurrBlock, _header, _height, chainId, chainWork);
        }
    }

    function storeBlockHeader(
        bytes32 _digest,
        bytes memory _header,
        uint256 _height,
        uint256 _chainId,
        uint256 _chainWork
    ) private {
        console.log("Storing header at height", _height);
        headers[_digest].header = _header;
        headers[_digest].height = _height;
        headers[_digest].chainId = _chainId;
        headers[_digest].chainWork = _chainWork;
        headers[_digest].prevHash = _header.extractPrevBlockLE().toBytes32();
        emit StoreHeader(_digest, _height);
    }

    /*
    * @notice checks if the difficulty target should be adjusted at this block height
    * @param _height block height to be checked
    * @return true, if block _height is at difficulty adjustment interval, otherwise false
    */
    function shouldAdjustDifficulty(uint256 _height) private pure returns (bool){
        return _height % DIFFICULTY_ADJUSTMENT_INTERVAL == 0;
    }

    function isCorrectDifficultyTarget(
        bytes memory diffStartHeader,
        bytes memory prevBlockHeader,
        bytes memory currBlockHeader,
        uint256 _height
    ) public view returns (bool) {
        uint256 prevTarget = prevBlockHeader.extractTarget();
        uint256 currTarget = currBlockHeader.extractTarget();

        // console.log("prevTarget =", prevTarget);
        // console.log("currTarget =", currTarget);

        if(!shouldAdjustDifficulty(_height)) {
            if(currTarget != prevTarget && prevTarget != 0) {
                return false;
            }
        } else {
            require(
                diffStartHeader.extractDifficulty() == prevBlockHeader.extractDifficulty(),
                "invalid difficulty period"
            );

            uint256 expectedTarget = BTCUtils.retargetAlgorithm(
                diffStartHeader.extractTarget(),
                diffStartHeader.extractTimestamp(),
                prevBlockHeader.extractTimestamp()
            );

            return (currTarget & expectedTarget) == currTarget;
        }

        return true;
    }

    function isIncluded(bytes32 _parent, bytes32 _child, uint256 _index, uint256 _limit) internal view returns (uint256, bool) {
        if (_parent == _child) {
            return (_index, true);
        } else if (_index >= _limit) {
            return (_index, false);
        }

        return isIncluded(_parent, headers[_child].prevHash, _index.add(1), _limit);
    }

    function getBlockHeader(bytes32 _digest) public view returns (
        uint32 version,
        uint32 time,
        uint32 nonce,
        bytes32 prevBlockHash,
        bytes32 merkleRoot,
        uint256 target,
        uint256 height
    ) {
        bytes memory _header = headers[_digest].header;
        require(_header.length > 0, "header not found");
        version = uint32(_header.slice(0, 4).reverseEndianness().bytesToUint());
        time = uint32(_header.extractTimestampLE().bytesToUint());
        nonce = uint32(_header.slice(76, 4).reverseEndianness().bytesToUint());
        prevBlockHash = _header.extractPrevBlockLE().toBytes32();
        merkleRoot = _header.extractMerkleRootLE().toBytes32();
        target = _header.extractTarget();
        height = headers[_digest].height;
        return(version, time, nonce, prevBlockHash, merkleRoot, target, height);
    }
}
