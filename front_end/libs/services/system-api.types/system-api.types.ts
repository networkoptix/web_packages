/**
 * Base response type, accepts a generic type/interface that gets assigned to the reply property.
 * Usage example below.
 *
 * export interface GetUserRoles extends NormalResponse<UserPermissions> {}
 */
export interface NormalResponse<Reply> {
    error: string;
    errorString: string;
    reply: Reply;
}

export interface Param {
    name: string;
    value: string;
}

export interface ChangedIdReturned {
    id: string;
}

export type EmptyObjectReturned = Record<string, never>;

export interface ResourceParam {
    value: string;
    name: string;
    resourceId?: string;
}

export interface ServerDocumentationSettings {
    defaultValue: boolean | string | number;
    name: string;
    description: string;
}

export interface ServerDocumentation {
    error: string;
    errorId: string;
    errorString: string;
    reply: {
        settings: ServerDocumentationSettings[];
    };
}

export type HiddenParams = Partial<{
    // _filter: unknown;
    _format: 'JSON' | 'XML' | 'CSV';
    _keepDefault: boolean;
    _language: string;
    _pretty: boolean;
    _with: string;
    _local: boolean;
    _orderBy: string | string[];
    // Single string = array of one string
}>;
