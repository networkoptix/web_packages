import { NgModule } from '@angular/core';

import { AddUserModalModule } from './add-user/add-user.module';
import { ApplyModalModule } from './apply/apply.module';
import { NxBookmarksCardModalModule } from './bookmarks/card-modal/bookmarks-card-modal.module';
import { NxBookmarkDownloadModule } from './bookmarks/download-modal/bookmark-download.module';
import { NxMoreDevicesModule } from './bookmarks/more-devices/more-devices.module';
import { NxMoreTagsModule } from './bookmarks/more-tags/more-tags.module';
import { ChangePasswordModalModule } from './change-password/change-password.module';
import { NxAddOrgUserModule } from './channel-partners/add-org-user/add-org-user.module';
import { AddOrganizationModalModule } from './channel-partners/add-organization/add-organization.module';
import { AddPartnerModalModule } from './channel-partners/add-partner/add-partner.module';
import { AddPartnerUserModalModule } from './channel-partners/add-partner-user/add-partner-user.module';
import { NxEditOrgUserModule } from './channel-partners/edit-org-user/edit-org-user.module';
import { NxEditOrganizationModalModule } from './channel-partners/edit-organization/edit-organization.module';
import { NxEditPartnerModalModule } from './channel-partners/edit-partner/edit-partner.module';
import { NxEditPartnerUserModalModule } from './channel-partners/edit-partner-user/edit-partner-user.module';
import { Client2faWarningModalModule } from './client-2fa-warning/client-2fa-warning.module';
import { CloudStorageModule } from './cloud-storage/cloud-storage.module';
import { ConnectCloudModalModule } from './connect-cloud/connect-cloud.module';
import { CreateSystemGroupModalModule } from './create-system-group/create-system-group.module';
import { DeleteCloudUserModalModule } from './delete-cloud-user/delete-cloud-user.module';
import { NxDetachServerModalModule } from './detach-server/detach-server.module';
import { DisconnectModalModule } from './disconnect/disconnect.module';
import { GenericDialogModule } from './generic/generic.module';
import { LoginWebadminModalContent } from './login-webadmin/login-webadmin.component';
import { Mandatory2faModalModule } from './mandatory-2fa/mandatory-2fa.module';
import { NxMergeModule } from './merge/merge.module';
import { MessageModalModule } from './message/message.module';
import { NewFeatureInformationModalModule } from './new-feature/new-feature.module';
import { RemoveSystemModalModule } from './remove-system/remove-system.module';
import { RemoveUserModalModule } from './remove-user/remove-user.module';
import { NxResetServerModalModule } from './reset-server/reset-server.module';
import { RestartServerModalModule } from './restart-server/restart-server.module';
import { SelectTimeRangeModalModule } from './select-time-range-native-fallback/select-time-range.module';
import { TransferOwnershipModule } from './transfer-ownership/transfer-ownership.module';
import { TwoFAModalModule } from './two-fa/two-fa.module';
import { UpdateCameraCredentialsModalModule } from './update-camera-credentials/update-camera-credentials.module';
import { NxUpdateSessionModalModule } from './update-session/update-session.module';
import { NxWebGlSelectTimeRangeModalModule } from './webgl-select-time-range/select-time-range.module';
import { NxWizardModalModule } from './wizard/wizard.module';

@NgModule({
    imports: [
        GenericDialogModule,
        LoginWebadminModalContent,
        TransferOwnershipModule,
        NxMergeModule,
        NxMoreDevicesModule,
        NxMoreTagsModule,
        NxBookmarksCardModalModule,
        NxBookmarkDownloadModule,
        TwoFAModalModule,
        ApplyModalModule,
        AddUserModalModule,
        RemoveUserModalModule,
        DeleteCloudUserModalModule,
        MessageModalModule,
        Client2faWarningModalModule,
        ConnectCloudModalModule,
        DisconnectModalModule,
        RemoveSystemModalModule,
        Mandatory2faModalModule,
        CreateSystemGroupModalModule,
        AddPartnerModalModule,
        NxEditPartnerModalModule,
        AddPartnerUserModalModule,
        NxEditPartnerUserModalModule,
        AddOrganizationModalModule,
        NxEditOrganizationModalModule,
        NxAddOrgUserModule,
        NxEditOrgUserModule,
        CloudStorageModule,
        NewFeatureInformationModalModule,
        NxUpdateSessionModalModule,
        ChangePasswordModalModule,
        UpdateCameraCredentialsModalModule,
        NxWebGlSelectTimeRangeModalModule,
        SelectTimeRangeModalModule,
        RestartServerModalModule,
        NxResetServerModalModule,
        NxDetachServerModalModule,
        NxWizardModalModule,
    ],
    declarations: [],
    providers: [],
    exports: [],
})
export class NxDialogsModule {}
