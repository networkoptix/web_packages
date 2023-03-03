import { Commands } from '../base/command';
import { SystemBusTransaction } from '../base/system-bus-transaction';

interface GenericTransactionInstance extends SystemBusTransaction {}
interface GenericTransactionConstructor {
    new (): GenericTransactionInstance;
}

export function genericTransactionFactory(command: Commands): GenericTransactionConstructor {
    const commandConst = Commands[command] as const;
    return class GenericTransaction extends SystemBusTransaction {
        command: typeof commandConst = commandConst;
        params: unknown;
    };
}
