import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxButtonComponent } from '@components/button/button.component';
import { ButtonType } from '@components/button/button.component.types';
import { NxPagePlaceholderGenericV2Component } from '@components/placeholders/pageV2/generic/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

/* Usage
 <nx-page-placeholder
         type?="500 | 404 | NO_ALERTS | OFFLINE | NO_CAMS..."
         -- OR ---
         iconClass?='server-offline'
         placeholderTitle?='SERVER OFFLINE'
         message?='Warning! Dragons ahead!'
         preloader?=BOOLEAN
         [condition]= WHEN_TO_SHOW >
 </nx-page-placeholder>
 */

@UntilDestroy()
@Component({
    selector: 'nx-page-placeholder-v2',
    templateUrl: 'page-placeholder.component.html',
    styleUrls: ['page-placeholder.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderGenericV2Component,
        NxButtonComponent,
    ],
})
export class NxPagePlaceholderV2Component implements OnInit {
    @Input() type: PAGE_PLACEHOLDER;

    LANG = staticLang;

    icons = icons;

    imagePath: string;
    title: string;
    message: string;
    description: string;
    button: NxButtonComponent;

    constructor(private translateService: TranslateService) {}

    ngOnInit(): void {
        this.setupPlaceholder();
    }

    setupPlaceholder(): void {
        switch (this.type) {
            case PAGE_PLACEHOLDER.NO_INFO:
                this.imagePath = icons.dirPageV2Placeholder + 'default.svg';
                this.title = this.translateService.instant(
                    this.LANG.placeholderV2Texts.noInfo.title,
                );
                this.message = this.translateService.instant(
                    this.LANG.placeholderV2Texts.noInfo.message,
                );
                break;
        }
    }

    protected readonly ButtonType = ButtonType;
}
