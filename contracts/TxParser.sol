pragma solidity ^0.5.15;
pragma experimental ABIEncoderV2;

import {SafeMath} from "@summa-tx/bitcoin-spv-sol/contracts/SafeMath.sol";
import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@summa-tx/bitcoin-spv-sol/contracts/BTCUtils.sol";

library ParsingRawTx {

    struct ParsingRawTxData {
        uint pos;
        uint varIntLength;
        uint numOutputs;
        uint[] values;
        bytes[] addresses;
        uint pkScriptVarIntLength;
        uint pkScriptLen;
    }

    function parseRawTransaction(bytes memory rawTransaction) public view returns (uint[] memory, bytes[] memory, bytes memory) {
        ParsingRawTxData memory helper = ParsingRawTxData({
            pos: 0,
            varIntLength: 0,
            numOutputs: 0,
            values: new uint[](3),
            addresses: new bytes[](3),
            pkScriptVarIntLength: 0,
            pkScriptLen: 0
        });

        bytes memory data = hex'00';
            
        helper.pos = skipInputTx(rawTransaction);
        if (helper.pos == 0) {
            return (helper.values, helper.addresses, data);
        }
        
        // varIntLength
        helper.varIntLength = BTCUtils.determineVarIntDataLength(BytesLib.slice(rawTransaction, helper.pos, rawTransaction.length - helper.pos));
        if (helper.varIntLength == 0) {
            helper.varIntLength = 1;
        }

        helper.numOutputs = uint8(convertBytesToBytes1(BytesLib.slice(rawTransaction, helper.pos, helper.varIntLength)));
        // check to make sure raw transaction has small number of txOut
        if (helper.numOutputs > 3) {
            return (helper.values, helper.addresses, data);
        }
        helper.pos = helper.pos + helper.varIntLength;

        for (uint j = 0;  j < helper.numOutputs; j++) {
            helper.values[j] = (BTCUtils.extractValue(BytesLib.slice(rawTransaction, helper.pos, rawTransaction.length - helper.pos)));

            helper.pos = helper.pos + 8;

            // getting the length of varInt
            helper.pkScriptVarIntLength = BTCUtils.determineVarIntDataLength(BytesLib.slice(rawTransaction, helper.pos, rawTransaction.length - helper.pos));
            if (helper.pkScriptVarIntLength == 0) {
                helper.pkScriptVarIntLength = 1;
            }
            helper.pkScriptLen = uint8(convertBytesToBytes1(BytesLib.slice(rawTransaction, helper.pos, helper.pkScriptVarIntLength)));
            // moving to the start of the pk script
            helper.pos = helper.pos + helper.pkScriptVarIntLength;

            // check if op return if yes store data
            if (BytesLib.slice(rawTransaction, helper.pos, 1)[0] == 0x6a) {
                helper.pos = helper.pos + 1;
                uint length = BTCUtils.determineVarIntDataLength(BytesLib.slice(rawTransaction, helper.pos, rawTransaction.length - helper.pos - 1));
                if (length == 0) {
                    length = 1;
                }
                uint size = uint8(convertBytesToBytes1(BytesLib.slice(rawTransaction, helper.pos, length)));
                data = BytesLib.slice(rawTransaction, helper.pos + length, size);
            } else {
                // two formats of the tx out
                if (helper.pkScriptLen == 23) {
                    helper.addresses[j] = BytesLib.slice(rawTransaction, helper.pos + 2, 20);
                } else {
                    helper.addresses[j] = BytesLib.slice(rawTransaction, helper.pos + 3, 20);
                }
            }
            // moving past the pk script
            helper.pos = helper.pos + helper.pkScriptLen;
            
        }

        return (helper.values, helper.addresses, data);
    }

    function skipInputTx(bytes memory rawTransaction) public view returns (uint) {
        // remove the version 4 bytes
        uint length = rawTransaction.length;

        // Check to ensure long enough for version check
        if (length < 4) {
            return 0;
        }

        // Check version is 1 or 2
        if(rawTransaction[0] != 0x01 && rawTransaction[0] != 0x02
         || (rawTransaction[1] != 0x00 || rawTransaction[2] != 0x00 || rawTransaction[3] != 0x00)) {
            return 0;
        }
        uint pos = 4; // to omit the version

        bytes memory segwit = BytesLib.slice(rawTransaction, pos, 2);

        if (segwit[0] == 0x00 && segwit[1] == 0x01) {
            pos = pos + 2;
        }

        uint varIntLength = BTCUtils.determineVarIntDataLength(BytesLib.slice(rawTransaction, pos, length - pos));
        if (varIntLength == 0) {
            varIntLength = 1;
        }


        uint numInputs = uint8(convertBytesToBytes1(BytesLib.slice(rawTransaction, pos, varIntLength)));
         // check to make sure raw transaction has small number of txIn
        if (numInputs > 3) {
            return 0;
        }
        pos = pos + varIntLength;

        for (uint i = 0; i < numInputs; i++) {
            // extract some input data
            // get txOutHash 32 bytes
            // bytes memory txOutHash = BytesLib.slice(rawTransaction, inputPos, 32);
            pos = pos + 32;
            // get txOutIndex 4 bytes
            // bytes memory txOutIndex = BytesLib.slice(rawTransaction, inputPos, 4);
            pos = pos + 4;
            // read varInt for script sig
            uint scriptSigVarIntLength = BTCUtils.determineVarIntDataLength(BytesLib.slice(rawTransaction, pos, length - pos));
            if (scriptSigVarIntLength == 0) {
                scriptSigVarIntLength = 1;
            }
            uint scriptSigLen = uint8(convertBytesToBytes1(BytesLib.slice(rawTransaction, pos, scriptSigVarIntLength)));
            pos = pos + scriptSigVarIntLength;
            // get script sig
            // bytes memory scriptSig = BytesLib.slice(rawTransaction, inputPos, scriptSigLen);
            pos = pos + scriptSigLen;
            // get sequence 4 bytes
            // bytes memory sequence = BytesLib.slice(rawTransaction, inputPos, 4);
            pos = pos + 4;
            // new pos is now start of next index
        }

        return pos;
    }

    function checkTxIsValid(bytes memory rawTx, uint value, bytes memory reciever, bytes memory data) public view returns (bool) {
        bool result = false;
        // Data will equal zero for error
        if (data[0] == 0x00) {
            return false;
        }
        (uint[] memory values, bytes[] memory addresses, bytes memory dataSent) = parseRawTransaction(rawTx);
        for (uint i = 0; i < values.length; i++) {
            if (values[i] == value) {
                if (BytesLib.equal(addresses[i], reciever)) {
                    result = true;
                    break;
                }
            }
        }
        result = result && BytesLib.equal(dataSent, data);
        return result;
    }

    function convertBytesToBytes1(bytes memory inBytes) public view returns (bytes1 outBytes1) {
        if (inBytes.length == 0) {
            return 0x0;
        }

        assembly {
            outBytes1 := mload(add(inBytes, 32))
        }
    }

    function convertBytesToBytes8(bytes memory inBytes) public view returns (bytes8 outBytes8) {
        if (inBytes.length == 0) {
            return 0x0;
        }

        assembly {
            outBytes8 := mload(add(inBytes, 32))
        }
    }


}