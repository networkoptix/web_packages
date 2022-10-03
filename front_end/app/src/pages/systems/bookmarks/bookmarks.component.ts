import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { combineLatest, of, Subject } from 'rxjs';
import { debounceTime, delay, filter, switchMap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { SearchTag, SearchFilter } from '@components/search/search.component';
import { NxAccountService, Account } from '@services/account.service';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxSystem, NxSystemService } from '@services/system.service';
import { NxUtilsService } from '@services/utils.service';

import { BookmarkService, Bookmark } from './bookmark.service';

@UntilDestroy()
@Component({
    selector: 'bookmarks-component',
    templateUrl: 'bookmarks.component.html',
    styleUrls: ['bookmarks.component.scss']
})

export class NxBookmarksComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    allElements: Bookmark[];
    elements: Bookmark[];
    filterModel: SearchFilter = {};
    system: NxSystem;
    account: Account;
    restEndpointUsed = true;

    private emptyFilter: any = {};

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();

        this.allElements = [];

        this.emptyFilter = {
            query: ''
        };
        this.filterModel = this.emptyFilter;
        this.filterModel.tags = [];
    }

    // Added to help with merge into develop.
    private deepCopy(obj) {
        return NxUtilsService.deepCopy(obj);
    }

    constructor(
        configService: NxConfigService,
        private bookmarkService: BookmarkService,
        private language: NxLanguageProviderService,
        private pageService: NxPageService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private route: ActivatedRoute
    ) {
        this.setupDefaults(configService);
    }

    ngOnDestroy() {}

    ngOnInit(): void {
        this.LANG = this.language.translations;
        this.pageService.pageTitle = this.LANG.pageTitles.integrations?.();
        this.pageService.pageDescription = this.CONFIG.integration.seoPageDesc;

        this.route.queryParams
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.filterModel.query = params.search || '';
            });

        const readySubject = new Subject<boolean>();

        combineLatest([
            this.route.params,
            this.accountService.get()
        ])
            .pipe(
                switchMap(([params, account]: [any, Account]) => {
                    this.account = account;
                    this.bookmarkService.system = this.systemService.createSystem(
                        this.account.email,
                        params.systemId
                    );
                    return of(this.setTags());
                }),
                delay(500),
                switchMap(() => this.bookmarkService.getBookmarks(undefined, 10)),
                untilDestroyed(this)
            ).subscribe((bookmarks: Bookmark[]) => {
                this.restEndpointUsed = true;
                if (bookmarks) {
                    this.setBookmarks(bookmarks);
                    readySubject.next(true);
                } else {
                    this.elements = undefined;
                }
            }, err => {
                console.error('Bookmarks error -> ', err);
                if (err.message === 'should only be using rest version') {
                    this.restEndpointUsed = false;
                } else {
                    this.pageService.show404();
                }
            });

        let lastSearch;
        readySubject.pipe(
            switchMap(() => this.route.queryParams),
            filter(({ search }) => search !== lastSearch),
            debounceTime(500),
            switchMap(({ search }) => {
                lastSearch = search;
                return this.bookmarkService.getBookmarks(search, search ? 100 : 10);
            }),
            untilDestroyed(this)
        ).subscribe((bookmarks: Bookmark[]) => {
            this.setBookmarks(bookmarks);
        });
    }

    setBookmarks(bookmarks: Bookmark[]): void {
        this.allElements = bookmarks.map((bookmark: Bookmark) => {
            bookmark.tagsFormatted = bookmark.tags.map((tag: string) => ({ type: 'default', label: tag }));
            return bookmark;
        }).sort((a, b) =>
            +b.creationTimeMs - +a.creationTimeMs
        );
        this.setFilter();
    }

    async setTags(): Promise<void> {
        const tags = await this.bookmarkService.getBookmarkTags().toPromise();
        this.filterModel.tags = Object.keys(tags).map(
            (tag: string): SearchTag =>  {
                return { id: tag, label: tag, value: false };
            }
        );

        this.filterModel = this.deepCopy(this.filterModel);
    }

    setFilter(): void {
        const IGNORE_KEYS = [
            'creationTimeMs',
            'creatorUserId',
            'durationMs',
            'id',
            'startTimeMs'
        ];
        const searchBy = (item: Bookmark | string[], query: string) => {
            return Object.keys(item).some((key) => {
                if (!item[key] || IGNORE_KEYS.includes(key)) {
                    return false;
                }
                return typeof item[key] === 'object'
                    ? searchBy(item[key], query)
                    : item[key].toLowerCase().includes(query);
            });
        };

        this.elements = this.deepCopy(this.allElements);
        if (this.filterModel.query !== '') {
            const query = this.filterModel.query.toLowerCase();
            this.elements = this.elements.filter((item: Bookmark) =>
                searchBy(item, query)
            );
        }

        if (this.filterModel.tags?.length) {
            const selectedTags: string[] = this.filterModel.tags
                .filter((tag: SearchTag) => tag.value)
                .map((tag: SearchTag) => tag.label);

            if (selectedTags.length) {
                this.elements = this.elements.filter((item: Bookmark) => {
                    return selectedTags.every((tagLabel: string) => {
                        return item.tags.includes(tagLabel);
                    });
                });
            }
        }
    }

    modelChanged(searchModel: SearchFilter): void {
        this.filterModel = this.deepCopy(searchModel);
        this.setFilter();
    }
}
