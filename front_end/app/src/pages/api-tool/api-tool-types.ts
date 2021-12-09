import { MenuNodeWithParent } from '@components/developers-menu/developers-menu.component';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';

// Could make this type more accurate, but have to watch out for different/older versions of the API
export interface APIDoc {
    info? : APIInfo,
    tags  : {
                name: string,
                description?: string,
                [key:string]: any
            }[],
    paths : {
                [key: string]: {
                    [key in requestTypes]: {
                        tags: string[],
                        parameters: [{[key:string]: any}],
                        [key: string] : any
                    }
                }
            },
    servers?: { url: string}[]
}

export type placeHolderSelections = 'api_information' | 'legacy' | 'deprecated'

export interface ServerDropdownItem extends DropdownItem {
    apiDocFull   : APIDoc,
    incompatible : boolean
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

export interface APIDropdownItem extends DropdownItem {
    menu     : MenuNodeWithParent[]
}
