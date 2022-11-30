import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit } from '@angular/core';
import { DateRange } from '@angular/material/datepicker';

import staticLang from '@common/language/language_i18n_static.json';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { icons } from '@src/app/variables/static-variables';

import type { TimeRange, Bookmark } from './bookmarks.types';

@Component({
    selector: 'nx-bookmarks-component',
    templateUrl: 'bookmarks.component.html',
    styleUrls: ['bookmarks.component.scss']
})

export class NxBookmarksComponent implements OnInit {
    LANG = staticLang;
    bookmarks: Bookmark[];
    icons = icons;

    CONFIG: IConfig;
    cloudSrc: string;

    // Placeholder
    devices = [
        'DWC-GV84A',
        'CAM-GV84A',
        '395-HGNW',
        'SW-CAM-273',
        'OFC-DSN',
        '395-HGNS',
        'KNW-86372',
    ];

    // Placeholders
    tags = [
        '1080p',
        'entrance',
        'NW Exit',
        'monitor',
        'Camera5',
        'Red & blue',
        '396-HTS',
        'green',
        'low',
    ];

    dateFilter: DateRange<Date> = null;
    timeFilter: TimeRange = { start: '', end: '' };
    deviceFilter = new SelectionModel<string>(true, []);
    tagFilter = new SelectionModel<string>(true, []);

    constructor(
        configService: NxConfigService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.getBookmarks();
        this.cloudSrc = `${icons.dirSectionPlaceholder}empty-bookmarks${this.CONFIG.isDarkTheme ? '' : '-cloud'}.svg`;
    }

    getBookmarks(): void {
        this.bookmarks = [];
    }
}
