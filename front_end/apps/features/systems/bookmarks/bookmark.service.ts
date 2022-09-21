import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';

import type { Bookmark } from './bookmark.types';

// const mockBookmarks: Bookmark[] = [
//     {
//         "id": "3fa85f64-5717-4562-b3fc-2c963f66afa1",
//         "deviceId": "bookmark1",
//         "name": "Bookmark 1",
//         "description": "The first example description.",
//         "startTimeMs": "2021-02-05T19:00:20",
//         "durationMs": "10",
//         "tags": ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
//         "creatorUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
//         "creationTimeMs": "2021-02-05T19:00:30"
//     },
//     {
//         "id": "3fa85f64-5717-4562-b3fc-2c963f66afa2",
//         "deviceId": "bookmark2",
//         "name": "Bookmark 2",
//         "description": "The second example description.",
//         "startTimeMs": "2021-02-05T19:00:20",
//         "durationMs": "20",
//         "tags": ['tag2', 'tag4'],
//         "creatorUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
//         "creationTimeMs": "2021-02-05T19:00:40"
//     },
//     {
//         "id": "3fa85f64-5717-4562-b3fc-2c963f66afa3",
//         "deviceId": "bookmark3",
//         "name": "Bookmark 3",
//         "description": "The third example description",
//         "startTimeMs": "2021-02-05T19:00:20",
//         "durationMs": "30",
//         "tags": ['tag1', 'tag3', 'tag5'],
//         "creatorUserId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
//         "creationTimeMs": "2021-02-05T19:00:50"
//     }
// ];

@Injectable({
    providedIn: 'root'
})
export class BookmarkService implements OnDestroy {
    CONFIG: IConfig;

    systemSubject = new BehaviorSubject(undefined);

    get system() {
        return this.systemSubject.getValue();
    }

    set system(system: NxSystem) {
        this.systemSubject.next(system);
    }

    constructor(
        configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }

    getBookmarks(text?: string, limit?: number) {
        const params = {
            limit,
            text,
            order: 'desc',
            column: 'creationTime',
            deviceId: '*',
            _keepDefault: 'true',
            _orderBy: 'creationTimeMs'
        };
        if (!limit) {
            params.limit = 100;
        }
        if (!text) {
            delete params.text;
        }
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
                        bookmark.deviceId, bookmark.startTimeMs, 700, 400, 0
                    ),
                    isVisible: false
                })))
            );
    }

    getBookmarkTags() {
        return this.system.mediaserver.getBookmarkTags();
    }

    ngOnDestroy(): void {}
}
