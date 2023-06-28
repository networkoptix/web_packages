import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';

import staticLang from '@common/language/language_i18n_static.json';

@Component({
    selector: 'nx-tour-step-component',
    styleUrls: ['./tour-step.component.scss'],
    templateUrl: './tour-step.component.html',
    standalone: true,
    imports: [CommonModule, TranslateModule, TourMatMenuModule],
})
export class NxTourStepComponent {
    LANG = staticLang;
    constructor(public tourService: TourService) {}
}
