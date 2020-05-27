pragma solidity ^0.5.15;

interface IRelay {
    event StoreHeader(bytes32 indexed digest, uint256 indexed height);
    event ChainReorg(bytes32 indexed from, bytes32 indexed to, uint256 indexed id);

    function submitBlockHeader(bytes calldata header) external returns (bytes32);

    function getHeaderByHash(bytes32 _digest) external view returns (
        uint256 height,
        bytes32 merkle,
        uint256 target,
        uint256 time
    );

    function getHashAtHeight(uint256 height) external view returns (bytes32);

    function getBestBlock() external view returns (bytes32 digest, uint256 score, uint256 height);

    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        uint256 confirmations,
        bool insecure
    ) external view returns (bool);
}
