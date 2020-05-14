
pragma solidity ^0.5.10;

import {Relay} from "./Relay.sol";
import {SafeMath} from "@summa-tx/bitcoin-spv-sol/contracts/SafeMath.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@summa-tx/bitcoin-spv-sol/contracts/BTCUtils.sol";
import {ValidateSPV} from "@summa-tx/bitcoin-spv-sol/contracts/ValidateSPV.sol";

contract SPV is Relay {
    using SafeMath for uint256;
    using BytesLib for bytes;
    using BTCUtils for bytes;

    event VerifyTransaction(bytes32 indexed _txId);

    constructor(
        bytes memory _header,
        uint256 _height
    ) Relay(
        _header,
        _height
    ) public {}

    /**
    * @notice verifies that a transaction is included in a block
    * @param _header raw header containing merkle root
    * @param _proof merkle proof
    * @param _index index of transaction in the block's tx merkle tree
    * @param _txid transaction identifier
    * @param _confirmations required confirmations
    * @return true if _txid is included, false otherwise
    */
    function verifyTx(
        bytes memory _header,
        bytes memory _proof,
        uint256 _index,
        bytes32 _txid,
        uint256 _confirmations
    ) public view returns(bool) {

        require(
            ValidateSPV.prove(
                _txid,
                _header.extractMerkleRootLE().toBytes32(),
                _proof,
                _index
            ),
            "failed to validate spv proof"
        );

        bytes32 _headerHash256 = _header.hash256();
        bytes32 _heaviestBlock = heaviestBlock;

        (uint256 confirmations, bool included) = isIncluded(_headerHash256, _heaviestBlock, 0, 256);

        require(
            included,
            "heaviest block does not confirm header"
        );

        require(
            confirmations >= _confirmations,
            "insufficient confirmations"
        );

        // emit VerifyTransaction(_txid);

        return true;
    }
}