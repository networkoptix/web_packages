import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { NxSystem } from '@services/system.service/system';

export interface DialogType<D = unknown, R = unknown> {
    data: D;
    return: R;
}

export type TransferOwnership = DialogType<NxSystem, SystemTransferInfo>;
