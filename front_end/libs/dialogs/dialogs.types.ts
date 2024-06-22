import type { SelectionModel } from '@angular/cdk/collections';
import type { DialogRef } from '@angular/cdk/dialog';
import type { EventEmitter, TemplateRef } from '@angular/core';
import type { Observable } from 'rxjs';

import type { ExportSelection } from '@components/nx-webgl-canvas/interactions/selection/selection.types';
import type { SELECTION_DATE_RANGE } from '@components/nx-webgl-canvas/services/webgl.types';
import type { OrgUser } from '@pages/home/store/org-users/org-users.types';
import type { Bookmark, BookmarksDevice } from '@pages/systems/bookmarks/bookmarks.types';
import type { Row } from '@pages/systems/services/services.types';
import type { TimelineSelectionService } from '@pages/systems/view/vms-client/submodules/timeline/services/timeline.selection.service';
import type { Translatable } from '@pipes/nx-translate.types';
import type {
    ChannelPartner,
    ChannelPartnerUser,
    CloudSystem,
    DetailTableResponse,
    Group,
    GroupItem,
    Organization,
    OrganizationUser,
    ServiceQuantities,
    State,
    SystemItem,
    SystemService,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type {
    CloudResponse,
    SystemTransferInfo,
    AgreementInfo,
} from '@services/nx-cloud-api/nx-cloud-api.types';
import type { Process } from '@services/process.service/process';
import { BookmarkV4 } from '@services/system-api.types/devices.types';
import type { MergeInfo } from '@services/system-api.types/system.types';
import { NxUser } from '@services/system-user.types';
import type { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import type { CloudStorageManager } from '@services/system.service/cloud-storage-manager/cloud-storage-manager';
import type { LicenseManager } from '@services/system.service/license-manager/licence-manager';
import type { StorageManager } from '@services/system.service/storage-manager/storage-manager';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/types/servers.types';
import type { NxSystemInfo } from '@services/systems.service.types';

import type { UserRecord } from '../features/home/components/users/channel-partner-users/channel-partner-users.types';

import { MergeError } from './merge/merge.refactor.component.types';
import { NewFeatureTemplate } from './new-feature/new-feature.component.types';
import type { SessionState } from './update-session/update-session.component.types';

export interface DialogType<D = unknown, R = unknown> {
    data: D;
    return: R;
}

/* General use */
interface ApplyData {
    applyFunc: Process;
    discardFunc?: () => void;
    isApplyDisabled?: boolean;
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

interface ConfirmWarning {
    type: 'warning'; // Only including warning for now.
    title: Translatable;
    message: Translatable;
}

interface ConfirmData extends Omit<GenericData, 'footer'> {
    warning?: ConfirmWarning;
    footer: Omit<ActionableGenericFooter, 'actionable'> &
        Partial<Pick<ActionableGenericFooter, 'actionable'>>;
}
export interface Confirm extends DialogType<ConfirmData, boolean> {
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

/* WebAdmin */
export type Wizard = DialogType<void, void>;
export type LoginWebAdmin = DialogType<boolean, boolean>;
export type TemporaryUserLogin = DialogType<void, void>;

/* Auth */
interface UpdateSessionData {
    sessionState: SessionState;
    system: NxSystem;
    noConnectionMsg?: string;
    processAction?: string;
    openingRef?: DialogRef;
    isScopedRequest?: boolean;
}
export type UpdateSession = DialogType<UpdateSessionData, string | undefined>;
export type Client2faWarning = DialogType<void, void>;

/* Account */
export type EnableAccount2fa = DialogType<void, true>;
export type DisableAccount2fa = DialogType<number, true>;
export type Require2faCodeOnLogin = DialogType<boolean, boolean>;
export type New2faBackupCodes = DialogType<void, void>;
export type PasswordChange2fa = DialogType<
    {
        newPassword: string;
        oldPassword: string;
    },
    true
>;

/* Systems */

/* Channel partners */
export type AddChannelPartner = DialogType<string, ChannelPartner>;
export type EditChannelPartner = DialogType<ChannelPartner, ChannelPartner>;
export type AddPartnerUser = DialogType<
    { partnerId: string; users: UserRecord[] },
    ChannelPartnerUser
>;
export type EditPartnerUser = DialogType<
    { channelPartner: string; user: ChannelPartnerUser },
    ChannelPartnerUser
>;
export type AddOrganization = DialogType<string, Organization>;
export type EditOrganization = DialogType<Organization, Organization>;
export type AddOrgUser = DialogType<string, OrganizationUser>;
export type EditOrgUser = DialogType<{ orgId: string; user: OrganizationUser }, OrganizationUser>;
export type ChangeCpState = DialogType<
    { currentState: State; update: (newState: State) => Observable<unknown> },
    State
>;
export type AddSystemTutorial = DialogType<void, void>;

export type CreateSystemGroup = DialogType<
    {
        orgId: string;
        parentGroup: string;
    },
    Group
>;

export type UpdateSystemGroup = DialogType<string, Group>;

export type MoveGroupItem = DialogType<
    {
        item: GroupItem;
        organization: Organization;
        groups: GroupItem[];
    },
    Group
>;

export type MoveSystemItem = DialogType<
    {
        item: SystemItem;
        organization: Organization;
        groups: GroupItem[];
    },
    CloudSystem
>;

export type AddOrgUserV2 = DialogType<
    {
        organization: Organization;
        initialFolder?: string;
        email?: string;
    },
    OrgUser
>;

export type ChangeService = DialogType<
    {
        systemId: string;
        service: Row;
        partner: {
            id: string;
            hasChangePermission: boolean;
            monthlyServiceCap: number | null;
        };
    },
    [SystemService[], ServiceQuantities, monthlyServiceCap: number | null]
>;

/* Channel Partner Reports */

export type ViewUsageDetails = DialogType<
    { detailTableData$: Observable<DetailTableResponse>; entityName: string },
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

interface ToggleSystem2faData {
    system: NxSystem;
    system2faEnabled: boolean;
}

export type ToggleSystem2fa = DialogType<ToggleSystem2faData, boolean>;

export type CantEnableSystem2fa = DialogType<void, void>;

export type TransferOwnership = DialogType<NxSystem, SystemTransferInfo | CloudSystem>;

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
export type TosUpdate = DialogType<AgreementInfo, 'accepted' | 'deferred' | 'rejected'>;
export type TosRejected = DialogType<void, 'goBack'>;

/* Servers */
interface ServerData {
    system: NxSystem;
    server: NxSystemServer;
}
export type RestartServer = DialogType<ServerData, string>;
export type ResetServer = DialogType<ServerData, true>;
export type DetachServer = DialogType<ServerData, true>;

/* Storage */
export type AddStorage = DialogType<
    { serverId: string; storageManager: StorageManager; cancelPolls: () => void },
    void
>;
export type ChangeStorage = DialogType<NxSystem, 'changeOk' | 'error' | 'cancel'>;
export type ResetBackup = DialogType<
    { system: NxSystem; setDefaultBackupSettings: () => Promise<void> },
    void
>;
export type ReserveSpaceWarning = DialogType<void, true>;

/* Bookmarks */
export type MoreDevices = DialogType<
    {
        devices: BookmarksDevice[];
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

export type BookmarkDownload = DialogType<
    {
        bookmarkName: string;
        exportName: string;
        downloadSrc: string;
    },
    void
>;

export type BookmarkShare = DialogType<BookmarkV4, void>;

type ShowMoreFiltersData = {
    template: TemplateRef<Element>;
    header: string;
};
export type ShowMoreFilters = DialogType<ShowMoreFiltersData, void>;

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
