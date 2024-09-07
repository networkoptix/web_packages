import { Injectable, inject } from '@angular/core';

import { NxApplyV3Service } from './apply-v3.service';

/** Pages must implement this to be compatible with the guard */
// Should be fine to export here since it requires the apply service anyway
// eslint-disable-next-line nx/only-export-injectable
export interface NxApplyV3Page {
    applyV3Service: NxApplyV3Service;
}

/** Class to inherit the apply page inferface from.
 *
 * JS doesn't have multiple inheritance so if the component is already
 * extending another class the interface should be implemented instead.
 */
@Injectable()
export class BaseApplyV3Page implements NxApplyV3Page {
    applyV3Service = inject(NxApplyV3Service);
}
