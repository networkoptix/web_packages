/** Swagger on {{licenseServerInstance}}/nxlicensed/api-docs-internal */

type int = number;
export type uuid = string;
type email = string;
type datetime = string;

export interface Id {
  id: uuid
}

/** CameraUsage from schema */
export interface Usage extends Id {
  usage: int
}

/** CloudStorage from schema */
export interface CloudStorageSize {
  cloudStorageSizeBytes: string
}

export interface CloudSystemId {
  cloudSystemId: uuid
}

export interface SourceCloudSystemId {
  sourceCloudSystemId: uuid
}

export interface TargetCloudSystemId {
  targetCloudSystemId: uuid
}

export interface LicenseKey {
  licenseKey: uuid
}

/** CloudLicenseActivateRequest and CloudLicenseDeactivateRequest from schema */
export interface CloudLicenseUpdate extends CloudSystemId, LicenseKey {
  userId?: email
}

/** CloudLicenseChangeRequest from schema */
export interface CloudLicenseChange extends LicenseKey, SourceCloudSystemId, TargetCloudSystemId { }

export enum ServiceType {
  LOCAL_RECORDING = 'localRecording',
  CLOUD_STORAGE = 'cloudStorage'
}

/** LocalRecordingUsage from schema */
export interface RecordingUsage {
  service?: ServiceType,
  licenseUsingDeviceList: Usage[]
}

/** CloudLicenseSecurityRequest from schema */
export interface UsageReportRequest extends CloudSystemId {
  usages?: RecordingUsage[],
  from: datetime,
  to: datetime
}

export enum LicenseVersion {
  '1.0' = '1.0',
  '2.0' = '2.0'
}

/** LocalRecording from schema */
export interface RecordingChannels {
  totalChannelNumber: int
}

/** LicenseServices from schema */
export interface LicenseServices {
  [ServiceType.LOCAL_RECORDING]?: RecordingChannels,
  [ServiceType.CLOUD_STORAGE]: CloudStorageSize
}

export enum LicenseState {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export interface ExpirationDate {
  expirationDate: datetime
}

/** State from schema */
export interface LicenseStateInfo extends CloudSystemId, ExpirationDate {
  licenseState: LicenseState,
  userIds: uuid[],
  firstActivationDate: datetime,
  lastActivationDate: datetime,
  deactivationsRemaining: int
}

/** Security from schema */
export interface SecurityInfo {
  checkPeriod?: int,
  lastCheck: datetime,
  tmpExpirationDate: datetime,
  issue: string
}

/** OrderParams from schema */
export interface OrderParams extends LicenseKey {
  brand: string,
  licensePeriod: string,
  totalDeactivationNumber: int
}

/** Params from schema */
export interface LicenseParams {
  services: LicenseServices,
  orderParams: OrderParams,
  masterSignature?: string
}

/** LicenseInspectResponse from schema */
export interface LicenseInfo extends Partial<RecordingChannels & LicenseKey> {
  version: LicenseVersion,
  licenseType: string,
  brand: string,
  expirationDate: string,
  params: LicenseParams,
  state: LicenseStateInfo,
  security: SecurityInfo,
  signature: string
}

export interface Key {
  key: uuid
}

/** StorageActivateBody from schema */
export interface StorageBase extends CloudSystemId, Key { }

export interface Expiration {
  expirationTs: datetime
}

/** StorageActivationShort from schema */
export interface StorageActivationInfo extends CloudStorageSize, Expiration { }

/** StorageActivation from schema */
export interface StorageActivation extends StorageBase, StorageActivationInfo { }

export enum EventType {
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  DISABLE = 'disable',
  UPDATE = 'update'
}

export interface StorageEventParams extends Partial<Pick<Record<string, number>, 'limit' | 'startId'>> { }

/** StorageEventResponse from schema */
export interface StorageEvent extends Id, CloudStorageSize, Key, Partial<CloudSystemId>, Partial<Expiration> {
  eventType: EventType,
  timestamp: datetime,
}

/** StorageSystemBody from schema */
export interface CloudSystemIds {
  cloudSystemIds: uuid[]
}

/** SystemLicense from schema */
export interface SystemLicense extends CloudSystemId {
  license: uuid
}

/** StorageValidateParam from schema */
export interface ValidateSystemLicense {
  systemLicenses: SystemLicense[]
}

/** StorageValidateResponse from schema */
export interface SystemLicenseInfo extends SystemLicense, StorageActivationInfo {
  deactivated: boolean
}

/** SystemStorage from schema */
export interface SystemStorage {
  systemId: uuid,
  activations: StorageActivationInfo[]
}
