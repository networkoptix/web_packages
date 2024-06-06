export interface ServiceChangeRecord {
    serviceId: string;
    amount: number;
    changedAtId: string;
    date: string;
}

export interface FormattedServiceChangeRecord {
    serviceName: string;
    amount: number;
    changedAtName: string;
    date: string;
}
