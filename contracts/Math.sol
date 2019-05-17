pragma solidity 0.5.0;

contract Math
{
    /**
     * 2^127.
     */
    uint128 private constant TWO127 = 0x80000000000000000000000000000000;

    /**
     * 2^128 - 1.
     */
    uint128 private constant TWO128_1 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

    /**
     * ln(2) * 2^128.
     */
    uint128 private constant LN2 = 0xb17217f7d1cf79abc9e3b39803f2f6af;

    /**
     * Return index of most significant non-zero bit in given non-zero 256-bit
     * unsigned integer value.
     *
     * @param x value to get index of most significant non-zero bit in
     * @return index of most significant non-zero bit in given number
     */
    function mostSignificantBit(uint256 x) pure internal returns (uint8) {
        require (x > 0);

        uint8 l = 0;
        uint8 h = 255;

        while (h > l) {
            uint8 m = uint8 ((uint16 (l) + uint16 (h)) >> 1);
            uint256 t = x >> m;
            if (t == 0) h = m - 1;
            else if (t > 1) l = m + 1;
            else return m;
        }

        return h;
    }

    /**
     * Calculate log_2 (x / 2^128) * 2^128.
     *
     * @param x parameter value
     * @return log_2 (x / 2^128) * 2^128
     */
    function log_2(uint256 x) pure internal returns (int256) {
        require(x > 0);

        uint8 msb = mostSignificantBit (x);

        if (msb > 128) x >>= msb - 128;
        else if (msb < 128) x <<= 128 - msb;

        x &= TWO128_1;

        int256 result = (int256 (msb) - 128) << 128; // Integer part of log_2

        int256 bit = TWO127;
        for (uint8 i = 0; i < 128 && x > 0; i++) {
            x = (x << 1) + ((x * x + TWO127) >> 128);
            if (x > TWO128_1) {
                result |= bit;
                x = (x >> 1) - TWO127;
            }
            bit >>= 1;
        }

        return result;
    }

    /**
     * Calculate ln (x / 2^128) * 2^128.
     *
     * @param x parameter value
     * @return ln (x / 2^128) * 2^128
     */
    function ln(uint256 x) pure internal returns (int256) {
        require(x > 0);

        int256 l2 = log_2(x);
        if (l2 == 0) { return 0; }
        else {
            uint256 al2 = uint256(l2 > 0 ? l2 : -l2);
            uint8 msb = mostSignificantBit(al2);

            if (msb > 127) {
                al2 >>= msb - 127;
            }

            al2 = (al2 * LN2 + TWO127) >> 128;

            if (msb > 127) {
                al2 <<= msb - 127;
            }

            return int256(l2 >= 0 ? al2 : -al2);
        }
    }
}