import { Observable } from 'rxjs';

import type {
    Bookmark as BookmarkResp,
    DeviceV1Full,
} from '@services/system-api.types/devices.types';

export interface Bookmark extends BookmarkResp {
    tags: string[];
    src: string;
    downloadSrc: string;
    thumbnail: Observable<string>;
    isVisible: boolean;
    deviceName: string;
    deviceId: string;
    systemId: string;
    timeZoneOffset: number;
}

export interface TimeRange {
    start: number | null;
    end: number | null;
}

export const bookmarksDeviceKeys = ['id', 'name', 'serverId'] as const;
export type BookmarksDevice = Pick<DeviceV1Full, (typeof bookmarksDeviceKeys)[number]>;
