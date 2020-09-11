import { LocalAccount } from './local';
export { Account } from './account';

/**
 * This is used by Angular to generate the injectable token and also to provide types for CloudAccount or LocalAccount
 */
export class NxAccountService extends LocalAccount {}
