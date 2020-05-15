pragma solidity ^0.5.15;

import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";
import {BTCUtils} from "@summa-tx/bitcoin-spv-sol/contracts/BTCUtils.sol";

library Script {
    using BytesLib for bytes;
    using BTCUtils for bytes;

    bytes1 constant OP_HASH160 = 0xa9;
    bytes1 constant OP_EQUAL = 0x87;
    bytes1 constant OP_DUP = 0x76;
    bytes1 constant OP_EQUALVERIFY = 0x88;
    bytes1 constant OP_CHECKSIG = 0xac;
    bytes1 constant OP_CHECKLOCKTIMEVERIFY = 0xb1;
    bytes1 constant OP_DROP = 0x75;

    // EXCEPTION MESSAGES
    string constant ERR_INVALID_SIZE = "Invalid size";
    string constant ERR_INVALID_OPCODE = "Invalid opcode";

    // 0x76 (OP_DUP) - 0xa9 (OP_HASH160) - 0x14 (20 bytes len) - <20 bytes pubkey hash> - 0x88 (OP_EQUALVERIFY) - 0xac (OP_CHECKSIG)
    function isP2PKH(bytes memory _script) internal pure returns (bytes memory) {
        require(_script.length == 25, ERR_INVALID_SIZE);
        require(_script[0] == OP_DUP, ERR_INVALID_OPCODE);
        require(_script[1] == OP_HASH160, ERR_INVALID_OPCODE);
        require(_script[2] == 0x14, ERR_INVALID_OPCODE); // OP_PUSHDATA
        require(_script[23] == OP_EQUALVERIFY, ERR_INVALID_OPCODE);
        require(_script[24] == OP_CHECKSIG, ERR_INVALID_OPCODE);
        return _script.slice(3, 20);
    }


    // 0xa9 (OP_HASH160) - 0x14 (20 bytes hash) - <20 bytes script hash> - 0x87 (OP_EQUAL)
    function isP2SH(bytes memory _script) internal pure returns (bytes memory) {
        require(_script.length == 23, ERR_INVALID_SIZE);
        require(_script[0] == OP_HASH160, ERR_INVALID_OPCODE);
        require(_script[1] == 0x14, ERR_INVALID_OPCODE); // OP_PUSHDATA
        require(_script[22] == OP_EQUAL, ERR_INVALID_OPCODE);
        return _script.slice(2, 20);
    }

    // 04 9f7b2a5c b1 75 76 a9 14 371c20fb2e9899338ce5e99908e64fd30b789313 88 ac
    function isCLTV(bytes memory _script) internal pure returns (uint, bytes memory) {
        uint varIntLen = _script.determineVarIntDataLength();
        if (varIntLen == 0) {
            varIntLen = 1;
        }
        uint timeLen = _script.slice(0, varIntLen).bytesToUint();
        uint timestamp = _script.slice(varIntLen, timeLen).reverseEndianness().bytesToUint();
        uint pos = varIntLen + timeLen;
        require(_script.length == pos + 27, ERR_INVALID_SIZE);

        require(_script[pos] == OP_CHECKLOCKTIMEVERIFY, ERR_INVALID_OPCODE);
        require(_script[pos+1] == OP_DROP, ERR_INVALID_OPCODE);
        require(_script[pos+2] == OP_DUP, ERR_INVALID_OPCODE);
        require(_script[pos+3] == OP_HASH160, ERR_INVALID_OPCODE);
        require(_script[pos+4] == 0x14, ERR_INVALID_OPCODE); // OP_PUSHDATA

        require(_script[pos+5+20] == OP_EQUALVERIFY, ERR_INVALID_OPCODE);
        require(_script[pos+6+20] == OP_CHECKSIG, ERR_INVALID_OPCODE);

        return (timestamp, _script.slice(pos+5, 20));
    }
}