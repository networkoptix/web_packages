import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { QrCodeModule } from 'ng-qrcode';
import { ClipboardModule } from 'ngx-clipboard';
import { NgxMaskModule } from 'ngx-mask';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { PipesModule } from '@app/pipes/pipes.module';
import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { SearchableModule } from '@components/dropdowns/searchable/searchable.module';
import { DynamicWidgetModule } from '@components/dynamic-widget/dynamic-widget.module';
import { InfoBlockModule } from '@components/info-block/info-block.module';
import { LoginWebadminModule } from '@components/login-webadmin/login-webadmin.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';
import { RadioModule } from '@components/radio/radio.module';
import { TagModule } from '@components/tag/tag.module';
import { ThirdsPartyWidgetModule } from '@components/widgets/third-party/third-party-widget.module';
import { DirectivesModule } from '@directives/directives.module';

import { AddStorageModalContent } from './add-storage/add-storage.component';
import { AddUserModalModule } from './add-user/add-user.module';
import { AddWidgetModalContent } from './add-widget/add-widget.component';
import { ApplyModalModule } from './apply/apply.module';
import { NxBookmarksCardModalModule } from './bookmarks/card-modal/bookmarks-card-modal.module';
import { NxBookmarkDownloadModule } from './bookmarks/download-modal/bookmark-download.module';
import { NxMoreDevicesModule } from './bookmarks/more-devices/more-devices.module';
import { NxMoreTagsModule } from './bookmarks/more-tags/more-tags.module';
import { ChangePasswordModalModule } from './change-password/change-password.module';
import { ChangeStorageModalContent } from './change-storage/change-storage.component';
import { NxAddOrgUserModule } from './channel-partners/add-org-user/add-org-user.module';
import { AddOrganizationModalModule } from './channel-partners/add-organization/add-organization.module';
import { AddPartnerUserModalModule } from './channel-partners/add-partner-user/add-partner-user.module';
import { AddPartnerModalModule } from './channel-partners/add-partner/add-partner.module';
import { NxEditOrgUserModule } from './channel-partners/edit-org-user/edit-org-user.module';
import { NxEditOrganizationModalModule } from './channel-partners/edit-organization/edit-organization.module';
import { NxEditPartnerUserModalModule } from './channel-partners/edit-partner-user/edit-partner-user.module';
import { NxEditPartnerModalModule } from './channel-partners/edit-partner/edit-partner.module';
import { Client2faWarningModalModule } from './client-2fa-warning/client-2fa-warning.module';
import { CloudStorageModule } from './cloud-storage/cloud-storage.module';
import { ConnectCloudModalModule } from './connect-cloud/connect-cloud.module';
import { CreateSystemGroupModalModule } from './create-system-group/create-system-group.module';
import { DeleteCloudUserModalModule } from './delete-cloud-user/delete-cloud-user.module';
import { DetachServerModalContent } from './detach-server/detach-server.component';
import { DisconnectModalModule } from './disconnect/disconnect.module';
import { EditModalContent } from './edit/edit.component';
import { GenericDialogModule } from './generic/generic.module';
import { Mandatory2faModalModule } from './mandatory-2fa/mandatory-2fa.module';
import { MergeModalContent } from './merge/merge.component';
import { NxMergeModule } from './merge/merge.refactor.module';
import { MessageModalModule } from './message/message.module';
import { NewFeatureInformationModalModule } from './new-feature/new-feature.module';
import { RemoveSystemModalModule } from './remove-system/remove-system.module';
import { RemoveUserModalModule } from './remove-user/remove-user.module';
import { ReserveSpaceWarningModalContent } from './reserve-space-warning/reserve-space-warning.component';
import { ResetBackupModalContent } from './reset-backup/reset-backup.component';
import { ResetServerModalContent } from './reset-server/reset-server.component';
import { RestartServerModalContent } from './restart-server/restart-server.component';
import { SelectTimeRangeModalModule } from './select-time-range-native-fallback/select-time-range.module';
import { TransferOwnershipModule } from './transfer-ownership/transfer-ownership.module';
import { TwoFAModalModule } from './two-fa/two-fa.module';
import { UpdateCameraCredentialsModalModule } from './update-camera-credentials/update-camera-credentials.module';
import { NxUpdateSessionModalModule } from './update-session/update-session.module';
import { NxWebGlSelectTimeRangeModalModule } from './webgl-select-time-range/select-time-range.module';
import { WizardModalContent } from './wizard/wizard.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        ClipboardModule,
        NgxTranslateCutModule,
        NgxMaskModule.forRoot(),
        QrCodeModule,
        AlertBlockModule,
        CheckboxModule,
        DirectivesModule,
        DynamicWidgetModule,
        GenericDialogModule,
        InfoBlockModule,
        NxGenericDropdownModule,
        PipesModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
        RadioModule,
        SearchableModule,
        TagModule,
        ThirdsPartyWidgetModule,

        LoginWebadminModule,
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
        SelectTimeRangeModalModule
    ],
    declarations: [
        AddStorageModalContent,
        ChangeStorageModalContent,
        MergeModalContent,
        RestartServerModalContent,
        DetachServerModalContent,
        ResetServerModalContent,
        WizardModalContent,
        ResetBackupModalContent,
        AddStorageModalContent,
        EditModalContent,
        AddWidgetModalContent,
        ReserveSpaceWarningModalContent,
    ],
    providers: [],
    exports: [
        GenericDialogModule,
        DynamicWidgetModule
    ]
})
export class DialogsModule {
}
