// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import {BytesLib} from '@interlay/bitcoin-spv-sol/contracts/BytesLib.sol';
import {BTCUtils} from '@interlay/bitcoin-spv-sol/contracts/BTCUtils.sol';

library Script {
    using BytesLib for bytes;
    using BTCUtils for bytes;

    bytes1 internal constant OP_HASH160 = 0xa9;
    bytes1 internal constant OP_EQUAL = 0x87;
    bytes1 internal constant OP_DUP = 0x76;
    bytes1 internal constant OP_EQUALVERIFY = 0x88;
    bytes1 internal constant OP_CHECKSIG = 0xac;
    bytes1 internal constant OP_CHECKLOCKTIMEVERIFY = 0xb1;
    bytes1 internal constant OP_DROP = 0x75;
    bytes1 internal constant OP_0 = 0x00;
    bytes1 internal constant OP_RETURN = 0x6a;

    // EXCEPTION MESSAGES
    string internal constant ERR_INVALID_SIZE = 'Invalid size';
    string internal constant ERR_INVALID_OPCODE = 'Invalid opcode';

    // 0x76 (OP_DUP) - 0xa9 (OP_HASH160) - 0x14 (20 bytes len) - <20 bytes pubkey hash> - 0x88 (OP_EQUALVERIFY) - 0xac (OP_CHECKSIG)
    function isP2PKH(bytes memory script) internal pure returns (bool) {
        return
            (script.length == 25) &&
            (script[0] == OP_DUP) &&
            (script[1] == OP_HASH160) &&
            (script[2] == 0x14) &&
            (script[23] == OP_EQUALVERIFY) &&
            (script[24] == OP_CHECKSIG);
    }

    // solhint-disable-next-line func-name-mixedcase
    function P2PKH(bytes memory script) internal pure returns (bytes20) {
        return toBytes20(script.slice(3, 20));
    }

    function isP2WPKH(bytes memory script) internal pure returns (bool) {
        return (script.length == 22) && (script[1] == 0x14);
    }

    // solhint-disable-next-line func-name-mixedcase
    function P2WPKH(bytes memory script)
        internal
        pure
        returns (bytes1, bytes20)
    {
        return (script[0], toBytes20(script.slice(2, 20)));
    }

    // 0xa9 (OP_HASH160) - 0x14 (20 bytes hash) - <20 bytes script hash> - 0x87 (OP_EQUAL)
    function isP2SH(bytes memory script) internal pure returns (bool) {
        return
            (script.length == 23) &&
            (script[0] == OP_HASH160) &&
            (script[1] == 0x14) &&
            (script[22] == OP_EQUAL);
    }

    // solhint-disable-next-line func-name-mixedcase
    function P2SH(bytes memory script) internal pure returns (bytes20) {
        return toBytes20(script.slice(2, 20));
    }

    function isOpReturn(bytes memory script) internal pure returns (bool) {
        return script[0] == OP_RETURN;
    }

    function OpReturn(bytes memory script)
        internal
        pure
        returns (bytes memory)
    {
        bytes memory output = script.slice(1, script.length - 1);
        return output.slice(1, uint8(output[0]));
    }

    // 04 9f7b2a5c b1 75 76 a9 14 371c20fb2e9899338ce5e99908e64fd30b789313 88 ac
    function isCLTV(bytes memory script)
        internal
        pure
        returns (uint256, bytes memory)
    {
        uint256 varIntLen = script.determineVarIntDataLength();
        if (varIntLen == 0) {
            varIntLen = 1;
        }
        uint256 timeLen = script.slice(0, varIntLen).bytesToUint();
        uint256 timestamp = script
            .slice(varIntLen, timeLen)
            .reverseEndianness()
            .bytesToUint();
        uint256 pos = varIntLen + timeLen;
        require(script.length == pos + 27, ERR_INVALID_SIZE);

        require(script[pos] == OP_CHECKLOCKTIMEVERIFY, ERR_INVALID_OPCODE);
        require(script[pos + 1] == OP_DROP, ERR_INVALID_OPCODE);
        require(script[pos + 2] == OP_DUP, ERR_INVALID_OPCODE);
        require(script[pos + 3] == OP_HASH160, ERR_INVALID_OPCODE);
        require(script[pos + 4] == 0x14, ERR_INVALID_OPCODE); // OP_PUSHDATA

        require(script[pos + 5 + 20] == OP_EQUALVERIFY, ERR_INVALID_OPCODE);
        require(script[pos + 6 + 20] == OP_CHECKSIG, ERR_INVALID_OPCODE);

        return (timestamp, script.slice(pos + 5, 20));
    }

    function toBytes20(bytes memory data)
        internal
        pure
        returns (bytes20 result)
    {
        if (data.length == 0) {
            return 0x0;
        }

        assembly {
            // solhint-disable-previous-line no-inline-assembly
            result := mload(add(data, 0x20))
        }
    }
}
