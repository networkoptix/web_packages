import { DewarpingParamsLayoutItem } from '@services/system-api.types/layouts.types';
import { DewarpingParamsCapable } from '@services/system.service/camera-manager/camera-manager-types';

import { BaseRenderer } from './renderers';

export type RenderStep = (getRenderStepParams: BaseRenderer['getRenderStepParams']) => void;

export interface FisheyeViewerDewarpingParams {
    dewarpingParamsCamera: DewarpingParamsCapable;
    dewarpingParamsItem: DewarpingParamsLayoutItem;
}
