pragma solidity ^0.5.15;

import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {Bech32} from './Bech32.sol';

contract Bech32Delegate {
    using BytesLib for bytes;

    function createChecksum(uint[] memory hrp, uint[] memory data) public pure returns (uint[] memory) {
        return Bech32.createChecksum(hrp, data);
    }

    function encode(uint[] memory hrp, uint[] memory data) public pure returns (bytes memory) {
        return Bech32.encode(hrp, data);
    }

    function convert(uint[] memory data, uint inBits, uint outBits) public pure returns (uint[] memory) {
        return Bech32.convert(data, inBits, outBits);
    }

    function compare(uint[] memory witnessProgram, bytes memory btcAddress) public pure returns (bool) {
        uint[] memory words = Bech32.convert(witnessProgram, 8, 5);

        uint[] memory version = new uint[](1);
        version[0] = 0;

        uint[] memory hrp = new uint[](2);
        hrp[0] = 116;
        hrp[1] = 98;

        bytes memory result = Bech32.encode(hrp, Bech32.concat(version, words));

        return keccak256(abi.encodePacked('tb1', result)) == keccak256(btcAddress);
    }
}