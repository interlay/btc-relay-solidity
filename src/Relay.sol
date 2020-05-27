pragma solidity ^0.5.15;

import {SafeMath} from "@summa-tx/bitcoin-spv-sol/contracts/SafeMath.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@summa-tx/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {ValidateSPV} from "@summa-tx/bitcoin-spv-sol/contracts/ValidateSPV.sol";
import {IRelay} from "./IRelay.sol";

/// @title BTC Relay
contract Relay is IRelay {
    using SafeMath for uint256;
    using BytesLib for bytes;
    using BTCUtils for bytes;
    using ValidateSPV for bytes;

    // TODO: optimize storage costs
    struct Header {
        bytes32 merkle; // merkle tree root
        uint256 height; // height of this block header
        uint256 target; // block target
        uint256 timestamp; // block timestamp
        uint256 chainWork; // accumulated PoW at this height
        uint256 chainId; // identifier of chain fork
    }

    // mapping of block hashes to block headers (ALL ever submitted, i.e., incl. forks)
    mapping(bytes32 => Header) public _headers;

    // main chain mapping for constant time inclusion check
    mapping(uint256 => bytes32) public _chain;

    struct Fork {
        uint256 height; // best height of fork
        bytes32 ancestor; // branched from this
        bytes32[] descendants; // references to submitted block headers
    }

    // mapping of ids to forks
    mapping(uint256 => Fork) public _forks;

    // block with the most accumulated work, i.e., blockchain tip
    bytes32 internal _bestBlock;
    uint256 internal _bestScore;
    uint256 internal _bestHeight;

    // incrementing counter to track forks
    // OPTIMIZATION: default to zero value
    uint256 private _chainCounter;

    // header of the block at the start of the difficulty period
    uint256 public _epochStartTarget;
    uint256 public _epochStartTime;

    // CONSTANTS
    /*
    * Bitcoin difficulty constants
    */
    uint256 public constant DIFFICULTY_ADJUSTMENT_INTERVAL = 2016;
    uint256 public constant DIFF_TARGET = 0xffff0000000000000000000000000000000000000000000000000000;

    uint256 public constant MAIN_CHAIN_ID = 0;
    uint256 public constant CONFIRMATIONS = 6;

    // EVENTS
    /*
    * @param _digest block header hash of block header submitted for storage
    * @param _height height of the stored block
    */
    event StoreHeader(bytes32 indexed digest, uint256 indexed height);
    /*
    * @param _from previous best block hash
    * @param _to new best block hash
    * @param _id identifier of the fork triggering the reorg
    */
    event ChainReorg(bytes32 indexed from, bytes32 indexed to, uint256 indexed id);

    // EXCEPTION MESSAGES
    // OPTIMIZATION: limit string length to 32 bytes
    string constant ERR_INVALID_HEADER_SIZE = "Invalid block header size";
    string constant ERR_DUPLICATE_BLOCK = "Block already stored";
    string constant ERR_PREVIOUS_BLOCK = "Previous block hash not found";
    string constant ERR_LOW_DIFFICULTY = "Insufficient difficulty";
    string constant ERR_DIFF_TARGET_HEADER = "Incorrect difficulty target";
    string constant ERR_DIFF_PERIOD = "Invalid difficulty period";
    string constant ERR_NOT_EXTENSION = "Not extension of chain";
    string constant ERR_BLOCK_NOT_FOUND = "Block not found";
    string constant ERR_CONFIRMS = "Insufficient confirmations";
    string constant ERR_VERIFY_TX = "Incorrect merkle proof";
    string constant ERR_INVALID_TXID = "Invalid tx identifier";

    /**
    * @notice Initializes the relay with the provided block.
    * @param header - genesis block header
    * @param height - genesis block height
    */
    constructor(
        bytes memory header,
        uint256 height
    ) public {
        require(header.length == 80, ERR_INVALID_HEADER_SIZE);
        bytes32 digest = header.hash256();
        bytes32 merkle = header.extractMerkleRootLE().toBytes32();
        uint256 target = header.extractTarget();
        uint256 timestamp = header.extractTimestamp();
        uint256 chainId = MAIN_CHAIN_ID;
        uint256 difficulty = header.extractDifficulty();

        _bestBlock = digest;
        _bestScore = difficulty;
        _bestHeight = height;

        _forks[chainId].height = height;
        _chain[height] = digest;

        _epochStartTarget = target;
        _epochStartTime = timestamp;

        _storeBlockHeader(
            digest,
            merkle,
            height,
            target,
            timestamp,
            chainId,
            difficulty
        );
    }

    /**
    * @notice Parses, validates and stores Bitcoin block header1 to mapping
    * @param header Raw Bitcoin block header bytes (80 bytes)
    * @return bytes32 Bitcoin-like double sha256 hash of submitted block
    */
    function submitBlockHeader(bytes calldata header) external returns (bytes32) {
        require(header.length == 80, ERR_INVALID_HEADER_SIZE);

        bytes32 hashPrevBlock = header.extractPrevBlockLE().toBytes32();
        bytes32 hashCurrBlock = header.hash256();

        // Fail if block already exists
        // Time is always set in block header struct (prevBlockHash and height can be 0 for Genesis block)
        require(_headers[hashCurrBlock].merkle == 0, ERR_DUPLICATE_BLOCK);

        // Fail if previous block hash not in current state of main chain
        require(_headers[hashPrevBlock].merkle != 0, ERR_PREVIOUS_BLOCK);

        uint256 target = header.extractTarget();

        // Check the PoW solution matches the target specified in the block header
        require(abi.encodePacked(hashCurrBlock).reverseEndianness().bytesToUint() <= target, ERR_LOW_DIFFICULTY);

        uint256 height = 1 + _headers[hashPrevBlock].height;
        uint256 timestamp = header.extractTimestamp();

        // Check the specified difficulty target is correct
        (bool valid, bool update) = isCorrectDifficultyTarget(
            _epochStartTarget,
            _epochStartTime,
            _headers[hashPrevBlock].target,
            _headers[hashPrevBlock].timestamp,
            target,
            height
        );

        require(valid, ERR_DIFF_TARGET_HEADER);
        if (update) {
            _epochStartTarget = target;
            _epochStartTime = timestamp;
        }

        bytes32 merkle = header.extractMerkleRootLE().toBytes32();
        uint256 chainWork = _headers[hashPrevBlock].chainWork + header.extractDifficulty();

        uint256 chainId = _headers[hashPrevBlock].chainId;
        bool isNewFork = _forks[chainId].height != _headers[hashPrevBlock].height;

        if (isNewFork) {
            chainId = _incrementChainCounter();

            bytes32[] memory descendants = new bytes32[](1);
            descendants[0] = hashCurrBlock;

            // Initialise fork
            _forks[chainId] = Fork({
                height: height,
                ancestor: hashPrevBlock,
                descendants: descendants
            });

            _storeBlockHeader(
                hashCurrBlock,
                merkle,
                height,
                target,
                timestamp,
                chainId,
                chainWork
            );
        } else {
            _storeBlockHeader(
                hashCurrBlock,
                merkle,
                height,
                target,
                timestamp,
                chainId,
                chainWork
            );

            if (chainId == MAIN_CHAIN_ID) {
                // check that the submitted block is extending the main chain
                require(chainWork > _bestScore, ERR_NOT_EXTENSION);

                _bestBlock = hashCurrBlock;
                _bestHeight = height;
                _bestScore = chainWork;

                // extend height of main chain
                _forks[chainId].height = height;
                _chain[height] = hashCurrBlock;
            } else if (height >= _bestHeight + CONFIRMATIONS) {
                // reorg fork to main
                uint256 ancestorId = chainId;
                uint256 forkId = _incrementChainCounter();
                uint256 forkHeight = height - 1;

                while (ancestorId != MAIN_CHAIN_ID) {
                    for (uint i = _forks[ancestorId].descendants.length; i > 0; i--) {
                        // get next descendant in fork
                        bytes32 descendant = _forks[ancestorId].descendants[i-1];
                        _replaceChainElement(forkHeight, forkId, descendant);
                        forkHeight--;
                    }

                    bytes32 ancestor = _forks[ancestorId].ancestor;
                    ancestorId = _headers[ancestor].chainId;
                }

                emit ChainReorg(_bestBlock, hashCurrBlock, chainId);

                _bestBlock = hashCurrBlock;
                _bestHeight = height;
                _bestScore = chainWork;

                // TODO: add new fork struct for old main

                // extend to current head
                _chain[_bestHeight] = _bestBlock;
                _headers[_bestBlock].chainId = MAIN_CHAIN_ID;
            } else {
                // extend fork
                _forks[chainId].height = height;
                _forks[chainId].descendants.push(hashCurrBlock);
            }
        }
    }

    function _storeBlockHeader(
        bytes32 digest,
        bytes32 merkle,
        uint256 height,
        uint256 target,
        uint256 timestamp,
        uint256 chainId,
        uint256 chainWork
    ) internal {
        _chain[height] = digest;
        _headers[digest] = Header({
            merkle: merkle,
            height: height,
            target: target,
            timestamp: timestamp,
            chainId: chainId,
            chainWork: chainWork
        });
        emit StoreHeader(digest, height);
    }

    function _incrementChainCounter() internal returns (uint256) {
        _chainCounter = _chainCounter.add(1);
        return _chainCounter;
    }

    function _replaceChainElement(uint256 height, uint256 id, bytes32 digest) internal {
        // promote header to main chain
        _headers[digest].chainId = MAIN_CHAIN_ID;
        // demote old header to new fork
        _headers[_chain[height]].chainId = id;
        // swap header at height
        _chain[height] = digest;
    }

    /*
    * @notice checks if the difficulty target should be adjusted at this block height
    * @param _height block height to be checked
    * @return true, if block _height is at difficulty adjustment interval, otherwise false
    */
    function _shouldAdjustDifficulty(uint256 height) internal pure returns (bool){
        return height % DIFFICULTY_ADJUSTMENT_INTERVAL == 0;
    }

    function isCorrectDifficultyTarget(
        uint256 prevStartTarget,    // period starting target
        uint256 prevStartTime,      // period starting timestamp
        uint256 prevEndTarget,      // period ending target
        uint256 prevEndTime,        // period ending timestamp
        uint256 nextTarget,
        uint256 height
    ) public pure returns (bool valid, bool update) {
        if(!_shouldAdjustDifficulty(height)) {
            if(nextTarget != prevEndTarget && prevEndTarget != 0) {
                return (false, false);
            }
        } else {
            require(
                BTCUtils.calculateDifficulty(prevStartTarget) == BTCUtils.calculateDifficulty(prevEndTarget),
                ERR_DIFF_PERIOD
            );

            uint256 expectedTarget = BTCUtils.retargetAlgorithm(
                prevStartTarget,
                prevStartTime,
                prevEndTime
            );

            return ((nextTarget & expectedTarget) == nextTarget, true);
        }
        return (true, false);
    }

    function getHeaderByHash(bytes32 _digest) external view returns (
        uint256 height,
        bytes32 merkle,
        uint256 target,
        uint256 time
    ) {
        Header storage head = _headers[_digest];
        require(head.merkle > 0, ERR_BLOCK_NOT_FOUND);
        time = head.timestamp;
        merkle = head.merkle;
        target = head.target;
        height = head.height;
        return(height, merkle, target, time);
    }

    function getHashAtHeight(uint256 height) external view returns (bytes32) {
        bytes32 digest = _chain[height];
        require(digest > 0, ERR_BLOCK_NOT_FOUND);
        return digest;
    }

    function getBestBlock() external view returns (bytes32 digest, uint256 score, uint256 height) {
        return (_bestBlock, _bestScore, _bestHeight);
    }

    /**
    * @notice verifies that a transaction is included in a block
    * @param height height of block that included transaction
    * @param index index of transaction in the block's tx merkle tree
    * @param txid transaction identifier
    * @param proof merkle proof
    * @param confirmations required confirmations (insecure)
    * @param insecure check custom inclusion confirmations
    * @return true if _txid is included, false otherwise
    */
    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        uint256 confirmations,
        bool insecure
    ) external view returns (bool) {
        require(txid != 0, ERR_INVALID_TXID);

        if (insecure) {
            require(
                height + confirmations <= _bestHeight,
                ERR_CONFIRMS
            );
        } else {
            require(
                height + CONFIRMATIONS <= _bestHeight,
                ERR_CONFIRMS
            );
        }

        bytes32 root = _headers[_chain[height]].merkle;
        require(
            ValidateSPV.prove(
                txid,
                root,
                proof,
                index
            ),
            ERR_VERIFY_TX
        );

        return true;
    }
}
