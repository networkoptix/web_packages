export interface SystemTransaction {
    command: string;
}

export interface SystemBusMessage {
    tran: SystemTransaction;
}
