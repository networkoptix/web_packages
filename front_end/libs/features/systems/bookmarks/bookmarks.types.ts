import type { Bookmark as BookmarkResp } from '@services/system-api.types';

export interface Bookmark extends BookmarkResp {
    src: string;
    thumbnail: string;
    tagsFormatted: { type: string, label: string }[];
    isVisible: boolean;
}

export interface TimeRange {
    start: number | null;
    end: number | null;
}
