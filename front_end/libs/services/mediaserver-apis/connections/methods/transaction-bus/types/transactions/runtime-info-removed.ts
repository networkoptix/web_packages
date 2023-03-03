import { Commands } from '../base/command';
import { SystemBusTransaction } from '../base/system-bus-transaction';
import { Id } from '../common';

export class RuntimeInfoRemovedTransaction extends SystemBusTransaction {
    command = Commands.runtimeInfoRemoved;
    params: Id;
}
