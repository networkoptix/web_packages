import { Injectable } from '@angular/core';

import { SyncEffects } from '../sync.effects';

import { SystemResourcesActions } from '.';

@Injectable()
export class SystemResourcesSync extends SyncEffects {
    constructor() {
        super(Object.values(SystemResourcesActions));
    }
}
