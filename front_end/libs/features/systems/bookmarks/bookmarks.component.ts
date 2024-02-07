import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { DateRange } from '@angular/material/datepicker';
import { ActivatedRoute, Router } from '@angular/router';
import { isEqual } from 'lodash-es';
import {
    BehaviorSubject,
    combineLatest,
    switchMap,
    Observable,
    timer,
    zip,
    ReplaySubject,
    merge,
    of,
    Subject,
} from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, take, tap } from 'rxjs/operators';

import type { SuggestionSections } from '@components/simple-search/simple-search.types';
import staticLang from '@language_static';
import { pollingTimeout } from '@pages/static-variables-features';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import type {
    BookmarksParams,
    BookmarksTags,
    Bookmark as SystemBookmark,
} from '@services/system-api.types/devices.types';
import type { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { icons } from '@static-variables';
import {
    alphabeticalSort,
    cleanIdLegacy,
    MS,
    msToParts,
    offsetDate,
    paramSortFunc,
} from '@utils/general';

import { Bookmark, BookmarksDevice, TimeRange } from './bookmarks.types';
import type { NxDateAndTimeFilterComponent } from './components/date-and-time-filter/date-and-time-filter.component';

interface BookmarkParams {
    search?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    deviceId?: string[];
    tags?: string;
}

// Cssa = Comma separated string array
// ['foo', 'bar', 'fizz,buzz'] => 'foo,bar,fizz\,buzz'
function strArrayToCssa(strings: string[]): string {
    return strings.map(s => s.replace(/,/g, ',')).toString();
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
        strings.push(unescapeCommas(cssa.slice(s + 1, splitIndexes[i + 1])));
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
    styleUrls: ['bookmarks.component.scss'],
})
export class NxBookmarksComponent implements OnInit {
    @ViewChild('dateAndTimeFilterComp') private dateAndTimeFilter: NxDateAndTimeFilterComponent;
    @ViewChild('bookmarksContainer') bookmarksContainer: ElementRef<HTMLDivElement>;
    readonly css = {
        bookmarkWidth: 272,
        gridPadding: 15,
    };
    readonly localOffsetToUTCMs: number = new Date().getTimezoneOffset() * MS.min;
    readonly bookmarksQuery: BookmarksParams = {
        order: 'desc',
        _orderBy: 'startTimeMs',
        limit: 25,
    };
    LANG = staticLang;
    CONFIG: IConfig;
    icons = icons;
    noBksImgSrc: string;
    system: NxSystem;

    _bookmarks: Bookmark[] = [];
    visibleBookmarksCount: number = 0;
    bookmarks$: Observable<Bookmark[]>;
    creationCutOffTimeMS$ = new BehaviorSubject<number>(0);
    newCreationCutOffTimeMS$ = new BehaviorSubject<number>(0);
    noMatchingResults: boolean;

    search: string = '';
    loadMore$ = new Subject<boolean>();
    loading$ = new Subject<boolean>();
    infLoading$ = new Subject<boolean>();
    loadingBuffer$ = new BehaviorSubject<number>(0);
    devices$ = new ReplaySubject<BookmarksDevice[]>(1);
    tags$ = new ReplaySubject<BookmarksTags>(1);
    selectedDevices$ = this.devices$.pipe(
        map(devices =>
            devices
                .map(({ id, name }) => ({ id, name }))
                .sort(alphabeticalSort(({ name }) => name)),
        ),
        startWith<BookmarksDevice[]>([]),
    );
    tagNames$ = this.tags$.pipe(
        map(tags => Object.keys(tags).sort(alphabeticalSort(t => t))),
        startWith<string[]>([]),
    );
    suggestions$ = combineLatest([this.selectedDevices$, this.tagNames$]).pipe(
        map(
            ([devices, tags]): SuggestionSections => ({
                // DEVICE: devices.map(({ name }) => name),
                TAGS: tags,
            }),
        ),
        startWith({
            // DEVICE: [],
            TAGS: [],
        }),
    );

    offsetTimes: Map<string, number>;
    deviceMap: Map<string, BookmarksDevice>;

