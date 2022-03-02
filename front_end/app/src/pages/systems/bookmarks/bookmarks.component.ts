import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { combineLatest, of } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type {
    SearchTag,
    SearchFilter
} from '@components/search/search.component';
import { NxAccountService, Account } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

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
    filterModel: SearchFilter = { query: '', tags: [] };
    system: NxSystem;
    account: Account;
    restEndpointUsed = true;

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();

        this.allElements = [];
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
                    return of(true);
                }),
                delay(500),
                switchMap(() => this.bookmarkService.getBookmarks()),
                untilDestroyed(this)
            ).subscribe((bookmarks: Bookmark[]) => {
                this.restEndpointUsed = true;
                if (bookmarks) {
                    this.setBookmarks(bookmarks);
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
    }

    setBookmarks(bookmarks: Bookmark[]): void {
        this.allElements = bookmarks.sort((a, b) =>
            +b.creationTimeMs - +a.creationTimeMs
        );
        this.setTags();
        this.setFilter();
    }

    setTags(): void {
        const uniqueTags = new Set<string>();
        this.allElements.forEach((bookmark: Bookmark) => {
            bookmark.tagsFormatted = [];
            bookmark.tags.forEach((tag: string) => {
                uniqueTags.add(tag);
                bookmark.tagsFormatted.push({ type: 'default', label: tag });
            });
        });
        this.filterModel.tags = Array.from(uniqueTags).map<SearchTag>(tag => ({
            id: tag,
            label: tag,
            value: false
        }));

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

        this.elements = this.allElements.map((obj: Bookmark) => ({ ...obj }));
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
                    return selectedTags.some((tagLabel: string) => {
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
