import { Injectable } from '@angular/core';

import { CloudAccount } from './cloud';
export { Account, isAccount, DUMMY_ACCOUNT } from './account';

/**
 * This is used by Angular to generate the injectable token and also to provide types for CloudAccount or LocalAccount
 *
 * This file is updated by the update-account.py script to extend either CloudAccount or LocalAccount.
 */
@Injectable()
export class NxAccountService extends CloudAccount {}
