import { IrregularLengthInterval } from '../IrregularLengthInterval';

import { alignTimeStamp, timeStampMs } from './alignTimeStamp';

export const isAlignedByIrregularInterval = (
    when: timeStampMs,
    interval: IrregularLengthInterval,
): boolean => {
    return when === alignTimeStamp(when, interval);
};
