export interface DeleteResponse {
    errorClass: string;
    errorDetail: string;
    errorText: string;
    resultCode: string;
}

export interface CdbBindResponse {
    id: string;
    name: string;
    customization: string;
    authKey: string;
    authKeyHash: string;
    status: string;
    systemSequence: number;
    opaque: string;
    registrationTime: string;
    system2faEnabled: boolean;
    ownerAccountId: string;
    ownerAccountEmail: string;
    ownerFullName: string;
}

export interface ChannelPartnerBindResponse {
    id: string;
    name: string;
    customization: string;
    authKey: string;
    authKeyHash: string;
    status: string;
    systemSequence: number;
    opaque: string;
    registrationTime: string;
    system2faEnabled: boolean;
    organizationId: string;
}

export type BindResponse =
    | Pick<CdbBindResponse, 'id' | 'authKey' | 'ownerAccountEmail'>
    | Pick<ChannelPartnerBindResponse, 'id' | 'authKey' | 'organizationId'>;
