import { Injectable } from '@angular/core';

import { SyncEffects } from '@store/sync.effects';

import * as ActiveLayoutActions from './active-layout.actions';

@Injectable()
export class ActiveLayoutSync extends SyncEffects {
    constructor() {
        super(Object.values(ActiveLayoutActions));
    }
}
