import { percentage } from '@vms-client/utils/type-aliases';

type ByteHexString = string

export function percentageToHex (p: percentage): ByteHexString {
    return Math.round(p * 255).toString(16);
}

export default percentageToHex;
