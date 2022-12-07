import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit } from '@angular/core';
import { DateRange } from '@angular/material/datepicker';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { combineLatest, take } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

import type { Bookmark, TimeRange } from './bookmarks.types';

interface BookmarkParams {
    search?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    devices?: string;
    tags?: string;
}

// Cssa = Comma separated string array
// ['foo', 'bar', 'fizz,buzz'] => 'foo,bar,fizz\,buzz'
function strArrayToCssa(strings: string[]): string {
    return strings.map(s => s.replace(/,/g, '\,')).toString();
}

function unescapeCommas(escaped: string): string {
    return escaped.replace(/\\,/g, ',');
}

// 'foo,bar,fizz\,buzz' => ['foo', 'bar', 'fizz,buzz']
function cssaToStrArray(cssa: string): string[] {
    if (!cssa) {
        return [];
    }
    const commas = [...cssa.matchAll(/,/g)].map(m => m.index);
    const escaped = [...cssa.matchAll(/\\(?=,)/g)].map(m => m.index + 1);
    const splitIndexes = commas.filter(ci => !escaped.includes(ci));
    if (!splitIndexes.length) {
        return [unescapeCommas(cssa)];
    }
    const strings = [unescapeCommas(cssa.slice(0, splitIndexes[0]))];
    splitIndexes.forEach((s, i) => {
        strings.push(
            unescapeCommas(cssa.slice(s + 1, splitIndexes[i + 1]))
        );
        // Final will slice to end
    });
    return strings;
    // This entire thing should be one lookbehind, but Safari
    // https://caniuse.com/js-regexp-lookbehind
    // return cssa.split(/(?<!\\),/).map(s => s.replace('\,', ','));
}

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

    search: string = '';
    dateFilter: DateRange<Date> = null;
    timeFilter: TimeRange = { start: null, end: null };
    deviceFilter = new SelectionModel<string>(true, []);
    tagFilter = new SelectionModel<string>(true, []);

    private queryParams: BookmarkParams;

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private route: ActivatedRoute,
        public router: Router,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.noBksImgSrc = `${icons.dirSectionPlaceholder}empty-bookmarks${this.CONFIG.isDarkTheme ? '' : '-cloud'}.svg`;

        combineLatest<[BookmarkParams, Params]>([
            this.route.queryParams,
            this.route.params
        ])
            .pipe(take(1))
            .subscribe(([queryParams, params]) => {
                this.queryParams = { ...queryParams };
                /* (ngModelChange) for <nx-simple-search> and <nx-checkbox>
                fire on initial values, which then causes the url to
                be updated as we're trying to read values from it,
                so we preemptively copy over the url values to the component
                property so the update doesn't do anything */

                if (Object.keys(queryParams).length) {
                    if (queryParams.search) {
                        this.search = queryParams.search;
                    }
                    if (queryParams.startDate && queryParams.endDate) {
                        this.dateFilter = new DateRange(
                            new Date(Number(queryParams.startDate)),
                            new Date(Number(queryParams.endDate)),
                        );
                    }
                    if (queryParams.startTime) {
                        this.timeFilter.start = Number(queryParams.startTime);
                    }
                    if (queryParams.endTime) {
                        this.timeFilter.end = Number(queryParams.endTime);
                    }
                    if (queryParams.devices) {
                        this.deviceFilter.select(
                            ...cssaToStrArray(queryParams.devices)
                        );
                    }
                    if (queryParams.tags) {
                        this.tagFilter.select(
                            ...cssaToStrArray(queryParams.tags)
                        );
                    }
                }
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

    updateParam(key: 'search' | 'date' | 'time' | 'devices' | 'tags'): void {
        if (key === 'search') {
            this.queryParams.search = this.search || undefined;
        } else if (key === 'date') {
            this.queryParams.startDate = this.dateFilter?.start.getTime().toString();
            this.queryParams.endDate = this.dateFilter?.end.getTime().toString();
            // Numbers are converted to string in router
        } else if (key === 'time') {
            this.queryParams.startTime = this.timeFilter.start?.toString();
            this.queryParams.endTime = this.timeFilter.end?.toString();
        } else if (key === 'devices') {
            this.queryParams.devices = this.deviceFilter.hasValue()
                ? strArrayToCssa(this.deviceFilter.selected)
                : undefined;
        } else if (key === 'tags') {
            this.queryParams.tags = this.tagFilter.hasValue()
                ? strArrayToCssa(this.tagFilter.selected)
                : undefined;
        }
        this.updateUri();
    }

    private updateUri(): void {
        this.router.navigate([], {
            // undefined will be discarded, empty string will not
            queryParams: this.queryParams,
            replaceUrl: true,
        });
    }
}
