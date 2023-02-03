export interface MethodInfo {
    description: string;
    parameters?: Array<Parameter>;
    responses: {
        default: {
            description: string;
        };
    };
    requestBody?: RequestBody;
    summary: string;
    tags: string[];
    deprecated?: boolean;
}

interface Parameter {
    name: string;
    description: string;
}

interface RequestBody {
    content: {
        'application/json': {
            schema: {
                properties: {
                    [key: string]: {
                        description: string;
                        type: string;
                        readOnly: boolean;
                    };
                };
            };
        };
    };
}

export type method = [string, MethodInfo];

export interface APIInfo {
    title: string;
    description: string;
    version: string;
}

export interface APIDoc {
    info? : APIInfo;
    tags : {
                name: string;
                description?: string;
                [key:string]: any;
            }[];
    paths : {
        [key:string]: {
            [key:string]: MethodInfo;
        };
    };
    servers?: { url: string }[];
    tagsModified?: boolean;
    components?: {
        schemas: Object;
    };
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
    version: string;
    json: APIDoc;
    markdown?: Markdown;
}
