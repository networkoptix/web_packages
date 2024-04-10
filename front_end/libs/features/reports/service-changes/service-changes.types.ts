export interface ServiceChangeRecord {
    serviceId: string;
    amount: number;
    addedToId: string;
    date: string;
}

export interface FormattedServiceChangeRecord {
    serviceName: string;
    amount: number;
    addedToName: string;
    date: string;
}
