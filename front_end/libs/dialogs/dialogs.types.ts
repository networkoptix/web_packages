import type { SelectionModel } from '@angular/cdk/collections';
import { EventEmitter } from '@angular/core';

import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { NxSystem } from '@services/system.service/system';

import { TfaAction } from './two-fa/two-fa.component.types';

export interface DialogType<D = unknown, R = unknown> {
    data: D;
    return: R;
}

/* General use */

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
