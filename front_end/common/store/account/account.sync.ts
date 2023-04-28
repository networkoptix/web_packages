
import { Injectable } from '@angular/core';

import { SyncEffects } from '../sync.effects';

import * as accountActions from './account.actions';

@Injectable()
export class AccountSync extends SyncEffects {
    constructor() {
        super(Object.values(accountActions));
    }
}
