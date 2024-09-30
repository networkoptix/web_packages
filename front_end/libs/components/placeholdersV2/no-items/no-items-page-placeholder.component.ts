import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

/* Usage

 */

@Component({
    selector: 'nx-page-placeholder-no-items',
    templateUrl: 'no-items-page-placeholder.component.html',
    styleUrls: ['no-items-page-placeholder.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NgxTranslateCutModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderGenericComponent,
    ],
})
export class NxPagePlaceholderNoItemsComponent {
    @Output() addFolderEvent = new EventEmitter<void>();
    @Output() addSystemEvent = new EventEmitter<void>();
    canManageSystems$$ = input<boolean>(false, { alias: 'canManageSystems' });

    LANG = staticLang;
    icons = icons;

    addFolder(): void {
        this.addFolderEvent.emit();
    }

    addSystem(): void {
        this.addSystemEvent.emit();
    }
}
