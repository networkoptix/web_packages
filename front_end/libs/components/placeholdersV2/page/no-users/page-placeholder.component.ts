import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPagePlaceholderGenericNewV2Component } from '@components/placeholdersV2/page/page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

/* Usage

 */

@Component({
    selector: 'nx-page-placeholder-no-users',
    templateUrl: 'page-placeholder.component.html',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderGenericNewV2Component,
    ],
})
export class NxPagePlaceholderNoUsersComponent {
    @Input() clickFn: () => void;

    LANG = staticLang;

    icons = icons;

    clickHandler(event: Event): void {
        event.stopPropagation();
        this.clickFn();
    }
}
