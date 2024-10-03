import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

import {
    InfoBlockColumns,
    InfoBlockSections,
    InfoBlockSize,
    InfoBlockStyle,
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
export class NxInfoBlockComponent implements OnInit {
    @Input() sectionsOrColumns: InfoBlockColumns | InfoBlockSections;
    @Input() infoBlockStyle: InfoBlockStyle = InfoBlockStyle.LIGHT;
    @Input() infoBlockSize: InfoBlockSize = InfoBlockSize.FULL;
    @Input() infoLineStyle: InfoLineStyle = InfoLineStyle.WIDE;
    @Input() removeTopMargin = false;

    heightCache = {};

    singleColumn: boolean;
    InfoBlockType: (InfoBlockColumns | InfoBlockSections)[];
    icons = icons;

    ngOnInit(): void {
        this.singleColumn = this.sectionsOrColumns[0] && !this.sectionsOrColumns[0][0];
    }

    getLookup(columnIndex: number, blockIndex: number, lineIndex: number) {
        if (!this.heightCache) {
            return undefined;
        }
        return this.heightCache[`${columnIndex}-${blockIndex}-${lineIndex}`];
    }

    check(columnIndex, blockIndex, section): Promise<void> {
        return new Promise(resolve => {
            this.getRowsHeight(columnIndex, blockIndex, section);
            setTimeout(resolve);
        });
    }

    private getRowsHeight(columnIndex, blockIndex, section): void {
        const keys = [...section.querySelectorAll('div.block-section-keys p')];
        const values = [...section.querySelectorAll('div.block-section-values p')];
        keys.forEach((key, idx) => {
            const lookup = `${columnIndex}-${blockIndex}-${idx}`;
            this.heightCache[lookup] = Math.max(
                this.heightCache[lookup] || 0,
                keys[idx].clientHeight,
                values[idx].clientHeight,
                16,
            );
        });
    }
}
