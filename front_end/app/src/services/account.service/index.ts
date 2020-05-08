import { BaseAccount } from './base';
export { Account } from './account';

/**
 * This is used by Angular to generate the injectable token used CloudAccount or LocalAccount
 * Also provides types to existing NxAccountService imports that are compatible with updated
 * CloudAccount and LocalAccount classes.
 *
 * We could create an injection token without using this NxAccountService class, if
 * typescript has/adds a way to programmatically set a type based on a value we could
 * replace this with a type alias.
 */
export class NxAccountService extends BaseAccount {}
