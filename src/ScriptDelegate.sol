// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import {Script} from "./Script.sol";

contract ScriptDelegate {
    using Script for bytes;

    function isP2PKH(bytes memory script) public pure returns (bool) {
        return script.isP2PKH();
    }

    function P2PKH(bytes memory script) public pure returns (bytes20) {
        return script.P2PKH();
    }

    function isP2WPKH(bytes memory script) public pure returns (bool) {
        return script.isP2WPKH();
    }

    function P2WPKH(bytes memory script) public pure returns (bytes1 version, bytes20 program) {
        return script.P2WPKH();
    }

    function isP2SH(bytes memory script) public pure returns (bool) {
        return script.isP2SH();
    }

    function P2SH(bytes memory script) public pure returns (bytes20) {
        return script.P2SH();
    }

    function isCLTV(bytes memory script) public pure returns (uint time, bytes memory addr) {
        return script.isCLTV();
    }
}