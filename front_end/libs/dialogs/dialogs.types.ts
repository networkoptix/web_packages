import type { SelectionModel } from '@angular/cdk/collections';
import type { EventEmitter } from '@angular/core';
import type { NgForm } from '@angular/forms';

import type { CloudResponse, SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemUser } from '@services/system.service/user-manager/user-manager-types';

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

/* Account */
interface Account2faActionData {
    [TfaAction.Enable]: void;
    [TfaAction.Disable]: { num2FaSystems: number };
    [TfaAction.PasswordChange]: {
        newPassword: string;
        oldPassword: string;
    }
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
        user: NxSystemUser;
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
