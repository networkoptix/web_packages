import { Commands } from '../base/command';
import { SystemBusTransaction } from '../base/system-bus-transaction';

import { genericTransactionFactory } from './generic';
import { RuntimeInfoRemovedTransaction } from './runtime-info-removed';
import { SetResourceStatusTransaction } from './set-resource-status';

const definedTransactions = {
    [Commands.setResourceStatus]: SetResourceStatusTransaction,
    [Commands.runtimeInfoRemoved]: RuntimeInfoRemovedTransaction,
};

const generatedTransactions = Object.keys(Commands).reduce(
    (acc, command: Commands) => {
        if (command in definedTransactions) {
            return acc;
        }

        const transaction = genericTransactionFactory(command);
        acc[command] = transaction;
        return acc;
    },
    {} as Record<Commands, ReturnType<typeof genericTransactionFactory>>,
);

/**
 * This is a list of all transactions classes that define what can be received from the transaction bus.
 *
 * This will mostly be used for if we wanted to expand on the transaction classes to either include transformation into types we use internally.
 *
 * Initially, the main funcitonality is asserting that the transaction is of a certain type. For that just use the assert functions exposed on assertTransaction.
 */
export const transactionClasses = {
    ...generatedTransactions,
    ...definedTransactions,
};

/**
 * This is a list of assertion functions for each transaction.
 *
 * The assertion methods return a boolean and assert that the transaction is of the same type as the class if true is returned.
 *
 * This can be used to filter out transactions that we don't care about or to narrow the type within a code block.
 */
export const assertTransaction = Object.entries(transactionClasses).reduce(
    (acc, [command, Transaction]) => {
        acc[command] = new Transaction().assert;
        return acc;
    },
    {} as Record<Commands, SystemBusTransaction['assert']>,
);
