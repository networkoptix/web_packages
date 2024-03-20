export enum EntityType {
    channelPartner = 'channel-partner',
    organization = 'organization',
}

export interface ServiceChangeRecord {
    serviceName: string;
    amount: number;
    addedTo: string;
    date: string;
}
