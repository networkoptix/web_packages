import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { combineLatest, of, Subject } from 'rxjs';
import { debounceTime, delay, filter, switchMap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type {
    SearchTag,
    SearchFilter
} from '@components/search/search.component.types';
import { redirect } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

import { BookmarkService } from './bookmark.service';
import type { Bookmark } from './bookmark.types';

@UntilDestroy()
@Component({
    selector: 'nx-bookmarks-component',
    templateUrl: 'bookmarks.component.html',
    styleUrls: ['bookmarks.component.scss']
})

export class NxBookmarksComponent implements OnInit, OnDestroy {
    LANG: LanguageI18NStaticTypes;

    allElements: Bookmark[];
    elements: Bookmark[];
    filterModel: SearchFilter = { query: '', tags: [] };
    system: NxSystem;
    account: Account;
    restEndpointUsed = true;

    private setupDefaults(): void {
        this.allElements = [];
    }

    constructor(
        private bookmarkService: BookmarkService,
        private language: NxLanguageProviderService,
        // private pageService: NxPageService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private route: ActivatedRoute,
        private router: Router,
    ) {
        this.setupDefaults();
    }

    ngOnDestroy(): void { }

    ngOnInit(): void {
        this.LANG = this.language.translations;

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
                    this.router
                        .navigate([redirect.page404], {
                            replaceUrl: true,
                        })
                        .catch(error => {
                            console.error(error);
                        });
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
            (tag: string): SearchTag => {
                return { id: tag, label: tag, value: false };
            }
        );

        this.filterModel = cloneDeep(this.filterModel);
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
            return Object.keys(item).some(key => {
                if (!item[key] || IGNORE_KEYS.includes(key)) {
                    return false;
                }
                return typeof item[key] === 'object'
                    ? searchBy(item[key], query)
                    : item[key].toLowerCase().includes(query);
            });
        };

        this.elements = cloneDeep(this.allElements);
        if (this.filterModel.query !== '') {
            const query = this.filterModel.query.toLowerCase();
            this.elements = this.elements.filter((item: Bookmark) =>
                searchBy(item, query)
            );
        }

        if (this.filterModel.tags?.length) {
            const selectedTags: string[] = this.filterModel.tags
                .filter(tag => tag.value)
                .map(tag => tag.label);

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
        this.filterModel = cloneDeep(searchModel);
        this.setFilter();
    }
}
