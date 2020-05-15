pragma solidity ^0.5.15;

import {SafeMath} from "@summa-tx/bitcoin-spv-sol/contracts/SafeMath.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@summa-tx/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {ValidateSPV} from "@summa-tx/bitcoin-spv-sol/contracts/ValidateSPV.sol";

/// @title BTC Relay
contract Relay {
    using SafeMath for uint256;
    using BytesLib for bytes;
    using BTCUtils for bytes;
    using ValidateSPV for bytes;

    struct Header {
        bytes32 merkle; // merkle tree root
        uint256 height; // height of this block header
        uint256 target;
        uint256 timestamp;

        uint256 chainWork; // accumulated PoW at this height
        uint256 chainId; // identifier of chain fork
    }

    // mapping of block hashes to block headers (ALL ever submitted, i.e., incl. forks)
    mapping(bytes32 => Header) public headers;

    mapping(uint256 => bytes32) public chain;

    struct Fork {
        uint256 height; // best height of fork
        bytes32 ancestor; // branched from this
        bytes32[] descendants; // references to submitted block headers
    }

    // mapping of ids to forks
    mapping(uint256 => Fork) public forks;

    // block with the most accumulated work, i.e., blockchain tip
    bytes32 public bestBlock;
    uint256 public bestScore;
    uint256 public bestHeight;

    // incrementing counter to track forks
    uint256 private chainCounter = 0;

    // header of the block at the start of the difficulty period
    uint256 public epochStartTarget;
    uint256 public epochStartTime;

    // CONSTANTS
    /*
    * Bitcoin difficulty constants
    */
    uint256 public constant DIFFICULTY_ADJUSTMENT_INTERVAL = 2016;
    uint256 public constant DIFF_TARGET = 0xffff0000000000000000000000000000000000000000000000000000;
    uint256 public constant TARGET_TIMESPAN = 14 * 24 * 60 * 60; // 2 weeks
    uint256 public constant UNROUNDED_MAX_TARGET = 2**224 - 1;
    uint256 public constant TARGET_TIMESPAN_DIV_4 = TARGET_TIMESPAN / 4; // store division as constant to save costs
    uint256 public constant TARGET_TIMESPAN_MUL_4 = TARGET_TIMESPAN * 4; // store multiplication as constant to save costs

    uint256 public constant MAIN_CHAIN_ID = 0;
    uint256 public constant CONFIRMATIONS = 6;

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
    string ERR_PREVIOUS_BLOCK = "Previous block hash not found";
    string ERR_LOW_DIFFICULTY = "PoW hash does not meet difficulty target of header";
    string ERR_DIFF_TARGET_HEADER = "Incorrect difficulty target specified in block header";
    string ERR_NOT_EXTENSION = "Submission is not an extension of the main chain";
    string ERR_BLOCK_NOT_FOUND = "Requested block not found in storage";
    string ERR_CONFIRMS = "Transaction has insufficient confirmations";
    string ERR_VERIFY_TX = "Incorrect merkle proof";
    string ERR_INVALID_TXID = "Invalid transaction identifier";

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
        bytes32 merkle = _header.extractMerkleRootLE().toBytes32();
        uint256 target = _header.extractTarget();
        uint256 timestamp = _header.extractTimestamp();
        uint256 chainId = MAIN_CHAIN_ID;
        uint256 difficulty = _header.extractDifficulty();

        bestBlock = digest;
        bestScore = difficulty;
        bestHeight = _height;

        forks[chainId].height = _height;
        chain[_height] = digest;

        epochStartTarget = target;
        epochStartTime = timestamp;

        storeBlockHeader(
            digest,
            merkle,
            _height,
            target,
            timestamp,
            chainId,
            difficulty
        );
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
        require(headers[hashCurrBlock].merkle == 0, ERR_DUPLICATE_BLOCK);

        Header memory headPrevBlock = headers[hashPrevBlock];
        // Fail if previous block hash not in current state of main chain
        require(headPrevBlock.merkle != 0, ERR_PREVIOUS_BLOCK);

        // Fails if previous block header is not stored
        uint256 chainWorkPrevBlock = headPrevBlock.chainWork;
        uint256 _height = 1 + headPrevBlock.height;
        uint256 target = _header.extractTarget();

        // Check the PoW solution matches the target specified in the block header
        require(abi.encodePacked(hashCurrBlock).reverseEndianness().bytesToUint() <= target, ERR_LOW_DIFFICULTY);
        // Check the specified difficulty target is correct
        require(isCorrectDifficultyTarget(
            epochStartTarget,
            epochStartTime,
            headPrevBlock.target,
            headPrevBlock.timestamp,
            target,
            _height
        ), ERR_DIFF_TARGET_HEADER);

        // TODO: update epoch start

        bytes32 merkle = _header.extractMerkleRootLE().toBytes32();
        uint256 timestamp = _header.extractTimestamp();

        uint256 difficulty = _header.extractDifficulty();
        uint256 chainWork = chainWorkPrevBlock + difficulty;

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
                uint256 forkHeight = _height;
                uint256 forkId = incrementChainCounter();

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
            } else {
                // extend fork
                forks[chainId].height = _height;
                forks[chainId].descendants.push(hashCurrBlock);
            }
        }
    }

    function storeBlockHeader(
        bytes32 _digest,
        bytes32 _merkle,
        uint256 _height,
        uint256 _target,
        uint256 _timestamp,
        uint256 _chainId,
        uint256 _chainWork
    ) private {
        chain[_height] = _digest;
        headers[_digest] = Header({
            merkle: _merkle,
            height: _height,
            target: _target,
            timestamp: _timestamp,
            chainId: _chainId,
            chainWork: _chainWork
        });
        emit StoreHeader(_digest, _height);
    }

    function incrementChainCounter() private returns (uint256) {
        chainCounter = chainCounter.add(1);
        return chainCounter;
    }

    function replaceChainElement(uint256 _height, uint256 _id, bytes32 _digest) private {
        // promote header to main chain
        headers[_digest].chainId = MAIN_CHAIN_ID;
        // demote old header to new fork
        headers[chain[_height]].chainId = _id;
        // swap header at height
        chain[_height] = _digest;
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
        uint256 prevStartTarget,    // period starting target
        uint256 prevStartTime,      // period starting timestamp
        uint256 prevEndTarget,      // period ending target
        uint256 prevEndTime,        // period ending timestamp
        uint256 nextTarget,
        uint256 _height
    ) public pure returns (bool) {
        if(!shouldAdjustDifficulty(_height)) {
            if(nextTarget != prevEndTarget && prevEndTarget != 0) {
                return false;
            }
        } else {
            require(
                BTCUtils.calculateDifficulty(prevStartTarget) == BTCUtils.calculateDifficulty(prevEndTarget),
                "invalid difficulty period"
            );

            uint256 expectedTarget = BTCUtils.retargetAlgorithm(
                prevStartTarget,
                prevStartTime,
                prevEndTime
            );

            return (nextTarget & expectedTarget) == nextTarget;
        }
        return true;
    }

    function getHeader(bytes32 _digest) private view returns (Header storage) {
        Header storage head = headers[_digest];
        require(head.merkle > 0, ERR_BLOCK_NOT_FOUND);
        return head;
    }

    function getHeaderByHash(bytes32 _digest) public view returns (
        uint256 height,
        bytes32 merkle,
        uint256 target,
        uint256 time
    ) {
        Header memory head = getHeader(_digest);
        time = head.timestamp;
        merkle = head.merkle;
        target = head.target;
        height = head.height;
        return(height, merkle, target, time);
    }

    function getHashAtHeight(uint256 _height) public view returns (bytes32) {
        bytes32 _digest = chain[_height];
        require(_digest > 0, ERR_BLOCK_NOT_FOUND);
        return _digest;
    }

    /**
    * @notice verifies that a transaction is included in a block
    * @param _height height of block that included transaction
    * @param _index index of transaction in the block's tx merkle tree
    * @param _txid transaction identifier
    * @param _proof merkle proof
    * @param _confirmations required confirmations (insecure)
    * @param _insecure check custom inclusion confirmations
    * @return true if _txid is included, false otherwise
    */
    function verifyTx(
        uint256 _height,
        uint256 _index,
        bytes32 _txid,
        bytes memory _proof,
        uint256 _confirmations,
        bool _insecure
    ) public view returns(bool) {
        require(_txid != 0, ERR_INVALID_TXID);

        if (_insecure) {
            require(
                _height + _confirmations <= bestHeight,
                ERR_CONFIRMS
            );
        } else {
            require(
                _height + CONFIRMATIONS <= bestHeight,
                ERR_CONFIRMS
            );
        }

        bytes32 _digest = getHashAtHeight(_height);
        bytes32 _root = getHeader(_digest).merkle;
        require(
            ValidateSPV.prove(
                _txid,
                _root,
                _proof,
                _index
            ),
            ERR_VERIFY_TX
        );

        return true;
    }
}
