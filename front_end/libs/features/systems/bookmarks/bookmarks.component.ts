import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit } from '@angular/core';
import { DateRange } from '@angular/material/datepicker';
import { ActivatedRoute, Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { delay, map, switchMap } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { SearchTag, SearchFilter } from '@components/search/search.component.types';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { icons } from '@src/app/variables/static-variables';

import type { TimeRange, Bookmark } from './bookmarks.types';

@UntilDestroy()

@Component({
    selector: 'nx-bookmarks-component',
    templateUrl: 'bookmarks.component.html',
    styleUrls: ['bookmarks.component.scss']
})

export class NxBookmarksComponent implements OnInit {
    LANG = staticLang;
    bookmarks: Bookmark[];
    icons = icons;
    system: NxSystem;
    account: Account;
    filterModel: SearchFilter = { query: '', tags: [] };

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
        private systemService: NxSystemService,
        private route: ActivatedRoute,
        private accountService: NxAccountService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        const readySubject = new Subject<boolean>();
        this.cloudSrc = `${icons.dirSectionPlaceholder}empty-bookmarks${this.CONFIG.isDarkTheme ? '' : '-cloud'}.svg`;

        combineLatest([
            this.route.params,
            this.accountService.get()
        ])
            .pipe(
                switchMap(([params, account]: [Params, Account]) => {
                    this.account = account;
                    this.system = this.systemService.createSystem(
                        this.account.email,
                        params.systemId
                    );
                    return of(this.setTags());
                }),
                delay(500),
                switchMap(() => this.getBookmarks()),
                untilDestroyed(this)
            ).subscribe((bookmarks: Bookmark[]) => {
                if (bookmarks) {
                    this.setBookmarks(bookmarks);
                    readySubject.next(true);
                }
            });
    }

    async setTags(): Promise<void> {
        const tags = await this.system.mediaserver.getBookmarkTags().toPromise();
        this.filterModel.tags = Object.keys(tags).map(
            (tag: string): SearchTag => {
                return { id: tag, label: tag, value: false };
            }
        );
    }

    setBookmarks(bookmarks: Bookmark[]): void {
        this.bookmarks = bookmarks.map((bookmark: Bookmark) => {
            bookmark.tagsFormatted = bookmark.tags.map((tag: string) => ({ type: 'default', label: tag }));
            return bookmark;
        }).sort((a, b) =>
            +b.creationTimeMs - +a.creationTimeMs
        );
    }

    getBookmarks(): Observable<Bookmark[]> {
        const params = {
            order: 'desc',
            column: 'creationTime',
            deviceId: '*',
            _keepDefault: 'true',
            _orderBy: 'creationTimeMs'
        };

        return this.system.mediaserver.getBookmarks(params)
            .pipe(
                map((bookmarks: Bookmark[]) => bookmarks.map((bookmark: Bookmark) => ({
                    ...bookmark,
                    src: this.system.mediaserver.getExportUrl({
                        cameraId: bookmark.deviceId,
                        duration: bookmark.durationMs,
                        endPos: bookmark.startTimeMs + bookmark.durationMs,
                        pos: bookmark.startTimeMs,
                        transport: 'mp4'
                    }),
                    thumbnail: this.system.serverManager.getPreviewUrl(
                        bookmark.deviceId, 'latest', 320, 180, 0
                    ),
                    isVisible: false
                })))
            );
    }

    ngOnDestroy(): void { }
}
