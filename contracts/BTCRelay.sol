pragma solidity >=0.4.22 <0.7.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Utils.sol";

/// @title BTC Relay contract.
/// @notice This BTCRelay currently is WIP and assumes:
/// (i) constant difficulty
/// (ii) no forks occur on Bitcoin
contract BTCRelay {
    using SafeMath for uint256;
    using Utils for bytes;
    using Utils for bytes32;

    struct Header {
        uint256 blockHeight; // height of this block header
        bytes32 merkleRoot; // transaction Merkle tree root
    }

    // mapping of block hashes to block headers (ALL ever submitted, i.e., incl. forks)
    mapping(bytes32 => Header) public _headers;

    // mapping of block heights to block hashes of the MAIN CHAIN
    mapping(uint256 => bytes32) public _mainChain;

    // block with the most accumulated work, i.e., blockchain tip
    bytes32 public _heaviestBlock;
    uint256 public _heaviestHeight;

    // CONSTANTS
    /*
    * Bitcoin difficulty constants
    */
    uint256 public constant DIFFICULTY_ADJUSTMENT_INVETVAL = 2016;
    uint256 public constant DIFF_TARGET = 0xffff0000000000000000000000000000000000000000000000000000;
    uint256 public constant TARGET_TIMESPAN = 14 * 24 * 60 * 60; // 2 weeks
    uint256 public constant UNROUNDED_MAX_TARGET = 2**224 - 1;
    uint256 public constant TARGET_TIMESPAN_DIV_4 = TARGET_TIMESPAN / 4; // store division as constant to save costs
    uint256 public constant TARGET_TIMESPAN_MUL_4 = TARGET_TIMESPAN * 4; // store multiplucation as constant to save costs


    // EVENTS
    /*
    * @param blockHash block header hash of block header submitted for storage
    * @param blockHeight blockHeight
    */
    event StoreHeader(bytes32 indexed blockHash, uint256 indexed blockHeight);
    /*
    * @param txid block header hash of block header submitted for storage
    */
    event VerifyTransaction(bytes32 indexed txid, uint256 indexed blockHeight);


    event CheckTxChainProof(bytes32[] txids);

    event TestEvent(bytes);
    // EXCEPTION MESSAGES
    string ERR_GENESIS_SET = "Initial parent has already been set";
    string ERR_INVALID_FORK_ID = "Incorrect fork identifier: id 0 is no available";
    string ERR_INVALID_HEADER = "Invalid block header";
    string ERR_DUPLICATE_BLOCK = "Block already stored";
    string ERR_PREV_BLOCK = "Previous block hash not found";
    string ERR_LOW_DIFF = "PoW hash does not meet difficulty target of header";
    string ERR_DIFF_TARGET_HEADER = "Incorrect difficulty target specified in block header";
    string ERR_NOT_MAIN_CHAIN = "Main chain submission indicated, but submitted block is on a fork";
    string ERR_FORK_PREV_BLOCK = "Previous block hash does not match last block in fork submission";
    string ERR_NOT_FORK = "Indicated fork submission, but block is in main chain";
    string ERR_INVALID_TXID = "Invalid transaction identifier";
    string ERR_CONFIRMS = "Transaction has less confirmations than requested";
    string ERR_MERKLE_PROOF = "Invalid Merkle Proof structure";
    string ERR_BLOCK_NOT_FOUND = "Requested block not found in storage";
    string ERR_VERIFY_TX = "Incorrect Merkle Proof!";


    /**
    * @notice Initializes the relay with the provided block, i.e., defines the first block of the stored chain
    * @param blockHeaderBytes - 80 bytes raw Bitcoin block headers
    * @param blockHeight - blockHeight of genesis block
    */
    function setInitialParent(
        bytes memory blockHeaderBytes,
        uint32 blockHeight
        )
        public
        {
        // Check that function is only called once
        require(_heaviestBlock == 0, ERR_GENESIS_SET);

        bytes32 blockHeaderHash = blockHashFromHeader(blockHeaderBytes);
        _heaviestBlock = blockHeaderHash;
        _heaviestHeight = blockHeight;
        _headers[blockHeaderHash].merkleRoot = getMerkleRootFromHeader(blockHeaderBytes);
        _headers[blockHeaderHash].blockHeight = blockHeight;
        emit StoreHeader(blockHeaderHash, blockHeight);
    }


    /**
    * @notice Parses, validates and stores Bitcoin block header1 to mapping
    * @param blockHeaderBytes Raw Bitcoin block header bytes (80 bytes)
    * @return bytes32 Bitcoin-like double sha256 hash of submitted block
    */
    function storeBlockHeader(bytes memory blockHeaderBytes) public returns (bytes32) {
        
        // Check that submitted block header has correct size
        require(blockHeaderBytes.length == 80, ERR_INVALID_HEADER);

        // Extract prev and cacl. current block header hashes
        bytes32 hashPrevBlock = getPrevBlockHashFromHeader(blockHeaderBytes);
        bytes32 hashCurrentBlock = blockHashFromHeader(blockHeaderBytes);

        // Check that the block header does not yet exists in storage, i.e., that is not a duplicate submission
        // Note: merkleRoot is always set
        require(_headers[hashCurrentBlock].merkleRoot == 0, ERR_DUPLICATE_BLOCK);
    
        //Check that referenced previous block exists in storage
        require(_headers[hashPrevBlock].merkleRoot != 0, ERR_PREV_BLOCK);

        uint256 target = getTargetFromHeader(blockHeaderBytes);

        // Check the PoW solution matches the target specified in the block header
        require(hashCurrentBlock <= bytes32(target), ERR_LOW_DIFF);

        // NOTE: for simplicity, we do not check retargetting here.
        // That is, we assume constant difficulty in this example!
        // A fully functional relay must check retarget!

        // Calc. blockheight
        uint256 blockHeight = 1 + _headers[hashPrevBlock].blockHeight;

        // Check that the submitted block is extending the main chain
        require(blockHeight > _heaviestHeight, ERR_NOT_MAIN_CHAIN);

        // Update stored heaviest block and height
        _heaviestBlock = hashCurrentBlock;
        _heaviestHeight = blockHeight;

        // Write block header to storage
        bytes32 merkleRoot = getMerkleRootFromHeader(blockHeaderBytes);
        _headers[hashCurrentBlock].merkleRoot = merkleRoot;
        _headers[hashCurrentBlock].blockHeight = blockHeight;

        // Update main chain reference
        _mainChain[blockHeight] = hashCurrentBlock;

        emit StoreHeader(hashCurrentBlock, blockHeight);
    }

    /**
    * @notice Verifies that a transaction is included in a block at a given blockheight
    * @param txid transaction identifier
    * @param txBlockHeight block height at which transacton is supposedly included
    * @param txIndex index of transaction in the block's tx merkle tree
    * @param merkleProof  merkle tree path (concatenated LE sha256 hashes)
    * @return True if txid is at the claimed position in the block at the given blockheight, False otherwise
    */
    function verifyTx(
        bytes32 txid,
        uint256 txBlockHeight,
        uint256 txIndex,
        bytes32[] memory merkleProof,
        uint256 confirmations)
        public returns(bool)
        {
        // Check that txid is not 0
        require(txid != 0, ERR_INVALID_TXID);

        // Check merkle proof structure, 1st hash == txid
        require(merkleProof[0].flip32Bytes() == txid, ERR_INVALID_TXID);
        
        // Check if tx hash requested confirmations.
        require(_headers[_heaviestBlock].blockHeight - txBlockHeight >= confirmations, ERR_CONFIRMS);

        bytes32 blockHeaderHash = _mainChain[txBlockHeight];
        bytes32 merkleRoot = _headers[blockHeaderHash].merkleRoot;
        
        // Save costs if only 1 TX in block
        if(merkleProof.length == 1){
            require(merkleProof[0] == merkleRoot,ERR_VERIFY_TX);
            emit VerifyTransaction(txid, txBlockHeight);
            return true;
        }

        // Compute merkle tree root and check if it matches the specified block's merkle tree root
        bytes32 calcRoot = computeMerkle(txIndex, merkleProof);

        require(calcRoot == merkleRoot, ERR_VERIFY_TX);

        emit VerifyTransaction(txid, txBlockHeight);

        return true;
    }


    /*
    * @notice Verifies that multiple transactions have been included *before* the given block height.
    * Uses the TxChain transaction aggregation mechanism: 
    * 1) Verifies that the aggregation TX is included in Bitcoin at the given block height.
    * 2) Extracts the contingent TXIDs from the inputs. These transactions are also proven to be in the blockchain.
    * @param rawTx raw aggregated TxChain Bitcoin transaction with multiple contingent (dust) inputs
    * @param txid transaction identifier of rawTX
    * @param txBlockHeight block height at which the rawTX is supposedly included
    * @param txIndex index of rawTX in the block's tx merkle tree
    * @param merkleProof  merkle tree path (concatenated LE sha256 hashes)
    * @return (success, txids) list of verified transaction identifiers, and a flag to indicate success/failure of the verificaiton
    */
    function verifyTxMulti(bytes32 txid,
                           bytes memory rawTx,
                           uint256 txBlockHeight,
                           uint256 txIndex,
                           bytes32[] memory merkleProof,
                           uint256 confirmations)
                           public returns (bool success, bytes memory txids) {
        success = verifyTx(txid, txBlockHeight, txIndex, merkleProof, confirmations);
        if (!success) {
            return (success, txids);
        }
        bytes32 computedHash = sha256(rawTx);
        if (computedHash != txid) {
            success = false;
            // return (false, txids);
        }
        txids = extractInputTxids(rawTx);
    }

    /**
    * @notice Extracts the transaction identifiers referenced by a TxChain aggregating transcation.
    * @param rawTx raw TxChain transaction
    */
    function extractInputTxids(bytes memory rawTx) public returns (bytes memory) {

        uint length = rawTx.length;
        // skip 4 byte version
        uint pos = 4;

        // Check if SegWit transaction
        bytes memory segwit = rawTx.slice(pos, 2);

        if (segwit[0] == 0x00 && segwit[1] == 0x01) {
            pos = pos + 2;
        }

        uint varIntLength;
        uint numInputs;
        (varIntLength, numInputs) = parseVarInt(rawTx.slice(pos, length - pos));
        //uint varIntLength = parseVarInt((rawTx.slice(pos, length - pos));
        // if (varIntLength == 0) {
        //    varIntLength = 1;
        //}
        //
        //uint numInputs = uint8(convertBytesToBytes1(rawTx.slice(pos, varIntLength)));

        bytes memory txids; 

        pos = pos + varIntLength;

        for (uint i = 0; i < numInputs; i++) {
            // get txOutHash 32 bytes
            bytes memory txOutHash = rawTx.slice(pos, 32);
            txids = abi.encodePacked(txids).concat(abi.encodePacked(txOutHash));
            pos = pos + 32;
            // get txOutIndex 4 bytes
            // bytes memory txOutIndex = BytesLib.slice(rawTransaction, inputPos, 4);
            pos = pos + 4;
            // read varInt for script sig
            uint scriptSigVarIntLength = determineVarIntDataLength(rawTx.slice(pos, length - pos));
            if (scriptSigVarIntLength == 0) {
                scriptSigVarIntLength = 1;
            }
            uint scriptSigLen = uint8(convertBytesToBytes1(rawTx.slice(pos, scriptSigVarIntLength)));
            pos = pos + scriptSigVarIntLength;
            // get script sig
            // bytes memory scriptSig = BytesLib.slice(rawTransaction, inputPos, scriptSigLen);
            pos = pos + scriptSigLen;
            // get sequence 4 bytes
            // bytes memory sequence = BytesLib.slice(rawTransaction, inputPos, 4);
            pos = pos + 4;
            // new pos is now start of next index
        }

        return txids;
        } 

    // HELPER FUNCTIONS
    /**
    * @notice Reconstructs merkle tree root given a transaction hash, index in block and merkle tree path
    * @param txIndex index of transaction given by hash in the corresponding block's merkle tree
    * @param merkleProof merkle tree path to transaction hash from block's merkle tree root
    * @return merkle tree root of the block containing the transaction, meaningless hash otherwise
    */
    function computeMerkle(
        uint256 txIndex,
        bytes32[] memory merkleProof)
        public pure returns(bytes32)
        {

        bytes32 resultHash = merkleProof[0];
        uint256 txIndexTemp = txIndex;
        
        for(uint i = 1; i < merkleProof.length; i++) {
            if(txIndexTemp % 2 == 1){
                resultHash = concatSHA256Hash(merkleProof[i], resultHash);
            } else {
                resultHash = concatSHA256Hash(resultHash, merkleProof[i]);
            }
            txIndexTemp.div(2);
        }
        return resultHash;
    }
    
    /**
    * @notice Computes the Bitcoin double sha256 block hash for a given block header
    */
    function blockHashFromHeader(bytes memory blockHeaderBytes) public pure returns (bytes32){
        return dblSha(blockHeaderBytes).flipBytes().toBytes32();
    }
    /** 
    * @notice Concatenates and re-hashes two SHA256 hashes
    * @param left left side of the concatenation
    * @param right right side of the concatenation
    * @return sha256 hash of the concatenation of left and right
    */
    function concatSHA256Hash(bytes32 left, bytes32 right) public pure returns (bytes32) {
        return dblSha(abi.encodePacked(left).concat(abi.encodePacked(right))).toBytes32();
    }
    /**
    * @notice Performs Bitcoin-like double sha256 hash calculation
    * @param data Bytes to be flipped and double hashed s
    * @return Bitcoin-like double sha256 hash of parsed data
    */
    function dblSha(bytes memory data) public pure returns (bytes memory){
        return abi.encodePacked(sha256(abi.encodePacked(sha256(data))));
    }

    /**
    * @notice Calculates the PoW difficulty target from compressed nBits representation,
    * according to https://bitcoin.org/en/developer-reference#target-nbits
    * @param nBits Compressed PoW target representation
    * @return PoW difficulty target computed from nBits
    */
    function nBitsToTarget(uint256 nBits) private pure returns (uint256){
        uint256 exp = uint256(nBits) >> 24;
        uint256 c = uint256(nBits) & 0xffffff;
        uint256 target = uint256((c * 2**(8*(exp - 3))));
        return target;
    }

    // GETTERS
    function getMerkleRootFromHeader(bytes memory blockHeaderBytes) public pure returns(bytes32){
        return blockHeaderBytes.slice(36,32).toBytes32();
    }

    function getTargetFromHeader(bytes memory blockHeaderBytes) public pure returns(uint256){
        return nBitsToTarget(getNBitsFromHeader(blockHeaderBytes));
    }
    
    function getNBitsFromHeader(bytes memory blockHeaderBytes) public pure returns(uint256){
        return blockHeaderBytes.slice(72, 4).flipBytes().bytesToUint();
    }
    
    function getPrevBlockHashFromHeader(bytes memory blockHeaderBytes) public pure returns(bytes32){
        return blockHeaderBytes.slice(4, 32).flipBytes().toBytes32();
    }
    // https://en.bitcoin.it/wiki/Difficulty
    function getDifficulty(uint256 target) public pure returns(uint256){
        return DIFF_TARGET.div(target);
    }

    function getBlockHeader(bytes32 blockHeaderHash) public view returns(
        uint256 blockHeight,
        bytes32 merkleRoot
    ){
        require(_headers[blockHeaderHash].merkleRoot != bytes32(0x0), ERR_BLOCK_NOT_FOUND);
        blockHeight = _headers[blockHeaderHash].blockHeight;
        merkleRoot = _headers[blockHeaderHash].merkleRoot;
        return(blockHeight, merkleRoot);
    }


    function convertBytesToBytes1(bytes memory inBytes) public pure returns (bytes1 outBytes1) {
        if (inBytes.length == 0) {
            return 0x0;
        }

        assembly {
            outBytes1 := mload(add(inBytes, 32))
        }
    }

    /// @notice         Determines the length of a VarInt in bytes
    /// @dev            A VarInt of >1 byte is prefixed with a flag indicating its length
    /// @param _flag    The first byte of a VarInt
    /// @return         The number of non-flag bytes in the VarInt
    function determineVarIntDataLength(bytes memory _flag) internal pure returns (uint8) {
        if (uint8(_flag[0]) == 0xff) {
            return 8;  // one-byte flag, 8 bytes data
        }
        if (uint8(_flag[0]) == 0xfe) {
            return 4;  // one-byte flag, 4 bytes data
        }
        if (uint8(_flag[0]) == 0xfd) {
            return 2;  // one-byte flag, 2 bytes data
        }

        return 0;  // flag is data
    }

    /// @notice     Parse a VarInt into its data length and the number it represents
    /// @dev        Useful for Parsing Vins and Vouts. Returns ERR_BAD_ARG if insufficient bytes.
    ///             Caller SHOULD explicitly handle this case (or bubble it up)
    /// @param _b   A byte-string starting with a VarInt
    /// @return     number of bytes in the encoding (not counting the tag), the encoded int
    function parseVarInt(bytes memory _b) internal pure returns (uint256, uint256) {
      uint8 _dataLen = determineVarIntDataLength(_b);

      if (_dataLen == 0) {
        return (0, uint8(_b[0]));
      }
      if (_b.length < 1 + _dataLen) {
          return (0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, 0);
      }
      uint256 _number = bytesToUint(reverseEndianness(_b.slice(1, _dataLen)));
      return (_dataLen, _number);
    }

    /// @notice          Changes the endianness of a byte array
    /// @dev             Returns a new, backwards, bytes
    /// @param _b        The bytes to reverse
    /// @return          The reversed bytes
    function reverseEndianness(bytes memory _b) internal pure returns (bytes memory) {
        bytes memory _newValue = new bytes(_b.length);

        for (uint i = 0; i < _b.length; i++) {
            _newValue[_b.length - i - 1] = _b[i];
        }

        return _newValue;
    }

    /// @notice          Converts big-endian bytes to a uint
    /// @dev             Traverses the byte array and sums the bytes
    /// @param _b        The big-endian bytes-encoded integer
    /// @return          The integer representation
    function bytesToUint(bytes memory _b) internal pure returns (uint256) {
        uint256 _number;

        for (uint i = 0; i < _b.length; i++) {
            _number = _number + uint8(_b[i]) * (2 ** (8 * (_b.length - (i + 1))));
        }

        return _number;
    }
}
