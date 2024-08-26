export interface ServiceChangeRecord {
    serviceId: string;
    amount: number;
    changedAtId: string;
    date: string;
}

export interface FormattedPartnerServiceChangeRecord {
    serviceName: string;
    amount: number;
    changedAtName: string;
    date: string;
}

export interface FormattedOrgServiceChangeRecord {
    serviceName: string;
    amount: number;
    changedAtPath: string[];
    date: string;
}

export type FormattedServiceChangeRecord =
    | FormattedPartnerServiceChangeRecord
    | FormattedOrgServiceChangeRecord;
