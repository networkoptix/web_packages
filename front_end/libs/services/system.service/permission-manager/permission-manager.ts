import { computed, Signal, signal, WritableSignal } from '@angular/core';

import * as t from '@services/system-api.types';
import { NxSystemAPI } from '@services/system-legacy-api.service';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { SystemPermissions } from '@services/system.service/user-manager/user-manager-types';

const PermissionStrings = {
    editUserPermissionFlag: 'GlobalAdminPermission',
    editCameraPermissionFlag: 'GlobalEditCamerasPermission',
    exportPermissionFlag: 'GlobalExportPermission',
    globalAdminPermissionFlag: 'GlobalAdminPermission',
    globalCustomUserPermission: 'GlobalCustomUserPermission',
    globalViewBookmarksPermission: 'GlobalViewBookmarksPermission',
    allMediaPermissionFlag: 'GlobalAccessAllMediaPermission',
    viewArchivesPermissionFlag: 'GlobalViewArchivePermission',
};

export class PermissionManager {
    private user: WritableSignal<t.CurrentUser> = signal(undefined);
    ownerEmail: WritableSignal<string> = signal('');
    isAdmin: Signal<boolean> = computed(
        () =>
            this.isOwner() ||
            this.permissionsString().includes(PermissionStrings.globalAdminPermissionFlag),
    );
    isOwner: Signal<boolean> = computed(() => {
        const user = this.user();
        if (!user) {
            return false;
        }
        return this.ownerEmail() === user?.email || ('isOwner' in user && user.isOwner);
    }, {});
    permissions: Signal<SystemPermissions> = computed(() => {
        const isOwner = this.isOwner();
        const isAdmin = isOwner || this.isAdmin();
        const permissions = this.permissionsString();
        return {
            isAdmin,
            editAdmins: isOwner,
            editUsers: isAdmin || permissions.includes(PermissionStrings.editUserPermissionFlag),
            editCameras:
                isAdmin || permissions.includes(PermissionStrings.editCameraPermissionFlag),
            exportArchives: isAdmin || permissions.includes(PermissionStrings.exportPermissionFlag),
            viewArchives:
                isAdmin || permissions.includes(PermissionStrings.viewArchivesPermissionFlag),
            viewBookmarks:
                isAdmin || permissions.includes(PermissionStrings.globalViewBookmarksPermission),
        };
    });
    permissionsString: Signal<string[]> = computed(() =>
        (this.user()?.permissions || '').split('|'),
    );

    constructor(
        protected mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3,
    ) {
        this.checkCurrentUser().catch();
    }

    async checkCurrentUser(): Promise<void> {
        const user = await this.mediaserver.getCurrentUser(true);
        this.user.set(user);
    }
}
