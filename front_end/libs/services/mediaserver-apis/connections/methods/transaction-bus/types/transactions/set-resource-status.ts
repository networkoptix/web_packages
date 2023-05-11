import { Commands } from '../base/command';
import { SystemBusTransaction } from '../base/system-bus-transaction';

export enum ResourceStatus {
    Online = 'Online',
    Offline = 'Offline',
}

export interface SetResourceStatusTransactionParams {
    id: string;
    status: ResourceStatus;
}

/**
 * When a resource Online/Offline status changes, this transaction is sent to the transaction bus.
 */
export class SetResourceStatusTransaction extends SystemBusTransaction {
    command = Commands.setResourceStatus;
    params: SetResourceStatusTransactionParams;
}
