import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAppStateService } from '@services/nx-app-state.service';
import { nxConfig } from '@services/nx-config/config';
import { servers } from '@static-variables';

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
    styleUrls: ['shared-bookmark.component.scss'],
    templateUrl: 'shared-bookmark.component.html',
    imports: [
        CommonModule,
        SharedBookmarkViewerComponent,
        NxPreLoaderComponent,
        SharedBookmarkPasswordComponent,
    ],
})
export class SharedBookmarkComponent implements OnInit {
    @Input() systemId: string;
    @Input() bookmarkId: string;

    CONFIG = nxConfig;

    baseUrl: string;
    pageState: 'loading' | 'password' | 'viewer' = 'loading';
    password: string;

    // Bookmark Info
    startTime: Date;
    description: string;
    title: string;
    videoSource: string;

    constructor(
        appStateService: NxAppStateService,
        private http: HttpClient,
    ) {
        appStateService.headerVisibility = false;
    }

    ngOnInit(): void {
        this.baseUrl = this.getUrlBase();
        this.videoSource = `${this.baseUrl}/rest/v4/devices/*/bookmarks/${this.bookmarkId}/media`;
        this.getBookmarkInfo();
    }

    getUrlBase(): string {
        return (
            'https://' +
            this.CONFIG.trafficRelayHost
                .replace('{host}', window.location.host)
                .replace('{systemId}', this.systemId)
        );
    }

    getBookmarkInfo(): void {
        this.http
            .get<BookmarkData>(
                `${this.baseUrl}/rest/v4/devices/*/bookmarks/${this.bookmarkId}/description`,
            )
            .subscribe({
                next: bookmarkData => {
                    this.title = bookmarkData.name;
                    this.description = bookmarkData.description;
                    this.startTime = new Date(bookmarkData.startTimeMs);
                    this.pageState = 'viewer';
                },
                error: error => {
                    // Password is incorrect or not provided or incorrect time sync
                    if (error.error.errorId === servers.errors.forbidden) {
                        this.pageState = 'password';
                    }
                },
            });
    }

    checkPassword(): void {
        // TODO: Handle password when server supports it
    }
}
