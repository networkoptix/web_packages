import { Injectable } from '@angular/core';

import { SyncEffects } from '@store/sync.effects';

import * as LocalLayoutsActions from './local-layouts.actions';

@Injectable()
export class LocalLayoutsSync extends SyncEffects {
    constructor() {
        super(Object.values(LocalLayoutsActions));
    }
}
