import { Observable, ObservableInput } from 'rxjs';

import { ConfigType } from '@components/console-table/console-table.component.types';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type staticLang from '@language_static';
import type { APIDoc } from '@pages/api-tool/api-tool-types';

export interface ILanguage {
    language: string;
    name: string;
}

export interface FreshSeshConfig {
    accessToken: string;
    getFreshAccessToken: () => Observable<string>;
}

export type WithFreshSession = (
    minSessionSeconds?: number,
) => <T>(observableInputFactory: (config: FreshSeshConfig) => ObservableInput<T>) => Observable<T>;

export type ILanguages = ILanguage[];

export interface CloudResponse {
    errorClass: string;
    errorDetail: number;
    errorText: string;
    resultCode: string;
}

export interface AuthKey {
    auth_key: string;
}

export interface VisitedKey {
    visited: boolean;
}

export interface AuthCode {
    email: string;
}

export interface Screenshot {
    id: string;
    value: string;
    sortKey: number;
    caption?: string;
}

export interface Integration {
    information: {
        name: string;
        shortDescription: string;
        type: {
            id: string;
            label: string;
        }[];
        tags: string;
        companyName: string;
        companyWeb: string;
        companyPrivacyPolicyLink: string;
        termsOfUseLink: string;
    };
    overview: Record<string, Screenshot[]> & {
        overviewVideo: string;
        description: string;
    };
    instructions: Record<string, Screenshot[]> & {
        installationInstructions: string;
        instructionVideo: string;
    };
    support: {
        supportEmail: string;
        supportPhone: string;
        supportWeb: string;
    };
    requirementsAndCompatibility: {
        testedVersions: string[];
        testedBuild: string;
        platforms: string[];
        additionalRequirements: string;
    };
    versionDetails: {
        version: string;
        whatsNew: string;
    };
    mine: boolean;
    pending: boolean;
    draft: boolean;
    id: number;
}

export interface IntegrationCount {
    count: number;
}

export interface SystemAuth {
    authGet: string;
    authPost: string;
    authPlay: string;
}

export interface Firmwares {
    count: number;
    name: string;
    percentage: string;
    barLength: number;
}

export interface Cameras {
    vendor: string;
    model: string;
    count: number;
    primaryCodec: string;
    secondaryCodec: string;
    maxResolution: string;
    sndResolution: string;
    maxFps: number;
    isDualStreamingSupported: boolean;
    isIoSupported: boolean;
    isMdSupported: boolean;
    isPtzSupported: boolean;
    isAudioSupported: boolean;
    isTwAudioSupported: boolean;
    isAptzSupported: boolean;
    isMultiSensor: boolean;
    isFisheye: boolean;
    firmwares: Firmwares[];
    notes: string;
    timestamp: string;
    hardwareType: string;
    aliases: string;
    analyticsEvents: string[];
    isAnalyticsSupported: boolean;
    maxFirmwareCount: number;
    totalCameraCount: number;
    isH265: boolean;
    hardwareTypeId: string;
    resolutionArea: number;
    id: string;
    sortKey: string;
}

export interface Vendors {
    name: string;
    count: number;
}

export interface IPVDCameras {
    cameras: Cameras[];
    vendors: Vendors[];
    analytics: string[];
    num_cameras: number;
    cached: boolean;
}

export interface RegisterUser {
    activated: boolean;
    resultCode?: string;
}

interface BaseSystem {
    accessRole: string;
    authKey: string;
    authKeyHash: string;
    capabilities: Record<string, number>;
    cloudConnectionSubscriptionStatus: boolean;
    customization: string;
    id: string;
    lastLoginTime: string;
    name: string;
    opaque: string;
    registrationTime: string;
    sharingPermissions: { accessRole: string }[];
    stateOfHealth: string;
    status: string;
    system2faEnabled: boolean;
    systemSequence: string;
    usageFrequency: number;
    version: string;
}

export interface UserSystem extends BaseSystem {
    ownerAccountEmail: string;
    ownerAccountId: string;
    ownerFullName: string;
}

export interface OrgSystem extends BaseSystem {
    organizationId: string;
}

export type System = UserSystem | OrgSystem;

/** Cached user when system cannot be reached */
export interface CloudUserV0 {
    accountEmail: string;
    roleIds: string[];
    permissions: string[];
    isEnabled: boolean;
    vmsUserId: string;
    systemId: string;
    accountId: string;
    accountFullName: string;
    usageFrequency: number;
    lastLoginTime: string;
    type: string;
    hidden: boolean;
    readonly: boolean;
}
export interface CloudUser {
    accessRole: string;
    accountEmail: string;
    accountFullName: string;
    accountId: string;
    attributes: string;
    groupIds: string[];
    isEnabled: boolean;
    lastLoginTime: string;
    permissions: string;
    systemId: string;
    usageFrequency: number;
    userRoleId: string;
    vmsUserId: string;
}

export interface Downloads {
    backwardsCompatible: boolean;
    beta: boolean;
    buildNumber: number;
    cloudGroup: string;
    date: string;
    dismissed: boolean;
    installers: Installer[];
    password: string;
    platforms: Platform[];
    product: string;
    productDescription: string;
    releaseNotes: string;
    releaseUrl: string;
    type: string;
    version: string;
    meta_version: string | null; // Used for metavms builds
}

export interface DownloadReleases {
    releases?: Downloads;
    betas?: Downloads;
    patches?: Downloads;
}

type ReadOnlyAPIType = 'VMS';

