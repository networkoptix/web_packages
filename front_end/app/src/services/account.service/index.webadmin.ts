import { Injectable } from '@angular/core';

import { LocalAccount } from './local';
export { Account, isAccount } from './account';

/**
 * This is used by Angular to generate the injectable token and also to provide types for CloudAccount or LocalAccount
 */
@Injectable()
export class NxAccountService extends LocalAccount {}
