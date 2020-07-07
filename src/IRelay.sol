pragma solidity ^0.5.15;

interface IRelay {
    /**
    * @param digest block header hash of block header submitted for storage
    * @param height height of the stored block
    */
    event StoreHeader(bytes32 indexed digest, uint32 indexed height);

    /**
    * @param from previous best block hash
    * @param to new best block hash
    * @param id identifier of the fork triggering the reorg
    */
    event ChainReorg(bytes32 indexed from, bytes32 indexed to, uint256 indexed id);

    /**
    * @notice Parses, validates and stores Bitcoin block header1 to mapping
    * @param header Raw Bitcoin block header bytes (80 bytes)
    * @return bytes32 Bitcoin-like double sha256 hash of submitted block
    */
    function submitBlockHeader(bytes calldata header) external;

    function submitBlockHeaderBatch(bytes calldata headers) external;

    function getBlockHeight(bytes32 digest) external view returns (uint32);

    function getBlockHash(uint32 height) external view returns (bytes32);

    function getBestBlock() external view returns (bytes32 digest, uint32 height);

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
        uint32 height,
        uint256 index,
        bytes32 txid,
        bytes calldata header,
        bytes calldata proof,
        uint256 confirmations,
        bool insecure
    ) external view returns (bool);
}
