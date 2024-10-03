import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    OnInit,
    signal,
} from '@angular/core';
import { firstValueFrom, map, Observable, shareReplay } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAppStateService } from '@services/nx-app-state.service';
import { nxConfig } from '@services/nx-config/config';
import { servers } from '@static-variables';
import { sha256 } from '@utils/sha256';

import { SharedBookmark404Component } from './shared-bookmark-404/shared-bookmark-404.component';
import { SharedBookmarkPasswordComponent } from './shared-bookmark-password/shared-bookmark-password.component';
import { SharedBookmarkViewerComponent } from './shared-bookmark-viewer/shared-bookmark-viewer.component';

type BookmarkData = {
    name: string;
    description: string;
    durationMs: number;
    id: string;
    startTimeMs: number;
    tags: string[];
};

@Component({
    selector: 'nx-shared-bookmark',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['shared-bookmark.component.scss'],
    templateUrl: 'shared-bookmark.component.html',
    imports: [
        CommonModule,
        NxPreLoaderComponent,
        SharedBookmarkViewerComponent,
        SharedBookmarkPasswordComponent,
        SharedBookmark404Component,
    ],
})
export class SharedBookmarkComponent implements OnInit {
    http = inject(HttpClient);
    systemId = input.required<string>();
    bookmarkId = input.required<string>();

    CONFIG = nxConfig;

    baseUrl = computed(
        () =>
            'https://' +
            this.CONFIG.trafficRelayHost
                .replace('{host}', window.location.host)
                .replace('{systemId}', this.systemId()),
    );

    pageState = signal<'loading' | 'password' | 'viewer' | '404'>('loading');
    password = signal<string>('');
    incorrectPasswordError = signal(false);
    inputFieldsDisabled = signal(false);
    passwordHash = signal<string>('');

    serverSyncTime$: Observable<number>;

    // Bookmark Info
    bookmarkInfo = signal({
        title: '',
        description: '',
        startTime: new Date(),
    });
    videoSource = computed(
        () =>
            `${this.baseUrl()}/rest/v4/devices/*/bookmarks/${this.bookmarkId()}/media${this.passwordHash() ? '?passwordProtection=' + this.passwordHash() : ''}`,
    );

    constructor(appStateService: NxAppStateService) {
        appStateService.headerVisibility = false;
    }

    ngOnInit(): void {
        this.serverSyncTime$ = this.http.get(`${this.baseUrl()}/rest/v4/site/info`).pipe(
            map((siteInfo: { synchronizedTimeMs: number }) => siteInfo.synchronizedTimeMs),
            shareReplay({ bufferSize: 1, refCount: false }),
        );
        this.getBookmarkInfo();
    }

    async getBookmarkInfo(password?: string): Promise<void> {
        const queryParams: { passwordProtection?: string } = {};
        if (password) {
            this.passwordHash.set(await this.getPasswordHash(password));
            queryParams.passwordProtection = this.passwordHash();
        }
        this.http
            .get<BookmarkData>(
                `${this.baseUrl()}/rest/v4/devices/*/bookmarks/${this.bookmarkId()}/description`,
                {
                    params: queryParams,
                },
            )
            .subscribe({
                next: bookmarkData => {
                    this.bookmarkInfo.set({
                        title: bookmarkData.name,
                        description: bookmarkData.description,
                        startTime: new Date(bookmarkData.startTimeMs),
                    });
                    this.pageState.set('viewer');
                },
                error: error => {
                    if (error?.error?.errorId === servers.errors.forbidden) {
                        // Password is incorrect or not provided or incorrect time sync
                        if (password) {
                            // Password is incorrect
                            this.incorrectPasswordError.set(true);
                        }
                        this.setServerSyncTime();
                        this.pageState.set('password');
                        this.inputFieldsDisabled.set(false);
                    } else {
                        // Server doesn't exist or bookmark doesn't exist
                        this.pageState.set('404');
                    }
                },
            });
    }

    checkPassword(): void {
        this.getBookmarkInfo(this.password());
    }

    /*
     * password hash formula
     * synchronizedTimeMs + ":" + sha256(sha256(bookmarkId + password) + synchronizedTimeMs))
     */
    async getPasswordHash(password: string): Promise<string> {
        const syncTime = await firstValueFrom(this.serverSyncTime$);
        const passwordHash = await sha256(this.bookmarkId() + password);
        const syncTimeHash = await sha256(passwordHash + syncTime);
        return `${syncTime}:${syncTimeHash}`;
    }

    setServerSyncTime(): void {
        this.serverSyncTime$.subscribe();
    }
}
