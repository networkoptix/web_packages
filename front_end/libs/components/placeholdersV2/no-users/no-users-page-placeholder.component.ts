import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

/* Usage

 */

@Component({
    selector: 'nx-page-placeholder-no-users',
    templateUrl: 'no-users-page-placeholder.component.html',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderGenericComponent,
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
