import { Layout, Permissions } from '@services/nx-config/base-config';
export const ribbonHeight: number = 33;
export const pollingTimeout: number = 30 * 1000;
export const layout: Layout = {
    table: {
        rows: 10
    },
    tableLarge: {
        rows: 20
    }
};

export const permissions: Permissions = {
    canViewRelease: 'can_view_release'
};
