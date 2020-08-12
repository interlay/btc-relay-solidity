// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

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
    event ChainReorg(
        bytes32 indexed from,
        bytes32 indexed to,
        uint256 indexed id
    );

    /**
     * @notice Parses, validates and stores a block header
     * @param header Raw block header bytes (80 bytes)
     */
    function submitBlockHeader(bytes calldata header) external;

    /**
     * @notice Parses, validates and stores a batch of headers
     * @param headers Raw block headers (80* bytes)
     */
    function submitBlockHeaderBatch(bytes calldata headers) external;

    /**
     * @notice Gets the height of an included block
     * @param digest Hash of the referenced block
     * @return Height of the stored block, reverts if not found
     */
    function getBlockHeight(bytes32 digest) external view returns (uint32);

    /**
     * @notice Gets the hash of an included block
     * @param height Height of the referenced block
     * @return Hash of the stored block, reverts if not found
     */
    function getBlockHash(uint32 height) external view returns (bytes32);

    /**
     * @notice Gets the hash and height for the best tip
     * @return digest Hash of stored block
     * @return height Height of stored block
     */
    function getBestBlock()
        external
        view
        returns (bytes32 digest, uint32 height);

    /**
     * @notice Verifies that a transaction is included in a block
     * @param height Height of block that included transaction
     * @param index Index of transaction in the block's tx merkle tree
     * @param txid Transaction identifier (little endian)
     * @param header Raw block header (80 bytes)
     * @param proof Merkle proof
     * @param confirmations Required confirmations (insecure)
     * @param insecure Check custom inclusion confirmations
     * @return True if txid is included, false otherwise
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
