import { BaseAccount } from './base';

export class CloudAccount extends BaseAccount implements BaseAccount {
    customCloudMethod() {
        return 2;
    }
}
