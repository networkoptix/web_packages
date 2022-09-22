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
    deprecated?: boolean;
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
        [key:string]: {
            [key:string]: MethodInfo
        }
    },
    servers?: { url: string }[],
    tagsModified?: boolean
    components?: {
        schemas: Object
    }
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

export type Markdown = string;

export interface APIToolCacheObject {
    version: string,
    json: APIDoc,
    markdown?: Markdown
}
