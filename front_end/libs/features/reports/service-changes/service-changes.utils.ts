import { apiPageSize } from './service-changes.store';

function getPageRange(page: number, pageSize: number): { min: number; max: number } {
    return {
        min: page * pageSize - (pageSize - 1),
        max: page * pageSize,
    };
}

export function isTablePageOutsideLoadedApiPage(
    tablePage: number,
    tablePageSize: number,
    apiPage: number,
): boolean {
    const tableRange = getPageRange(tablePage, tablePageSize);
    const apiRange = getPageRange(apiPage, apiPageSize);
    if (tableRange.min < apiRange.min || tableRange.max > apiRange.max) {
        return true;
    } else {
        return false;
    }
}

export function getNextApiPage(tablePage: number, tablePageSize: number, apiPage: number): number {
    const tableRange = getPageRange(tablePage, tablePageSize);
    const apiRange = getPageRange(apiPage, apiPageSize);
    if (tableRange.min < apiRange.min || tableRange.max > apiRange.max) {
        return Math.ceil(tableRange.min / apiPageSize);
    } else {
        return apiPage;
    }
}
