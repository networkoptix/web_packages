import {
    Component
} from '@angular/core';
import { TourService } from 'ngx-ui-tour-md-menu';

import staticLang from '@common/language/language_i18n_static.json';

@Component({
    selector: 'nx-tour-step-component',
    styleUrls: ['./tour-step.component.scss'],
    templateUrl: './tour-step.component.html',
})
export class NxTourStepComponent {
    LANG = staticLang;
    constructor(public tourService: TourService) {}
}
