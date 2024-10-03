import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

import {
    type InfoBlockColumns,
    type InfoBlockSections,
    InfoBlockSize,
    InfoLineStyle,
} from './info-block.component.types';

@Component({
    selector: 'nx-info-block',
    templateUrl: 'info-block.component.html',
    styleUrls: ['info-block.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        PipesModule,
        NxAddSvgSrcDirective,
    ],
})
export class NxInfoBlockComponent {
    sectionsOrColumns = input.required<InfoBlockColumns | InfoBlockSections>();
    infoBlockSize = input<InfoBlockSize>(InfoBlockSize.FULL);
    infoLineStyle = input<InfoLineStyle>(InfoLineStyle.WIDE);
    removeTopMargin = input<boolean>(false);

    InfoBlockType: (InfoBlockColumns | InfoBlockSections)[];
    icons = icons;
    InfoLineStyleEnum = InfoLineStyle;

    singleColumn = computed(() => this.sectionsOrColumns()[0] && !this.sectionsOrColumns()[0][0]);
}
