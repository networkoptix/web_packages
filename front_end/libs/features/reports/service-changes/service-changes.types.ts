import {
    CloudSystem,
    GroupStructureItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

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

export type GroupMap = Map<string, GroupStructureItem>;
export type SystemMap = Map<string, CloudSystem>;
export type SystemToGroupPathMap = Map<string, string[]>;
