import type { ReadOnlyAPI } from '@services/nx-cloud-api/nx-cloud-api.types';

import type { MenuNodeWithParent } from '../../../components/developers-menu/developers-menu-types';
import type { NxSystemServer } from '../../../services/system.service/system-types';
import type { APIDoc, APIInfo } from '../api-tool-types';

export type markdownFile = string;

export interface Store<Type> {
    [key: string]: Type
}

export interface EmitInfo<Type> {
    info: Type,
    disabled: boolean,
    error: string
}

export interface APIType {
    displayName: string,
    type: number
}

export interface ServerInfo {
    server: NxSystemServer,
    json: APIDoc,
    markdown: Markdown
}

export interface ReadOnlyAPIInfoWithJSON extends ReadOnlyAPI {
    content: APIDoc
}

export interface ReadOnlyAPIStore {
    api: ReadOnlyAPIInfoWithJSON,
    menus: {
        [type: string]: MenuNodeWithParent[]
    }
    markdown?: Markdown
}

export interface APIData {
    json: APIDoc,
    menus: {
        [type: string]: MenuNodeWithParent[]
    },
    infos: {
        [type: string]: APIInfo
    },
    markdown?: Markdown
}

export interface Markdown {
    APIPreamble: markdownFile,
    APIChangelog: markdownFile
}

export type APITypes = {
    main: {
        type: 'main',
        displayName: 'Current API'
    },
    deprecated: {
        type: 'deprecated',
        displayName: 'Deprecated API'
    }
};

export interface IndexDBCacheObject {
    json: APIDoc,
    version: string,
    markdown: Markdown,
    key: string
}

export interface FetchedJSONs {
    [key: string]: Promise<APIDoc>
}
