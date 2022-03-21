import { ConfigType } from '@components/console-table/console-table.component.types';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { APIDoc } from '@pages/api-tool/api-tool-types';

/* eslint-disable camelcase */
export interface ILanguage{
    language: string;
    name: string;
}

export type ILanguages = ILanguage[];

export interface CloudResponse {
    errorClass: string,
    errorDetail: number,
    errorText: string,
    resultCode: string
}

export interface AuthKey {
    'auth_key': string
}

export interface VisitedKey {
    visited: boolean
}

export interface AuthCode {
    email: string
}

export interface Integration {
    information: {
        name: string,
        shortDescription: string,
        type: {
            id: string,
            label: string,
        }[],
        tags: string,
        companyName: string,
        companyWeb: string,
        companyPrivacyPolicyLink: string,
        termsOfUseLink: string
    },
    overview: {
        [overviewTexts: string]: string
    },
    instructions: {
        [instructionScreenshots: string]: string,
        installationInstructions: string
    },
    support: {
        supportEmail: string,
        supportPhone: string,
        supportWeb: string
    },
    requirementsAndCompatibility: {
        testedVersions: string[],
        testedBuild: string,
        platforms: string[],
        additionalRequirements: string
    },
    versionDetails: {
        version: string,
        whatsNew: string
    },
    mine: boolean,
    pending: boolean,
    draft: boolean,
    id: number
}

export interface IntegrationCount {
    count: number;
}

export interface SystemAuth {
    authGet: string,
    authPost: string,
    authPlay: string
}

interface Firmwares {
    count: number,
    name: string,
    percentage: string,
    barLength: number
}

interface Cameras {
    vendor: string,
    model: string,
    count: number,
    primaryCodec: string,
    secondaryCodec: string,
    maxResolution: string,
    sndResolution: string,
    maxFps: number,
    isDualStreamingSupported: boolean,
    isIoSupported: boolean,
    isMdSupported: boolean,
    isPtzSupported: boolean,
    isAudioSupported: boolean,
    isTwAudioSupported: boolean,
    isAptzSupported: boolean,
    isMultiSensor: boolean,
    isFisheye: boolean,
    firmwares: Firmwares[],
    notes: string,
    timestamp: string,
    hardwareType: string,
    aliases: string,
    analyticsEvents: string[],
    isAnalyticsSupported: boolean,
    maxFirmwareCount: number,
    totalCameraCount: number,
    isH265: boolean,
    hardwareTypeId: string,
    resolutionArea: number,
    sortKey: string
}

interface Vendors {
    name: string,
    count: number
}

export interface IPVDCameras {
    cameras: Cameras[],
    vendors: Vendors[],
    analytics: string[],
    'num_cameras': number,
    cached: boolean
}

export interface RegisterUser {
    activated: boolean,
    resultCode?: string
}

export interface System {
    accessRole: string,
    authKey: string,
    capabilities: {
        [capability: string]: string
    },
    cloudConnectionSubscriptionStatus: boolean,
    customization: string,
    id: string,
    lastLoginTime: string,
    name: string,
    opaque: string,
    ownerAccountEmail: string,
    ownerFullName: string,
    registrationTime: string,
    sharingPermissions: { accessRole: string }[],
    stateOfHealth: string,
    status: string,
    systemSequence: string,
    usageFrequency: number
}

export interface CloudUser {
    accessRole: string,
    accountEmail: string,
    accountFullName: string,
    accountId: string,
    customPermissions: string,
    isEnabled: boolean,
    lastLoginTime: string,
    systemId: string,
    usageFrequency: number,
    userRoleId: string,
    vmsUserId: string
}

export interface CloudUsers extends Array<CloudUser> {}

export interface Downloads {
    version: string,
    releaseNotes: string,
    product: string,
    productDescription: string,
    date: string,
    buildNumber: number,
    password: string,
    type: string,
    installers: Installers[],
    platforms: Platforms[],
    cloudGroup: string,
    beta: boolean,
    dismissed: boolean,
    releaseUrl: string
}

type OpenAPIJSONType = 'VMS';

export interface OpenAPIJSON {
    id: number,
    type: OpenAPIJSONType,
    name: string,
    version: string,
    content: APIDoc,
    enabled: boolean
}

interface Installers {
    platform: string,
    appType: string,
    beta: boolean,
    cloudGroup: string,
    fileName: string,
    path: string,
    niceName: string
}

interface Platforms extends Installers {
    url: string
}

export interface AccountEdit {
    'first_name': string,
    'last_name': string,
    language: string
}

export interface CloudStorage {
    freeSpace: string,
    id: string,
    ioDevices: {
        dataUrl: string,
        region: string,
        type: string,
    }[],
    owner: string,
    systems: string[],
    totalSpace: string,
}

export interface CloudStorageUsage extends CloudResponse {
    enabled: boolean,
    cloudCapacity: string,
    currentRecordings: number,
    whenFullyUsed: number,
    amountUsed: number,
    archiveFrom: number,
    recordingBitrate: number,
    delayFromLive: number,
    spaceUsed: number
}

export interface CheckEmailExists {
    active: boolean,
    emailExists: boolean
}

export interface CustomClient {
    id?: number;
    last_modified: string;
    name: string;
    created_on: string
    created_by: string;
    values: {
        [field: string]: string
    };
}

export interface FieldManifest {
    name: string;
    label: string;
    description: string;
    type: ConfigType;
    metaOnly: boolean;
    optional: boolean;
    placeholder?: string;
}

export interface ContextManifest {
    name: string;
    label: string;
    icon?: string;
    fields: FieldManifest[];
    global: boolean;
}

export interface ContentSettings {
    [key: string]: {
        hidden?: boolean,
        label?: string,
        options?: DropdownItem[]
    }
}

export interface ContentManifest {
    manifest: {
        contexts: ContextManifest[]
        settings?: ContentSettings
    }
}

export interface DocBlock {
    content: string,
    contentHTML: string,
    type: string;
}

export interface DocAsset {
    id: number,
    shortDescription: string,
    title: string,
    blocks: DocBlock[]
}

export interface TwoFactorBackupCodes {
    backup_code: string
}

export interface ExplorerNode {
    name: string;
    id?: number;
    type?: string;
    baseVmsId?: number;
    children?: ExplorerNode[];
}

export interface InstantSearchOptions {
    query: string;
    kbMenus?: string[],
    labels?: string[];
    cropLength?: number;
    perPage?: number;
    page?: number;
}
export interface NotificationAttachment {
    filename: string,
    content: string,
    mimetype: string
}

export interface EmailNotification {
    targets: string[],
    subject: string,
    systemId?: string,
    messageHtml?: string,
    messageText?: string,
    attachments?: NotificationAttachment[]
}

export interface SystemTransferInfo {
    comment: string;
    fromAccount: string;
    status: string;
    systemId: string;
    systemName: string;
    toAccount: string;
}
