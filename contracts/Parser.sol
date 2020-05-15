pragma solidity ^0.5.15;

import {SafeMath} from "@summa-tx/bitcoin-spv-sol/contracts/SafeMath.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@summa-tx/bitcoin-spv-sol/contracts/BTCUtils.sol";

library Parser {
    using SafeMath for uint256;
    using BytesLib for bytes;
    using BTCUtils for bytes;

    // EXCEPTION MESSAGES
    string constant ERR_INVALID_OUTPUT = "Invalid output";

    function extractInputLength(bytes memory _rawTx) internal pure returns (uint, uint) {
        uint length = _rawTx.length;

        // skip version
        uint pos = 4;

        bytes memory segwit = _rawTx.slice(pos, 2);
        if (segwit[0] == 0x00 && segwit[1] == 0x01) {
            pos = pos + 2;
        }

        uint varIntLen = _rawTx.slice(pos, length - pos).determineVarIntDataLength();
        if (varIntLen == 0) {
            varIntLen = 1;
        }

        uint numInputs = _rawTx.slice(pos, varIntLen).bytesToUint();
        pos = pos + varIntLen;

        for (uint i = 0; i < numInputs; i++) {
            pos = pos + 32;
            pos = pos + 4;
            // read varInt for script sig
            uint scriptSigvarIntLen = _rawTx.slice(pos, length - pos).determineVarIntDataLength();
            if (scriptSigvarIntLen == 0) {
                scriptSigvarIntLen = 1;
            }
            uint scriptSigLen = _rawTx.slice(pos, scriptSigvarIntLen).bytesToUint();
            pos = pos + scriptSigvarIntLen;
            // get script sig
            pos = pos + scriptSigLen;
            // get sequence 4 bytes
            pos = pos + 4;
            // new pos is now start of next index
        }

        return (numInputs, pos);
    }

    function extractOutputLength(bytes memory _rawTx) internal pure returns (uint, uint) {
        uint length = _rawTx.length;
        uint pos = 0;

        uint varIntLen = _rawTx.slice(pos, length - pos).determineVarIntDataLength();
        if (varIntLen == 0) {
            varIntLen = 1;
        }

        uint numOutputs = _rawTx.slice(pos, varIntLen).bytesToUint();
        pos = pos + varIntLen;

        for (uint i = 0;  i < numOutputs; i++) {
            pos = pos + 8;
            uint pkScriptVarIntLen = _rawTx.slice(pos, length - pos).determineVarIntDataLength();
            if (pkScriptVarIntLen == 0) {
                pkScriptVarIntLen = 1;
            }
            uint pkScriptLen = _rawTx.slice(pos, pkScriptVarIntLen).bytesToUint();
            pos = pos + pkScriptVarIntLen;
            pos = pos + pkScriptLen;
        }

        return (numOutputs, pos);
    }

    function extractOutputAtIndex(bytes memory _outputs, uint256 _index) internal pure returns (bytes memory) {
        uint length = _outputs.length;
        uint pos = 0;

        uint varIntLen = _outputs.slice(pos, length - pos).determineVarIntDataLength();
        if (varIntLen == 0) {
            varIntLen = 1;
        }

        uint numOutputs = _outputs.slice(pos, varIntLen).bytesToUint();
        require(numOutputs >= _index, ERR_INVALID_OUTPUT);
        pos = pos + varIntLen;

        uint start = pos;
        for (uint i = 0;  i < numOutputs; i++) {
            pos = pos + 8;
            uint pkScriptVarIntLen = _outputs.slice(pos, length - pos).determineVarIntDataLength();
            if (pkScriptVarIntLen == 0) {
                pkScriptVarIntLen = 1;
            }
            uint pkScriptLen = _outputs.slice(pos, pkScriptVarIntLen).bytesToUint();
            pos = pos + pkScriptVarIntLen;
            pos = pos + pkScriptLen;
            if (i == _index) {
                return _outputs.slice(start, pos);
            }
            start = pos;
        }

        return "";
    }

    function extractOutputValue(bytes memory _out) internal pure returns (uint64) {
        return _out.extractValue();
    }

    function extractOutputScript(bytes memory _out) internal pure returns (bytes memory) {
        uint length = _out.length;

        // skip value
        uint pos = 8;
        uint pkScriptVarIntLen = _out.slice(pos, length - pos).determineVarIntDataLength();
        if (pkScriptVarIntLen == 0) {
            pkScriptVarIntLen = 1;
        }

        uint pkScriptLen = _out.slice(pos, pkScriptVarIntLen).bytesToUint();
        pos = pos + pkScriptVarIntLen;
        return _out.slice(pos, pkScriptLen);
    }
}