export interface ReadOnlyAPI {
    id: number;
    enabled: boolean;
    type: ReadOnlyAPIType;
    name: string;
    version: string;
    order: number;
    manifest: string;
}

export interface ReadOnlyAPIDetail extends ReadOnlyAPI {
    files: [
        {
            filename: string;
            type: 'JSON' | 'Preamble Markdown File' | 'Changelog Markdown File';
            content: APIDoc | string;
        },
    ];
}

export interface Installer {
    appType: string;
    beta: boolean;
    cloudGroup: string;
    fileName: string;
    niceName: string;
    path: string;
    platform: string;
}

export interface Platform extends Installer {
    files: Installer[];
    name: string;
}

// There are other properties, but until they're needed outside
// the account settings page name properties are all we need
export interface AccountEdit {
    first_name: string;
    last_name: string;
    // language: string;
}

export interface CloudStorage {
    freeSpace: string;
    id: string;
    ioDevices: {
        dataUrl: string;
        region: string;
        type: string;
    }[];
    owner: string;
    systems: string[];
    totalSpace: string;
}

export interface CloudStorageUsage extends CloudResponse {
    enabled: boolean;
    cloudCapacity: string;
    currentRecordings: number;
    whenFullyUsed: number;
    amountUsed: number;
    archiveFrom: number;
    recordingBitrate: number;
    delayFromLive: number;
    spaceUsed: number;
}

export interface CheckEmailExists {
    active: boolean;
    emailExists: boolean;
}

export interface CustomClient {
    id?: number;
    last_modified: string;
    name: string;
    created_on: string;
    created_by: string;
    values: {
        [field: string]: string;
    };
}

export interface FieldManifest {
    name?: string;
    label: string;
    type: ConfigType;
    description?: string;
    metaOnly?: boolean;
    meta?: Record<string, unknown>;
    optional?: boolean;
    placeholder?: string;
}

export interface ContextManifest {
    name?: string;
    label: string;
    icon?: string;
    fields: FieldManifest[];
    global?: boolean;
}

export interface ContentSettings {
    [key: string]: {
        hidden?: boolean;
        label?: string;
        options?: DropdownItem<string>[];
    };
}

export interface ContentManifest {
    manifest: {
        contexts: ContextManifest[];
        settings?: ContentSettings;
    };
}

export interface DocBlock {
    content: string;
    contentHTML: string;
    type: string;
}

export interface DocAsset {
    id: number;
    shortDescription: string;
    title: string;
    blocks: DocBlock[];
}

export interface TwoFactorBackupCodes {
    backup_code: string;
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
    kbMenus?: string[];
    labels?: string[];
    cropLength?: number;
    perPage?: number;
    page?: number;
}
export interface NotificationAttachment {
    filename: string;
    content: string;
    mimetype: string;
}

export interface EmailNotification {
    targets: string[];
    subject: string;
    systemId?: string;
    messageHtml?: string;
    messageText?: string;
    attachments?: NotificationAttachment[];
}

export interface SystemTransferInfo {
    comment: string;
    fromAccount: string;
    status: string;
    systemId: string;
    systemName: string;
    toAccount: string;
}

export enum DOC_TYPES {
    knowledgebase = 'kb',
    struct = 'struct',
}

export interface LicenseServerInfo {
    systemId: string;
    licenseServer: string;
    cloudHost: string;
    cacheUpdated: boolean;
}

export type ReleasesTypes = keyof typeof staticLang.downloads.releasesTypes;

export type BuildHistory = { [type in ReleasesTypes]?: Downloads[] } & { updatesPrefix?: string };

export interface Build extends Downloads {
    updatesPrefix: string;
}

export interface PackageStatus {
    state: PackageState;
    message?: string;
    errors: string[];
    current: number;
    total: number;
}

export enum PackageState {
    PENDING = 'pending',
    READY = 'ready',
    FAILED = 'failed',
}

export enum ClientType {
    loginCloud = 'loginToCloud',
    loginWebadmin = 'loginToWebadmin',
    passwordApply = 'confirmPasswordApplyChanges',
    passwordDisconnect = 'confirmPasswordDisconnect',
    passwordMerge = 'confirmPasswordMerge',
    passwordBackup = 'confirmPasswordCreateBackup',
    passwordRestore = 'confirmPasswordRestoreBackup',
    passwordReset = 'confirmPasswordResetServer',
    passwordRestart = 'confirmPasswordRestartServer',
    passwordDetach = 'confirmPasswordDetachServer',
    passwordTransfer = 'confirmPasswordTransfer',
    create = 'createAccount',
    connect = 'connectSystemToCloud',
    setup = 'setupWizard',
    renewDesktop = 'renewSessionDesktop',
    renewWeb = 'renewSessionWeb',
    renewWeb2FA = 'renewSessionWeb2FA',
    openClient = 'openClientFromCloud',
    system2faAuth = 'system2faAuth',
}

export interface AuthorizeParams {
    response_type: string;
    client_id: string;
    redirect_uri?: string;
    redirect_url?: string;
    client_type?: ClientType;
    view_type?: 'desktop' | 'mobile' | 'web';
    grant_type?: string;
    scope?: string;
    state?: string;
    code?: string;
    message?: 'passwordReset' | 'activated';
    email?: string;
    access_code?: string;
    access_token?: string;
    lang?: string;
    system_name?: string;
}

export interface AuthenticateResp {
    code?: string;
    link?: string;
}

export interface TosInfo {
    accepted: boolean;
    body: string;
    grace_period: number;
    review_id: string;
}
