import type { OpenAPIJSON } from '@services/nx-cloud-api.types';

import type { MenuNodeWithParent } from '../../../components/developers-menu/developers-menu-types';
import type { NxSystemServer } from '../../../services/system.service/system-types';
import type { APIDoc, APIInfo } from '../api-tool-types';

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
    type: string
}

export interface ServerInfo {
    server: NxSystemServer,
    json: APIDoc
}

export interface ReadonlyAPI {
    api: OpenAPIJSON,
    menu: MenuNodeWithParent[]
}

export interface APIData {
    json: APIDoc,
    menus: {
        [type: string]: MenuNodeWithParent[]
    },
    infos: {
        [type: string]: APIInfo
    }
}
