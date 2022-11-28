import type { SelectionModel } from '@angular/cdk/collections';

import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { NxSystem } from '@services/system.service/system';

export interface DialogType<D = unknown, R = unknown> {
    data: D;
    return: R;
}

export type TransferOwnership = DialogType<NxSystem, SystemTransferInfo>;

export type MoreDevices = DialogType<
    { devices: string[]; selection: SelectionModel<string> },
    void
>;
export type MoreTags = DialogType<
    { tags: string[]; selection: SelectionModel<string> },
    void
>;
