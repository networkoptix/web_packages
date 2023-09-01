import { CommonModule } from '@angular/common';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxTagComponent } from '@components/tag/tag.component';
import { NxTooltipComponent } from '@components/tooltip/tooltip.component';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';

@Component({
    selector: 'nx-password-input-tag-validation',
    templateUrl: 'password-tag-validation.component.html',
    styleUrls: ['password-tag-validation.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        PipesModule,
        NxTooltipComponent,
        NxTagComponent,
        NxTooltipDirective,
    ],
})
export class NxPasswordTagValidationComponent {
    @Input() forElement;

    LANG = staticLang;
    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;
}
