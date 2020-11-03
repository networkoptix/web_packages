type ByteHexString = string

import { percentage } from '../../../../../utils/type-aliases'

export function percentageToHex (p: percentage): ByteHexString {
    return Math.round(p * 255).toString(16)
}

export default percentageToHex
