pragma solidity ^0.5.15;

import {Script} from "./Script.sol";

contract ScriptDelegate {
    using Script for bytes;

    function isP2PKH(bytes memory _script) public pure returns (bytes memory) {
        return _script.isP2PKH();
    }

    function isP2SH(bytes memory _script) public pure returns (bytes memory) {
        return _script.isP2SH();
    }

    function isCLTV(bytes memory _script) public pure returns (uint time, bytes memory addr) {
        return _script.isCLTV();
    }
}