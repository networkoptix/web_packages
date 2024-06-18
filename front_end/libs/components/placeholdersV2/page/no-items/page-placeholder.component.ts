import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

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
    styleUrls: ['page-placeholder.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NgxTranslateCutModule,
        NxAddSvgSrcDirective,
        NxButtonComponent,
        NxPagePlaceholderGenericNewV2Component,
    ],
})
export class NxPagePlaceholderNoItemsComponent {
    @Output() addFolderEvent = new EventEmitter<void>();
    canManageSystems$$ = input<boolean>(false, { alias: 'canManageSystems' });

    LANG = staticLang;
    icons = icons;

    addFolder(): void {
        this.addFolderEvent.emit();
    }
}
