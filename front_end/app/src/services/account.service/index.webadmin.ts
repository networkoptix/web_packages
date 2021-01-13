import { LocalAccount } from './local';
import { Injectable }   from '@angular/core';
export { Account }      from './account';

/**
 * This is used by Angular to generate the injectable token and also to provide types for CloudAccount or LocalAccount
 */
@Injectable()
export class NxAccountService extends LocalAccount {}
