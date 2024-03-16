import { predefinedRenderSteps } from '../../render-steps';
import { BaseRenderer } from '../abstract/base-renderer';

export class DynamicRenderer extends BaseRenderer {
    renderSteps = [predefinedRenderSteps.renderFisheye];

    setRenderSteps(renderSteps: BaseRenderer['renderSteps']): void {
        this.renderSteps = renderSteps;
    }
}
