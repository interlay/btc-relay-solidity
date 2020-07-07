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

    // TODO: optimize storage costs
    struct Header {
        bool exists;
        uint32 height; // height of this block header
        uint64 chainId; // identifier of chain fork
    }

    // mapping of block hashes to block headers (ALL ever submitted, i.e., incl. forks)
    mapping(bytes32 => Header) public _headers;

    // main chain mapping for constant time inclusion check
    mapping(uint32 => bytes32) public _chain;

    struct Fork {
        uint32 height; // best height of fork
        bytes32 ancestor; // branched from this
        bytes32[] descendants; // references to submitted block headers
    }

    // mapping of ids to forks
    mapping(uint256 => Fork) public _forks;

    // incrementing counter to track forks
    // OPTIMIZATION: default to zero value
    uint256 private _chainCounter;

    // target of the difficulty period
    uint256 public _epochStartTarget;
    uint256 public _epochEndTarget;

    uint64 public _epochStartTime;
    uint64 public _epochEndTime;

    // block with the most accumulated work, i.e., blockchain tip
    uint32 internal _bestHeight;
    bytes32 internal _bestBlock;

    // CONSTANTS
    uint256 public constant DIFFICULTY_ADJUSTMENT_INTERVAL = 2016;
    uint256 public constant MAIN_CHAIN_ID = 0;
    uint256 public constant CONFIRMATIONS = 6;

    // EXCEPTION MESSAGES
    // OPTIMIZATION: limit string length to 32 bytes
    string constant ERR_INVALID_HEADER_SIZE = "Invalid block header size";
    string constant ERR_INVALID_HEADER_BATCH = "Invalid block header batch";
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
        uint32 height
    ) public {
        require(header.length == 80, ERR_INVALID_HEADER_SIZE);
        bytes32 digest = header.hash256();
        uint256 target = header.extractTarget();
        uint64 timestamp = header.extractTimestamp();
        uint256 chainId = MAIN_CHAIN_ID;

        _bestBlock = digest;
        _bestHeight = height;

        _forks[chainId].height = height;
        _chain[height] = digest;

        _epochStartTarget = target;
        _epochStartTime = timestamp;
        _epochEndTarget = target;
        _epochEndTime = timestamp;

        _storeBlockHeader(
            digest,
            height,
            chainId
        );
    }

    function _submitBlockHeader(bytes memory header) internal {
        require(header.length == 80, ERR_INVALID_HEADER_SIZE);

        bytes32 hashPrevBlock = header.extractPrevBlockLE().toBytes32();
        bytes32 hashCurrBlock = header.hash256();

        // Fail if block already exists
        require(!_headers[hashCurrBlock].exists, ERR_DUPLICATE_BLOCK);

        // Fail if previous block hash not in current state of main chain
        require(_headers[hashPrevBlock].exists, ERR_PREVIOUS_BLOCK);

        uint256 target = header.extractTarget();

        // Check the PoW solution matches the target specified in the block header
        require(abi.encodePacked(hashCurrBlock).reverseEndianness().bytesToUint() <= target, ERR_LOW_DIFFICULTY);

        uint32 height = 1 + _headers[hashPrevBlock].height;

        // Check the specified difficulty target is correct

        uint64 timestamp = header.extractTimestamp();
        if (_shouldAdjustDifficulty(height)) {
            require(isCorrectDifficultyTarget(
                _epochStartTarget,
                _epochStartTime,
                _epochEndTarget,
                _epochEndTime,
                target
            ), ERR_DIFF_TARGET_HEADER);

            _epochStartTarget = target;
            _epochStartTime = timestamp;
        } else {
            // if(nextTarget != prevEndTarget && prevEndTarget != 0) {
            //     return (false, false);
            // }
            _epochEndTarget = target;
            _epochEndTime = timestamp;
        }

        uint256 chainId = _headers[hashPrevBlock].chainId;
        bool isNewFork = _forks[chainId].height != _headers[hashPrevBlock].height;

        if (isNewFork) {
            chainId = _incrementChainCounter();
            _initializeFork(hashCurrBlock, hashPrevBlock, chainId, height);

            _storeBlockHeader(
                hashCurrBlock,
                height,
                chainId
            );
        } else {
            _storeBlockHeader(
                hashCurrBlock,
                height,
                chainId
            );

            if (chainId == MAIN_CHAIN_ID) {
                _bestBlock = hashCurrBlock;
                _bestHeight = height;

                // extend height of main chain
                _forks[chainId].height = height;
                _chain[height] = hashCurrBlock;

            } else if (height >= _bestHeight + CONFIRMATIONS) {
                // with sufficient confirmations, reorg
                _reorgChain(chainId, height, hashCurrBlock);

            } else {
                // extend fork
                _forks[chainId].height = height;
                _forks[chainId].descendants.push(hashCurrBlock);

            }
        }
    }

    function submitBlockHeader(bytes calldata header) external {
        _submitBlockHeader(header);
    }

    function submitBlockHeaderBatch(bytes calldata headers) external {
        require(headers.length % 80 == 0, ERR_INVALID_HEADER_BATCH);

        for (uint256 i = 0; i < headers.length / 80; i = i.add(1)) {
            bytes memory header = headers.slice(i.mul(80), 80);
            _submitBlockHeader(header);
        }
    }

    function _storeBlockHeader(
        bytes32 digest,
        uint32 height,
        uint256 chainId
    ) internal {
        _chain[height] = digest;
        _headers[digest].exists = true;
        _headers[digest].height = height;
        _headers[digest].chainId = uint64(chainId);
        emit StoreHeader(digest, height);
    }

    function _incrementChainCounter() internal returns (uint256) {
        _chainCounter = _chainCounter.add(1);
        return _chainCounter;
    }

    function _initializeFork(bytes32 hashCurrBlock, bytes32 hashPrevBlock, uint chainId, uint32 height) internal {
        bytes32[] memory descendants = new bytes32[](1);
        descendants[0] = hashCurrBlock;

        _forks[chainId].height = height;
        _forks[chainId].ancestor = hashPrevBlock;
        _forks[chainId].descendants = descendants;
    }

    function _reorgChain(uint chainId, uint32 height, bytes32 hashCurrBlock) internal {
        // reorg fork to main
        uint256 ancestorId = chainId;
        uint256 forkId = _incrementChainCounter();
        uint32 forkHeight = height - 1;

        // TODO: add new fork struct for old main

        while (ancestorId != MAIN_CHAIN_ID) {
            for (uint i = _forks[ancestorId].descendants.length; i > 0; i--) {
                // get next descendant in fork
                bytes32 descendant = _forks[ancestorId].descendants[i-1];
                // promote header to main chain
                _headers[descendant].chainId = uint64(MAIN_CHAIN_ID);
                // demote old header to new fork
                _headers[_chain[height]].chainId = uint64(forkId);
                // swap header at height
                _chain[height] = descendant;
                forkHeight--;
            }

            bytes32 ancestor = _forks[ancestorId].ancestor;
            ancestorId = _headers[ancestor].chainId;
        }

        emit ChainReorg(_bestBlock, hashCurrBlock, chainId);

        _bestBlock = hashCurrBlock;
        _bestHeight = height;

        delete _forks[chainId];

        // extend to current head
        _chain[_bestHeight] = _bestBlock;
        _headers[_bestBlock].chainId = uint64(MAIN_CHAIN_ID);
    }

    /*
    * @notice checks if the difficulty target should be adjusted at this block height
    * @param _height block height to be checked
    * @return true, if block _height is at difficulty adjustment interval, otherwise false
    */
    function _shouldAdjustDifficulty(uint32 height) internal pure returns (bool){
        return height % DIFFICULTY_ADJUSTMENT_INTERVAL == 0;
    }

    function isCorrectDifficultyTarget(
        uint256 prevStartTarget,   // period starting target
        uint64 prevStartTime,      // period starting timestamp
        uint256 prevEndTarget,     // period ending target
        uint64 prevEndTime,        // period ending timestamp
        uint256 nextTarget
    ) public pure returns (bool) {
        require(
            BTCUtils.calculateDifficulty(prevStartTarget) == BTCUtils.calculateDifficulty(prevEndTarget),
            ERR_DIFF_PERIOD
        );

        uint256 expectedTarget = BTCUtils.retargetAlgorithm(
            prevStartTarget,
            prevStartTime,
            prevEndTime
        );

        return (nextTarget & expectedTarget) == nextTarget;
    }

    function getBlockHeight(bytes32 digest) external view returns (uint32) {
        return _headers[digest].height;
    }

    function getBlockHash(uint32 height) external view returns (bytes32) {
        bytes32 digest = _chain[height];
        require(digest > 0, ERR_BLOCK_NOT_FOUND);
        return digest;
    }

    function getBestBlock() external view returns (bytes32 digest, uint32 height) {
        return (_bestBlock, _bestHeight);
    }

    function verifyTx(
        uint32 height,
        uint256 index,
        bytes32 txid,
        bytes calldata header,
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

        require(_chain[height] == header.hash256(), ERR_BLOCK_NOT_FOUND);
        bytes32 root = header.extractMerkleRootLE().toBytes32();
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
