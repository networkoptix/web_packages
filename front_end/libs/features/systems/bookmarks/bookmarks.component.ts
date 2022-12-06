import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit } from '@angular/core';
import { DateRange } from '@angular/material/datepicker';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

import type { Bookmark, TimeRange } from './bookmarks.types';

@Component({
    selector: 'nx-bookmarks-component',
    templateUrl: 'bookmarks.component.html',
    styleUrls: ['bookmarks.component.scss']
})
export class NxBookmarksComponent implements OnInit {
    LANG = staticLang;
    CONFIG: IConfig;
    icons = icons;
    noBksImgSrc: string;

    private system: NxSystem;

    bookmarks: Bookmark[] = [];
    devices: string[] = [];
    tags: string[] = [];

    dateFilter: DateRange<Date> = null;
    timeFilter: TimeRange = { start: '', end: '' };
    deviceFilter = new SelectionModel<string>(true, []);
    tagFilter = new SelectionModel<string>(true, []);

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private route: ActivatedRoute,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.noBksImgSrc = `${icons.dirSectionPlaceholder}empty-bookmarks${this.CONFIG.isDarkTheme ? '' : '-cloud'}.svg`;

        this.route.params.pipe(take(1)).subscribe(params => {
            this.accountService.get().then(account => {
                this.system = this.systemService.createSystem(
                    account.email,
                    params.systemId
                );
                this.getData();
            });
        });
    }

    private getData(): void {
        const mediaserver = this.system.mediaserver as NxSystemRestAPI;
        mediaserver.getBookmarks().subscribe(bks => {
            this.bookmarks = bks.map(bk => ({
                ...bk,
                src: this.system.mediaserver.getExportUrl({
                    cameraId: bk.deviceId,
                    duration: bk.durationMs,
                    endPos: bk.startTimeMs + bk.durationMs,
                    pos: bk.startTimeMs,
                    transport: 'mp4'
                }),
                thumbnail: this.system.serverManager.getPreviewUrl(
                    bk.deviceId,
                    bk.startTimeMs,
                    320,
                    180,
                    0
                ),
                tagsFormatted: bk.tags.map(tag => ({
                    type: 'default',
                    label: tag
                })),
                isVisible: false,
            }));
        });
        mediaserver.getBookmarkTags().subscribe(tags => {
            this.tags = Object.keys(tags);
        });
        mediaserver.getDevices().subscribe(devices => {
            this.devices = devices.filter(d => !!d.model).map(d => d.model);
        });
    }
}
