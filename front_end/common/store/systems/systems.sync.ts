import { Injectable } from '@angular/core';

import { SyncEffects } from '../sync.effects';

import * as systemsActions from './systems.actions';

@Injectable()
export class SystemsSync extends SyncEffects {
    constructor() {
        super(Object.values(systemsActions));
    }
}
