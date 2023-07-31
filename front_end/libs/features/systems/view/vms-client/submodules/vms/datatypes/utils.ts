import { ms } from '@vms-client/utils/type-aliases';

import { CameraArchive, ISimpleTimeRange } from './ICamera';

export function _isThereRecord(archive: CameraArchive, t: ms): boolean {
    // binary search approach:
    let l = 0;
    let r = archive.length - 1;
    while (l < r) {
        const m = l + Math.floor((r - l) / 2);
        const rec = archive[m];
        if (rec.start <= t && rec.end >= t) {
            return true;
        }
        if (rec.start > t) {
            r = m < r ? m : r - 1;
        } else {
            l = m > l ? m : l + 1;
        }
    }
    return false;

    // naive linear search approach:
    // return !!archive.find(r => r.start <= t && r.end >= t)
}

export function _getNextRecord(archive: CameraArchive, t: ms): ISimpleTimeRange {
    // binary search approach:
    let l = 0;
    let r = archive.length - 1;
    while (l < r) {
        const m = l + Math.floor((r - l) / 2);
        const rec = archive[m];
        const prevRec = m > 0 ? archive[m - 1] : null;
        if (rec.start >= t && (!prevRec || prevRec.end <= t)) {
            return rec;
        }
        if (rec.start > t) {
            r = m < r ? m : r - 1;
        } else {
            l = m > l ? m : l + 1;
        }
    }
    if (l === r && archive[l].start >= t) {
        return archive[l];
    }
    return null;

    // naive linear search approach:
    // return archive.find(r => r.start >= t)
}
