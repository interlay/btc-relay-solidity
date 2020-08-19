// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import {Script} from './Script.sol';

contract ScriptDelegate {
    using Script for bytes;

    function isP2PKH(bytes memory script) public pure returns (bool) {
        return script.isP2PKH();
    }

    // solhint-disable-next-line func-name-mixedcase
    function P2PKH(bytes memory script) public pure returns (bytes20) {
        return script.P2PKH();
    }

    function isP2WPKH(bytes memory script) public pure returns (bool) {
        return script.isP2WPKH();
    }

    // solhint-disable-next-line func-name-mixedcase
    function P2WPKH(bytes memory script)
        public
        pure
        returns (bytes1 version, bytes20 program)
    {
        return script.P2WPKH();
    }

    function isP2SH(bytes memory script) public pure returns (bool) {
        return script.isP2SH();
    }

    // solhint-disable-next-line func-name-mixedcase
    function P2SH(bytes memory script) public pure returns (bytes20) {
        return script.P2SH();
    }

    function isOpReturn(bytes memory script) public pure returns (bool) {
        return script.isOpReturn();
    }

    function OpReturn(bytes memory script) public pure returns (bytes memory) {
        return script.OpReturn();
    }

    function isCLTV(bytes memory script)
        public
        pure
        returns (uint256 time, bytes memory addr)
    {
        return script.isCLTV();
    }
}
