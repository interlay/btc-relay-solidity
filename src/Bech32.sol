pragma solidity ^0.5.15;

import {BytesLib} from "@summa-tx/bitcoin-spv-sol/contracts/BytesLib.sol";

library Bech32 {
    using BytesLib for bytes;

    bytes constant CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

    function polymod(uint[] memory values) internal pure returns(uint) {
        uint32[5] memory GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
        uint chk = 1;
        for (uint p = 0; p < values.length; p++) {
            uint top = chk >> 25;
            chk = (chk & 0x1ffffff) << 5 ^ values[p];
            for (uint i = 0; i < 5; i++) {
                if ((top >> i) & 1 == 1) {
                    chk ^= GENERATOR[i];
                }
            }
        }
        return chk;
    }

    function hrpExpand(uint[] memory hrp) internal pure returns (uint[] memory) {
        uint[] memory ret = new uint[](hrp.length+hrp.length+1);
        for (uint p = 0; p < hrp.length; p++) {
            ret[p] = hrp[p] >> 5;
        }
        ret[hrp.length] = 0;
        for (uint p = 0; p < hrp.length; p++) {
            ret[p+hrp.length+1] = hrp[p] & 31;
        }
        return ret;
    }

    function concat(uint[] memory left, uint[] memory right) internal pure returns(uint[] memory) {
        uint[] memory ret = new uint[](left.length + right.length);

        uint i = 0;
        for (; i < left.length; i++) {
            ret[i] = left[i];
        }

        uint j = 0;
        while (j < right.length) {
            ret[i++] = right[j++];
        }

        return ret;
    }

    function extend(uint[] memory array, uint val, uint num) internal pure returns(uint[] memory) {
        uint[] memory ret = new uint[](array.length + num);

        uint i = 0;
        for (; i < array.length; i++) {
            ret[i] = array[i];
        }

        uint j = 0;
        while (j < num) {
            ret[i++] = val;
            j++;
        }

        return ret;
    }

    function createChecksum(uint[] memory hrp, uint[] memory data) internal pure returns (uint[] memory) {
        uint[] memory values = extend(concat(hrpExpand(hrp), data), 0, 6);
        uint mod = polymod(values) ^ 1;
        uint[] memory ret = new uint[](6);
        for (uint p = 0; p < 6; p++) {
            ret[p] = (mod >> 5 * (5 - p)) & 31;
        }
        return ret;
    }

    function encode(uint[] memory hrp, uint[] memory data) internal pure returns (bytes memory) {
        uint[] memory combined = concat(data, createChecksum(hrp, data));
        // TODO: prepend hrp

        bytes memory ret = new bytes(combined.length);
        for (uint p = 0; p < combined.length; p++) {
            ret[p] = CHARSET[combined[p]];
        }

        return ret;
    }

    function convert(uint[] memory data, uint inBits, uint outBits) internal pure returns (uint[] memory) {
        uint value = 0;
        uint bits = 0;
        uint maxV = (1 << outBits) - 1;

        uint[] memory ret = new uint[](32);
        uint j = 0;
        for (uint i = 0; i < data.length; ++i) {
            value = (value << inBits) | data[i];
            bits += inBits;

            while (bits >= outBits) {
                bits -= outBits;
                ret[j] = (value >> bits) & maxV;
                j += 1;
            }
        }

        return ret;
    }

}