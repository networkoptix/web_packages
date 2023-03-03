import { Command, Commands } from './command';
import { HistoryAttributes } from './history-attributes';
import { Params } from './params';
import { PeerId } from './peer-id';
import { PersistentInfo } from './persistent-info';
import { TransactionType, TransactionTypes } from './transaction-type';

/**
 * An abstract class currently only used to define the type for a transaction as well as provide an assert method to check if a transaction is of a certain type.
 *
 * Currently the assertion only checks if the command is the same since that's used to identify between the different types of transactions.
 *
 * Eventually we might want to add https://www.npmjs.com/package/io-ts to validate the data, mostly to make sure that our type definitions are correct.
 *
 * That won't be useful when we're just using the transaction bus to notify us of changes, but it will be useful if we start updatating state using the transaction bus.
 */
export abstract class SystemBusTransaction {
    /**
     * Unique command identifier.
     */
    abstract readonly command: Commands;
    abstract readonly params: Params['params'];
    readonly transactionType: TransactionType<TransactionTypes.Regular>;
    readonly peerID: PeerId['peerID'];
    readonly persistentInfo: PersistentInfo['persistentInfo'];
    readonly historyAttributes: HistoryAttributes['historyAttributes'];

    /**
     * This is used to check if a transaction is of the same type as the class.
     *
     * This is useful when we want to filter out transactions that we don't care about.
     *
     * This also asserts the type so that you'll get type safety if you wanted to do something like check the params.
     *
     * Example usage:
     *
     * const someUnknownTransaction = getTransactionFromSomewhere();
     *
     * if (new SetResourceStatusTransaction().assert(someUnknownTransaction)) {
     *    // someUnknownTransaction is now of type SetResourceStatusTransaction so now we can access the params.
     *    this.updateStatus(someUnknownTransaction.params.status)
     * }
     *
     * @param toCheck - The transaction to check.
     * @returns boolean and asserts that the transaction is of the same type as the class.
     */
    assert = (toCheck: Command): toCheck is typeof this => {
        return toCheck?.command === this.command;
    };
}
