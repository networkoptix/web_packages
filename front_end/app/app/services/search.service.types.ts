export enum ButtonArrowType {
    up = 'UP',
    down = 'DOWN',
}

export interface SearchModel {
    query: string;
    queryExactMatch?: '' | string[];
    queryEndsWith?: '' | [string];
    queryStartsWith?: '' | [string];
    queryOrMatch?: '' | string[];
    queryAndMatch?: '' | string[];
}
