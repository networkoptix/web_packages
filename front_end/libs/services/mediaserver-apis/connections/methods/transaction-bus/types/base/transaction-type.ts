export enum TransactionTypes {
    Regular = 'Regular',
    Common = 'Common'
}

export interface TransactionType<T = TransactionTypes> {
    transactionType: T;
}
