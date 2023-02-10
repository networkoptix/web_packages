import type { SelectionModel } from '@angular/cdk/collections';
import type { EventEmitter } from '@angular/core';
import type { NgForm } from '@angular/forms';

import type { Translatable } from '@pipes/nx-translate.types';
import type { CloudResponse, SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import type { NxUser } from '@services/system.service/user-manager/user-manager-types';

import { TfaAction } from './two-fa/two-fa.component.types';

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
export type RefreshSession = DialogType<NxSystem, true>;
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

/* Groups */

/* Admin */
export type TransferOwnership = DialogType<NxSystem, SystemTransferInfo>;

/* Cameras */

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

/* Servers */

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
