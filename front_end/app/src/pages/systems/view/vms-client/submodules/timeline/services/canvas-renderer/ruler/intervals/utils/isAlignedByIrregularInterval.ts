import IrregularLengthInterval from '../IrregularLengthInterval';

import { timeStampMs, alignTimeStamp } from './alignTimeStamp';

export const isAlignedByIrregularInterval = (
    when: timeStampMs,
    interval: IrregularLengthInterval
) => {
    return when === alignTimeStamp(when, interval);
};

export default isAlignedByIrregularInterval;
