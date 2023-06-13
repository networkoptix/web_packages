import type { SelectionModel } from '@angular/cdk/collections';
import type { DialogRef as CdkDialogRef } from '@angular/cdk/dialog';
import type { EventEmitter, TemplateRef } from '@angular/core';
import type { NgForm } from '@angular/forms';

import type { Bookmark } from '@pages/systems/bookmarks/bookmarks.types';
import type { ExportSelection } from '@pages/systems/view/vms-client/submodules/timeline/components/nx-webgl-canvas/selection/selection.types';
import type { SELECTION_DATE_RANGE } from '@pages/systems/view/vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.types';
import type { TimelineSelectionService } from '@pages/systems/view/vms-client/submodules/timeline/services/timeline.selection.service';
import type { Translatable } from '@pipes/nx-translate.types';
import type {
    ChannelPartner,
    ChannelPartnerUser,
    Id as CpId,
    Organization,
    OrganizationUser,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type { CloudResponse, SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { Process } from '@services/process.service/process';
import type { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import type { CloudStorageManager } from '@services/system.service/cloud-storage-manager/cloud-storage-manager';
import type { LicenseManager } from '@services/system.service/license-manager/licence-manager';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/system-types';
import type { NxUser } from '@services/system.service/user-manager/user-manager-types';
import type { NxSystemInfo } from '@services/systems.service.types';

import type { DialogRef } from './dialog-ref';
import { MergeError, MergeInfo } from './merge/merge.refactor.component.types';
import { NewFeatureTemplate } from './new-feature/new-feature.component.types';
import { TfaAction } from './two-fa/two-fa.component.types';
import type { SessionState } from './update-session/update-session.component.types';

export interface DialogType<D = unknown, R = unknown> {
    data: D;
    return: R;
}

/* General use */
interface ApplyData {
    applyFunc: Process;
    discardFunc?: () => void;
    form: NgForm;
}
export type Apply = DialogType<ApplyData, 'applied' | 'canceled' | 'discarded'>;

interface GenericData {
    title: Translatable;
    disableClose?: boolean;
    message?: Translatable;
    safeHTML?: boolean;
    footer?: CloseOnlyGenericFooter | ActionableGenericFooter;
}
interface CloseOnlyGenericFooter {
    footerClass?: string;
    buttonClass?: string;
    actionable?: false;
}
interface ActionableGenericFooter {
    footerClass?: string;
    buttonClass?: string;
    actionable: true;
    // Ideally actionLabel alone would type narrow to actionable footer, but
    // Angular template doesn't recognize it
    actionLabel: Translatable;
    cancelLabel?: Translatable;
}
export type Generic = DialogType<GenericData, boolean>;

interface AlertData extends GenericData {
    footer?: Omit<CloseOnlyGenericFooter, 'actionable'>;
}
export interface Alert extends Generic {
    data: AlertData;
}

interface ConfirmData extends GenericData {
    footer: Omit<ActionableGenericFooter, 'actionable'>;
}
export interface Confirm extends Generic {
    data: ConfirmData;
}

interface MessageData {
    messageType: string;
    data: {
        disclaimer: Translatable;
        email?: string;
        asset: string;
        assetId?: string;
        to?: string;
    };
}
export type Message = DialogType<MessageData, true>;

/* Auth */
interface UpdateSessionData {
    sessionState: SessionState;
    system: NxSystem;
    noConnectionMsg?: string;
    processAction?: string;
    openingRef?: DialogRef | CdkDialogRef;
}
export type UpdateSession = DialogType<UpdateSessionData, boolean>;
export type Client2faWarning = DialogType<void, void>;

/* Account */
interface Account2faActionData {
    [TfaAction.Enable]: void;
    [TfaAction.Disable]: { num2FaSystems: number };
    [TfaAction.PasswordChange]: {
        newPassword: string;
        oldPassword: string;
    };
    [TfaAction.CodeOnLoginEnable]: void;
    [TfaAction.CodeOnLoginDisable]: void;
    [TfaAction.NewBackupCodes]: void;
}
export interface Account2faData<Action extends TfaAction> {
    action: Action;
    data?: Account2faActionData[Action];
}
// Return is not action dependent, so it's separated from the data for convenience
export type Account2faReturn = string;

/* Systems */

/* Channel partners */
export type AddChannelPartner = DialogType<CpId, ChannelPartner>;
export type EditChannelPartner = DialogType<ChannelPartner, ChannelPartner>;
export type AddPartnerUser = DialogType<CpId, ChannelPartnerUser>;
export type EditPartnerUser = DialogType<
    { channelPartner: CpId; user: ChannelPartnerUser },
    ChannelPartnerUser
>;
export type AddOrganization = DialogType<CpId, Organization>;
export type EditOrganization = DialogType<Organization, Organization>;
export type AddOrgUser = DialogType<CpId, OrganizationUser>;
export type EditOrgUser = DialogType<{ orgId: CpId; user: OrganizationUser }, OrganizationUser>;

/* Groups */
export type CreateSystemGroup = DialogType<
    {
        targetId: string;
        parentGroup: string;
        hasGroups: boolean;
    },
    void
>;

/* Admin */
export type ConnectLocalToCloud = DialogType<NxSystem, boolean>;
export type Disconnect = DialogType<NxSystem, boolean>;
export type RemoveSystem = DialogType<NxSystem, boolean>;

interface MergeRefactorData {
    system: NxSystem;
    systems: NxSystemInfo[];
}

export type MergeRefactored = DialogType<MergeRefactorData, MergeInfo | MergeError>;

interface Mandatory2faData {
    system: NxSystem;
    system2faEnabled: boolean;
}

export type Mandatory2fa = DialogType<Mandatory2faData, boolean>;

export type TransferOwnership = DialogType<NxSystem, SystemTransferInfo>;

/* Cloud storage */
export type CloudStorage = DialogType<
    {
        licenseManager: LicenseManager;
        cloudStorageManager?: CloudStorageManager;
    },
    void
>;

/* Cameras */
export type UpdateCameraCredentials = DialogType<
    {
        camera: NxSystemCamera;
        system: NxSystem;
        defaultPassword?: boolean;
        updateCallback: () => Promise<void>;
    },
    void
>;

/* Users */
export type AddUser = DialogType<NxSystem, string>;
export type RemoveUser = DialogType<
    {
        system: NxSystem;
        user: NxUser;
    },
    true
>;
export type DeleteCloudUser = DialogType<void, CloudResponse>;
export type ChangePassword = DialogType<{ system: NxSystem; user: NxUser }, boolean>;

/* Servers */
interface ServerData {
    system: NxSystem;
    server: NxSystemServer;
}
export type RestartServer = DialogType<ServerData, string>;
export type ResetServer = DialogType<ServerData, true>;
export type DetachServer = DialogType<ServerData, true>;

/* Bookmarks */
export type MoreDevices = DialogType<
    {
        devices: string[];
        selection: SelectionModel<string>;
        emitter: EventEmitter<void>;
    },
    void
>;
export type MoreTags = DialogType<
    {
        tags: string[];
        selection: SelectionModel<string>;
        emitter: EventEmitter<void>;
    },
    void
>;
export type BookmarkDetails = DialogType<
    {
        bookmark: Bookmark;
        startTime: string;
        startDate: string;
    },
    void
>;

/* New feature */
export interface NewFeatureDynamicData {
    content: TemplateRef<unknown>;
    data: void;
}
export interface CloudStorageInfoData {
    content: NewFeatureTemplate.CloudStorage;
    data: LicenseManager;
}
export interface CloudLayoutsInfoData {
    content: NewFeatureTemplate.CloudLayouts;
    data: void;
}
export type NewFeatureData = NewFeatureDynamicData | CloudStorageInfoData | CloudLayoutsInfoData;
export type NewFeature = DialogType<NewFeatureData, boolean>;

/* View */
export type SelectTimeRange = DialogType<
    { selection: TimelineSelectionService; start: number; end: number },
    { start: number; end: number }
>;
export type WebGlSelectTimeRange = DialogType<ExportSelection, SELECTION_DATE_RANGE>;
