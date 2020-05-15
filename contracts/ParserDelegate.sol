pragma solidity ^0.5.15;

import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";

import {Parser} from "./Parser.sol";

contract ParserDelegate {
    using BytesLib for bytes;
    using Parser for bytes;

    function extractInputLength(bytes memory _rawTx) public pure returns (uint numInputs, uint lenInputs) {
        return _rawTx.extractInputLength();
    }

    function extractOutputLength(bytes memory _rawTx) public pure returns (uint numOutputs, uint lenOutputs) {
        return _rawTx.extractOutputLength();
    }

    function extractOutputAtIndex(bytes memory _rawTx, uint256 _index) public pure returns (bytes memory) {
        (, uint lenInputs) = _rawTx.extractInputLength();
        return _rawTx.slice(lenInputs, _rawTx.length - lenInputs).extractOutputAtIndex(_index);
    }

    function extractOutputValueAtIndex(bytes memory _rawTx, uint256 _index) public pure returns (uint256) {
        bytes memory output = extractOutputAtIndex(_rawTx, _index);
        return output.extractOutputValue();
    }

    function extractOutputScriptAtIndex(bytes memory _rawTx, uint256 _index) public pure returns (bytes memory) {
        bytes memory output = extractOutputAtIndex(_rawTx, _index);
        return output.extractOutputScript();
    }
}