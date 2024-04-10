import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxButtonComponent } from '@components/button/button.component';
import { NxPagePlaceholderGenericNewV2Component } from '@components/placeholdersV2/page/page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

/* Usage

 */

@Component({
    selector: 'nx-page-placeholder-no-items',
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
export class NxPagePlaceholderNoItemsComponent {
    @Input() clickFn: () => void;

    LANG = staticLang;

    icons = icons;

    // This placeholder have no events ... for now. --TT
    // clickHandler(event: Event): void {
    //     event.stopPropagation();
    //     this.clickFn();
    // }
}
