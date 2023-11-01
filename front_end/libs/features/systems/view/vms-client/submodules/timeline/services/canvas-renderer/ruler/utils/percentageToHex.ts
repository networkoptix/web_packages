import { percentage } from '@view/datatypes/type-aliases';

type ByteHexString = string;

export function percentageToHex(p: percentage): ByteHexString {
    return Math.round(p * 255).toString(16);
}
