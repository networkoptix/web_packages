import { Observable } from 'rxjs';

export interface Bookmark {
    id: string;
    deviceId: string;
    name: string;
    description: string;
    startTimeMs: string;
    durationMs: number;
    tags: string[];
    creatorUserId: string;
    creationTimeMs: string;
    src?: string;
    thumbnail?: Observable<string>;
    tagsFormatted?: { type: string, label: string }[];
    isVisible: boolean;
}
