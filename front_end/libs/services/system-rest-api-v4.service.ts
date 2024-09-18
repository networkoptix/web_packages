import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';

import { NxHealthService } from '@pages/health/health.service';

import { NxAppStateService } from './nx-app-state.service';
import type { UnauthorizedCallback } from './system-api.types';
import { BookmarksParams, BookmarkV4 } from './system-api.types/devices.types';
import { NxSystemRestAPI3 } from './system-rest-api-v3.service';
import { NxUriCacheService } from './uri-cache.service';

type UpdateBookmarkShareParams = {
    expirationTimeMs?: number;
    password?: string;
};

export class NxSystemRestAPI4 extends NxSystemRestAPI3 {
    override readonly version: number;

    constructor(
        http: HttpClient,
        location: Location,
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: UnauthorizedCallback,
        cacheService: NxUriCacheService,
        cookieService: CookieService,
        healthService: NxHealthService,
        appState: NxAppStateService,
        injector: Injector,
        skipSettingSystem = false,
    ) {
        super(
            http,
            location,
            userEmail,
            systemId,
            serverId,
            unauthorizedCallback,
            cacheService,
            cookieService,
            healthService,
            appState,
            injector,
            skipSettingSystem,
        );
        this.version = 6.1;
    }

    override getBookmarks(
        params: BookmarksParams = {
            order: 'desc',
            column: 'creationTime',
            _keepDefault: true,
            _orderBy: 'creationTimeMs',
        },
    ): Observable<BookmarkV4[]> {
        return this.get('/rest/v4/devices/*/bookmarks', { params });
    }

    updateBookmarkShare({
        deviceId,
        bookmarkId,
        updateBookmarkShareParams: { expirationTimeMs, password },
    }: {
        deviceId: string;
        bookmarkId: string;
        updateBookmarkShareParams: UpdateBookmarkShareParams;
    }): Observable<BookmarkV4> {
        return this.patch(`/rest/v4/devices/${deviceId}/bookmarks/${bookmarkId}`, {
            share: { expirationTimeMs, password },
        });
    }

    deleteBookmarkShare({
        deviceId,
        bookmarkId,
    }: {
        deviceId: string;
        bookmarkId: string;
    }): Observable<BookmarkV4> {
        return this.patch(`/rest/v4/devices/${deviceId}/bookmarks/${bookmarkId}`, { share: null });
    }
}
