import type { MenuNodeWithParent } from '@components/developers-menu/developers-menu-types';
import type { ReadOnlyAPI } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { NxSystemServer } from '@services/system.service/system-types';

import type { APIDoc, APIInfo } from '../api-tool-types';

export type markdownFile = string;

export interface Store<Type> {
    [key: string]: Type;
}

export interface EmitInfo<Type> {
    info: Type;
    disabled: boolean;
    error: string;
}

export interface APIType {
    displayName: string;
    type: number;
}

export interface ServerInfo {
    server: NxSystemServer;
    json: APIDoc;
    markdown?: MarkdownIndex | undefined;
}

export interface ReadOnlyAPIInfoWithJSON extends ReadOnlyAPI {
    content: APIDoc;
}

export interface ReadOnlyAPIStore {
    api: ReadOnlyAPIInfoWithJSON;
    menus: {
        [type: string]: MenuNodeWithParent[];
    };
    markdown?: MarkdownIndex;
}

export interface FetchedMarkdown {
    name: string;
    markdown: string;
}

export interface APIData {
    json: APIDoc;
    menus: {
        [type: string]: MenuNodeWithParent[];
    };
    infos: {
        [type: string]: APIInfo;
    };
    markdown?: MarkdownIndex;
}

export interface MarkdownObj {
    APIPreamble: markdownFile;
    APIChangelog: markdownFile;
}

export interface MarkdownIndex {
    [key: string]: markdownFile;
}

export type APITypes = {
    main: {
        type: 'main';
        displayName: 'Current API';
    };
    deprecated: {
        type: 'deprecated';
        displayName: 'Deprecated API';
    };
};

export interface IndexDBCacheObject {
    json: APIDoc;
    version: string;
    markdown: MarkdownIndex;
    key: string;
}

export interface FetchedJSONs {
    [key: string]: Promise<APIDoc>;
}
