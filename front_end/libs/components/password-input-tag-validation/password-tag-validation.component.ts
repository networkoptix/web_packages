import { CommonModule } from '@angular/common';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxTooltipComponent } from '@components/tooltip/tooltip.component';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

@Component({
    selector: 'nx-password-input-tag-validation',
    templateUrl: 'password-tag-validation.component.html',
    styleUrls: ['password-tag-validation.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        DirectivesModule,
        TranslateModule,
        PipesModule,
        NxTooltipComponent,
        NxTagComponent,
    ],
})
export class NxPasswordTagValidationComponent {
    @Input() forElement;

    LANG = staticLang;
    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;
}
