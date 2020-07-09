type ByteHexString = string

import { percentage } from '../../../../basic_types/numbers';

export function percentageToHex (p: percentage): ByteHexString {
    return Math.round(p * 255).toString(16)
}
