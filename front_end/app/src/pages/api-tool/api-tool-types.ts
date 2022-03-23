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

export type method = [string, MethodInfo];

export interface APIInfo {
    title: string,
    description: string,
    version: string
}

export interface APIDoc {
    info? : APIInfo,
    tags : {
                name: string,
                description?: string,
                [key:string]: any
            }[],
    paths : {
        [key:string]: MethodInfo,
    },
    servers?: { url: string }[],
    tagsModified?: boolean
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
