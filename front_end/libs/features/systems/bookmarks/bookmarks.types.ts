import { Observable } from 'rxjs';

import type { Bookmark as BookmarkResp } from '@services/system-api.types';

export interface Bookmark extends BookmarkResp {
    tags: string[];
    src: string;
    thumbnail: Observable<string>;
    isVisible: boolean;
    deviceName: string;
    deviceId: string;
    systemId: string;
}

export interface TimeRange {
    start: number | null;
    end: number | null;
}
