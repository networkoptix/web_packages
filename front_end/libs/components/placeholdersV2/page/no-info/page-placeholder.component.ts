import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxButtonComponent } from '@components/button/button.component';
import { ButtonType } from '@components/button/button.component.types';
import { NxPagePlaceholderGenericNewV2Component } from '@components/placeholdersV2/page/page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

/* Usage

 */

@Component({
    selector: 'nx-page-placeholder-no-info',
    templateUrl: 'page-placeholder.component.html',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NxAddSvgSrcDirective,
        NxButtonComponent,
        NxPagePlaceholderGenericNewV2Component,
    ],
})
export class NxPagePlaceholderNoInfoComponent {
    @Input() clickFn: () => void;

    LANG = staticLang;

    icons = icons;

    protected readonly ButtonType = ButtonType;

    clickHandler(event: Event): void {
        event.stopPropagation();
        this.clickFn();
    }
}
