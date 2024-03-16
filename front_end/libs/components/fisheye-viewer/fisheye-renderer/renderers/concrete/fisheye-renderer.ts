import { predefinedRenderSteps } from '../../render-steps';
import { BaseRenderer } from '../abstract/base-renderer';

export class FisheyeRenderer extends BaseRenderer {
    renderSteps = [predefinedRenderSteps.renderFisheye];
}
