import type { MenuNodeWithParent } from '@components/developers-menu/developers-menu-types';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';

// Could make this type more accurate, but have to watch out for different/older versions of the API

export interface MethodInfo {
    description: string,
    parameters: Array<object>,
    responses: {
        default: {
            description: string
        }
    },
    summary: string,
    tags: string[]
}

export type method = [string, MethodInfo]

export interface APIDoc {
    info? : APIInfo,
    tags  : {
                name: string,
                description?: string,
                [key:string]: any
            }[],
    paths : {
        [key:string]: MethodInfo,
    },
    servers?: { url: string}[]
}

export type placeHolderSelections = 'api_information' | 'legacy' | 'deprecated'

export interface ServerDropdownItem extends DropdownItem {
    apiDocFull   : APIDoc,
    incompatible : boolean
}

export interface SystemDropdownItem extends DropdownItem {
    json?  : APIDoc
}

export enum requestTypes {
    GET = 'get',
    POST = 'post',
    TRACE = 'trace',
    PUT = 'put',
    DELETE = 'delete',
    PATCH = 'patch',
    OPTIONS = 'options'
}

export interface APIInfo {
    title: string,
    description: string,
    version: string
}
export interface APIInfoStore {
    [key: string]: APIInfo
}

export type Markdown = string;

export interface APIToolCacheObject {
    version: string,
    json: APIDoc,
    markdown?: Markdown
}

export interface APIDropdownItem extends DropdownItem {
    menu     : MenuNodeWithParent[]
}
