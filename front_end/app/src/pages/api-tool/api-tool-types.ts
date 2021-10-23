// Could make this type more accurate, but have to watch out for different/older versions of the API
export interface APIDoc {
    info? : {
        title: string,
        description: string,
        version : string
    }
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

export interface ServerDropdownItem {
    value        : string,
    name         : string,
    apiDocFull   : APIDoc,
    incompatible : boolean
    disabled     : boolean
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

export interface PageDescription {
    title: string,
    description: string
}
export interface PageDescriptions {
    [key: string]: PageDescription
}
