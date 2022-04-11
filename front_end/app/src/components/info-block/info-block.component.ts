import { Component, Input, OnInit } from '@angular/core';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import {
    InfoBlockStyle,
    InfoBlockSize,
    InfoLineStyle,
    InfoBlockColumns,
    InfoBlockSections
} from './info-block.component.types';

@Component({
    selector: 'nx-info-block',
    templateUrl: 'info-block.component.html',
    styleUrls: ['info-block.component.scss']
})
export class NxInfoBlockComponent implements OnInit {
    @Input() sectionsOrColumns: InfoBlockColumns | InfoBlockSections;
    @Input() infoBlockStyle: InfoBlockStyle = InfoBlockStyle.LIGHT;
    @Input() infoBlockSize: InfoBlockSize = InfoBlockSize.FULL;
    @Input() infoLineStyle: InfoLineStyle = InfoLineStyle.WIDE;
    @Input() removeTopMargin = false;

    heightCache = {};

    CONFIG: IConfig;
    singleColumn: boolean;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }

    ngOnInit(): void {
        this.singleColumn = this.sectionsOrColumns[0] && !this.sectionsOrColumns[0][0];
    }

    getLookup(columnIndex: number, blockIndex: number, lineIndex: number) {
        if (!this.heightCache) return undefined;
        return this.heightCache[`${columnIndex}-${blockIndex}-${lineIndex}`];
    }

    check(columnIndex, blockIndex, section) {
        setTimeout(() => this.getRowsHeight(columnIndex, blockIndex, section));
    }

    private getRowsHeight(columnIndex, blockIndex, section) {
        const keys = [...section.querySelectorAll('div.block-section-keys p')];
        const values = [...section.querySelectorAll('div.block-section-values p')];
        keys.forEach((key, idx) => {
            const lookup = `${columnIndex}-${blockIndex}-${idx}`;
            this.heightCache[lookup] = Math.max(
                this.heightCache[lookup] || 0,
                keys[idx].clientHeight,
                values[idx].clientHeight,
                16);
        });
    }
}