    dateFilter: DateRange<Date> = null;
    timeFilter: TimeRange = { start: null, end: null };
    deviceFilter = new SelectionModel<string>(true, []);
    tagFilter = new SelectionModel<string>(true, []);

    private queryParams: BookmarkParams;
    deviceIdsWithArchive: string[];

    constructor(
        configService: NxConfigService,
        private systemService: NxSystemService,
        private route: ActivatedRoute,
        public router: Router,
        private pageService: NxPageService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.route.queryParams.pipe(take(1)).subscribe(queryParams => {
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
                if (queryParams.deviceId) {
                    const devices =
                        typeof queryParams.deviceId === 'string'
                            ? [queryParams.deviceId]
                            : queryParams.deviceId || [];
                    this.deviceFilter.select(...devices);
                }
                if (queryParams.tags) {
                    this.tagFilter.select(...cssaToStrArray(queryParams.tags));
                }
            }
            this.system = this.systemService.getCurrentSystem();

            // We'll use pageService temporarily. We'll remove this when we update TitleResolver/SystemTitleResolver for the Browser Tab criterias from design
            this.pageService.pageTitle(
                [
                    staticLang.pageTitles.bookmarks,
                    this.system.info.name,
                    this.CONFIG.cloudName,
                ].join(' - '),
            );
            this.bookmarksPoll();
        });
    }

    buildSearch(): Pick<BookmarksParams, 'text' | 'startTimeMs' | 'endTimeMs'> {
        const search = this.queryParams.search || '';
        const tags = this.queryParams.tags || '';
        let startDatetime = 0;
        let endDatetime = 0;
        if (this.queryParams.startDate) {
            startDatetime = Number(this.queryParams.startDate);
            endDatetime = Number(this.queryParams.endDate);
            if (this.queryParams.startTime) {
                const startTime = Number(this.queryParams.startTime);
                const endTime = Number(this.queryParams.endTime);
                startDatetime = offsetDate(startDatetime, msToParts(startTime)).getTime();
                endDatetime = offsetDate(endDatetime, msToParts(endTime)).getTime();
            } else {
                endDatetime = offsetDate(endDatetime, { day: 1 }).getTime();
            }
        }

        const searchParams: ReturnType<NxBookmarksComponent['buildSearch']> = {};

        if (search || tags) {
            const tagArray = tags
                .split(',')
                .map(tag => `"${tag}"`)
                .join(' ');
            searchParams.text = tags && search ? `"${search}" ${tagArray}` : search || tagArray;
        }
        if (startDatetime) {
            searchParams.startTimeMs = startDatetime;
        }
        if (endDatetime) {
            searchParams.endTimeMs = endDatetime;
        }
        return searchParams;
    }

    bookmarksPoll(): void {
        const mediaserver = this.system.mediaserver as NxSystemRestAPI;
        let pollParams = { ...this.bookmarksQuery };
        const bookmarksPoll$: Observable<SystemBookmark[]> = combineLatest([
            timer(0, pollingTimeout),
            this.route.queryParams.pipe(
                tap(() => {
                    pollParams = {
                        ...this.bookmarksQuery,
                        ...this.buildSearch(),
                        deviceId: this.queryParams.deviceId || [],
                    };
                    this.loading$.next(true);
                    this.infLoading$.next(false);
                    this.creationCutOffTimeMS$.next(0);
                    this.newCreationCutOffTimeMS$.next(0);
                    this._bookmarks = [];
                }),
                debounceTime(500),
            ),
        ]).pipe(
            // Promise.all for Observables.
            switchMap(() =>
                zip([
                    mediaserver.getBookmarks(pollParams),
                    mediaserver.getBookmarkTags(),
                    mediaserver.getDevices(),
                    mediaserver.getServerTimes(),
                    this.system.cameraManager.hasArchives(),
                ]),
            ),
            // Then for Promise.all. In here we convert bookmarks from BookmarkResp -> Bookmark, and update filters.
            map(([bks, tags, devices, serverTimes, devicesWithArchive]) => {
                // Check to see if no bookmarks are returned and there are no filters applied
                this.noMatchingResults =
                    !bks.length && Object.values(this.queryParams).some(Boolean);
                this.deviceIdsWithArchive = devicesWithArchive.map(deviceId => {
                    return cleanIdLegacy(deviceId) as string;
                });
                this.tags$.next(tags);
                this.devices$.next(devices);
                this.offsetTimes = new Map(
                    serverTimes.reply.map(reply => [
                        reply.serverId,
                        Number(reply.timeZoneOffset) ?? 0,
                    ]),
                );
                this.deviceMap = new Map(devices.map(device => [device.id, device]));
                this.loading$.next(false);
                return bks;
            }),
        );
        const bookmarksFetch$: Observable<SystemBookmark[]> = this.loadMore$.pipe(
            distinctUntilChanged(),
            tap(fetch => {
                if (fetch) {
                    const bookmarksPerRow = Math.floor(
                        this.bookmarksContainer.nativeElement.offsetWidth /
                            (this.css.bookmarkWidth + this.css.gridPadding),
                    );
                    const bookmarkCount = this.visibleBookmarksCount;
                    const bufferSize = bookmarksPerRow - (bookmarkCount % bookmarksPerRow);
                    // Always add one row of cards for padding while loading
                    this.loadingBuffer$.next(
                        bufferSize !== bookmarksPerRow
                            ? bufferSize + bookmarksPerRow
                            : bookmarksPerRow,
                    );
                }
            }),
            switchMap(fetch => {
                if (!fetch) {
                    return of([]);
                }
                this.infLoading$.next(true);
                const fetchParams = {
                    ...this.bookmarksQuery,
                    ...this.buildSearch(),
                    deviceId: this.queryParams.deviceId || [],
                };
                fetchParams.endTimeMs = this.findOldestBookmark(this._bookmarks)?.startTimeMs - 1;
                return mediaserver
                    .getBookmarks(fetchParams)
                    .pipe(tap(() => this.infLoading$.next(false)));
            }),
        );

        const fetchedBookmarks$ = merge(bookmarksFetch$, bookmarksPoll$).pipe(
            map(bks => this.processBookmarks(bks).sort(paramSortFunc(b => b.startTimeMs, false))),
            // Merge recently created and new bookmarks together, and update vars to check if we got new bookmarks
            map(bks => {
                // We should only be displaying Bookmarks with Devices that have an archive (Same behavior as VMS)
                const bookmarksWithDeviceArchive = bks.filter(bk => {
                    return this.deviceIdsWithArchive.includes(bk.deviceId);
                });
                this._bookmarks = this.mergeBookmarks(this._bookmarks, bookmarksWithDeviceArchive);
                if (this._bookmarks.length) {
                    pollParams.creationStartTimeMs =
                        this.findNewestBookmark(this._bookmarks)?.creationTimeMs + 1;
                    if (!this.creationCutOffTimeMS$.value) {
                        this.creationCutOffTimeMS$.next(pollParams.creationStartTimeMs);
                    }
                    this.newCreationCutOffTimeMS$.next(pollParams.creationStartTimeMs);
                } else if (!this.creationCutOffTimeMS$.value) {
                    this.creationCutOffTimeMS$.next(1);
                }
                return this._bookmarks;
            }),
        );

        this.bookmarks$ = combineLatest([this.creationCutOffTimeMS$, fetchedBookmarks$]).pipe(
            map(([creationCutOffTimeMS, bks]) =>
                bks.filter(bk => creationCutOffTimeMS > bk.creationTimeMs),
            ),
            map(bks => {
                this.visibleBookmarksCount = bks.length;
                return bks;
            }),
            distinctUntilChanged((...vals) =>
                isEqual(
                    ...(vals.map(bookmarks =>
                        bookmarks.map(({ thumbnail, ...bookmark }) => bookmark),
                    ) as typeof vals),
                ),
            ),
        );
    }

    processBookmarks(bks: SystemBookmark[]): Bookmark[] {
        return bks
            .filter(bk => this.deviceMap.has(bk.deviceId))
            .map<Bookmark>(bk => {
                const deviceId = cleanIdLegacy(bk.deviceId);
                const systemId = cleanIdLegacy(this.system.id);
                const timeZoneOffset =
                    this.localOffsetToUTCMs +
                    (this.offsetTimes.get(this.deviceMap.get(bk.deviceId).serverId) || 0);
                const deviceName = this.deviceMap.get(bk.deviceId).name; // We don't use cleanId() for get() here
                const canViewBookmark = this.system.permissionManager.canViewDeviceArchive(
                    deviceId as string,
                );
                const getLink = (transport: string): string => {
                    // User will need viewArchives permissions to view and download bookmarks
                    if (canViewBookmark) {
                        return this.system.mediaserver.getExportUrl({
                            cameraId: deviceId,
                            duration: Math.floor(bk.durationMs / 1000),
                            endPos: bk.startTimeMs + bk.durationMs,
                            pos: bk.startTimeMs,
                            transport,
                        });
                    }
                    return '';
                };
                const aspectRatio =
                    this.system.cameraManager.cameras.find(camera => {
                        return deviceId === camera.id;
                    })?.defaultRatio || 1.77; // Fallback aspect ratio of 16:9
                const dpr = window.devicePixelRatio;

                return {
                    ...bk,
                    tags: bk.tags ?? [],
                    src: getLink('mp4'),
                    downloadSrc: getLink('mkv'),
                    thumbnail: this.system.serverManager.getPreviewUrl(
                        deviceId as string,
                        bk.startTimeMs,
                        270 * aspectRatio * dpr,
                        270 * dpr, // 270px is the height we want
                        0,
                    ),
                    canDownloadBookmark:
                        canViewBookmark &&
                        this.system.permissionManager.canExportDeviceArchive(deviceId as string),
                    canViewBookmark,
                    isVisible: false,
                    deviceName,
                    deviceId,
                    systemId,
                    timeZoneOffset,
                };
            });
    }

    findNewestBookmark(bks: Bookmark[]): Bookmark {
        return [...bks].sort(paramSortFunc(b => b.creationTimeMs))[bks.length - 1];
    }
    findOldestBookmark(bks: Bookmark[]): Bookmark {
        return [...bks].sort(paramSortFunc(b => b.creationTimeMs, false))[bks.length - 1];
    }

    mergeBookmarks(bookmarks: Bookmark[], newBookmarks: Bookmark[]): Bookmark[] {
        const oldBookmarksLen = bookmarks.length;
        const newBookmarksLen = newBookmarks.length;
        // Use same Bookmarks if both Bookmark Lists are the exact same
        if (
            oldBookmarksLen === newBookmarksLen &&
            bookmarks.every((bk, i) => {
                return bk === newBookmarks[i];
            })
        ) {
            return bookmarks;
        }

        let currentBookmarks: Bookmark[] = [];
        let oldBookInc = 0;
        let newBookInc = 0;
        while (oldBookInc < oldBookmarksLen && newBookInc < newBookmarksLen) {
            const oldBookmark = bookmarks[oldBookInc];
            const newBookmark = newBookmarks[newBookInc];
            if (oldBookmark.startTimeMs <= newBookmark.startTimeMs) {
                currentBookmarks.push(oldBookmark);
                ++oldBookInc;
            } else {
                currentBookmarks.push(newBookmark);
                ++newBookInc;
            }
        }

        if (oldBookInc < oldBookmarksLen) {
            currentBookmarks = [...bookmarks.slice(oldBookInc), ...currentBookmarks];
        } else {
            currentBookmarks = [...newBookmarks.slice(newBookInc), ...currentBookmarks];
        }
        return currentBookmarks;
    }

    refreshBookmarks(): void {
        this.creationCutOffTimeMS$.next(this.newCreationCutOffTimeMS$.value);
    }

    trackBookmarkById(index: number, bk: Bookmark): string {
        return bk.id;
    }

    updateParam(key: 'search' | 'date' | 'time' | 'devices' | 'tags'): void {
        if (!this.queryParams) {
            return;
        }
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
            this.queryParams.deviceId = this.deviceFilter.hasValue()
                ? this.deviceFilter.selected
                : undefined;
        } else if (key === 'tags') {
            this.queryParams.tags = this.tagFilter.hasValue()
                ? strArrayToCssa(this.tagFilter.selected)
                : undefined;
        }
        this.updateUri();
    }

    clearAllFilters(): void {
        this.dateAndTimeFilter.clear();
        this.deviceFilter.clear();
        this.tagFilter.clear();
        this.queryParams = {};
        this.search = '';
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
