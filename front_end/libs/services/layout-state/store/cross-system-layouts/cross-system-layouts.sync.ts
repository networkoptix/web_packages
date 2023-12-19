import { Injectable } from '@angular/core';

import { SyncEffects } from '@store/sync.effects';

import * as LocalLayoutsActions from './cross-system-layouts.actions';

@Injectable()
export class CrossSystemLayoutsSync extends SyncEffects {
    constructor() {
        super(Object.values(LocalLayoutsActions));
    }
}
