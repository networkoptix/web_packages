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
import { ComponentsModule } from '@components/components.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { SearchableModule } from '@components/dropdowns/searchable/searchable.module';
import { DynamicWidgetModule } from '@components/dynamic-widget/dynamic-widget.module';
import { InfoBlockModule } from '@components/info-block/info-block.module';
import { LoginWebadminModule } from '@components/login-webadmin/login-webadmin.module';
import { TagModule } from '@components/tag/tag.module';
import { ThirdsPartyWidgetModule } from '@components/widgets/third-party/third-party-widget.module';
import { DirectivesModule } from '@directives/directives.module';

import { AddPartnerBrandModalModule } from './add-brand/add-brand.module';
import { AddCustomizationUserModalModule } from './add-customization-user/add-customization-user.module';
import { NxAddOrgUserModule } from './add-org-user/add-org-user.module';
import { AddPartnerModalModule } from './add-partner/add-partner.module';
import { AddStorageModalContent } from './add-storage/add-storage.component';
import { AddUserModalModule } from './add-user/add-user.module';
import { AddWidgetModalContent } from './add-widget/add-widget.component';
import { ApplyModalModule } from './apply/apply.module';
import { NxBookmarksCardModalModule } from './bookmarks/card-modal/bookmarks-card-modal.module';
import { NxMoreDevicesModule } from './bookmarks/more-devices/more-devices.module';
import { NxMoreTagsModule } from './bookmarks/more-tags/more-tags.module';
import { ChangePasswordModalModule } from './change-password/change-password.module';
import { ChangeStorageModalContent } from './change-storage/change-storage.component';
import { Client2faWarningModalModule } from './client-2fa-warning/client-2fa-warning.module';
import { CloudStorageModule } from './cloud-storage/cloud-storage.module';
import { ConnectCloudModalModule } from './connect-cloud/connect-cloud.module';
import { CreateSystemGroupModalModule } from './create-system-group/create-system-group.module';
import { DeleteCloudUserModalModule } from './delete-cloud-user/delete-cloud-user.module';
import { DetachServerModalContent } from './detach-server/detach-server.component';
import { DisconnectModalModule } from './disconnect/disconnect.module';
import { NxEditOrgUserModule } from './edit-org-user/edit-org-user.module';
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
import { SelectTimeRangeModalContent } from './select-time-range-native-fallback/select-time-range.component';
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
        TranslateModule,
        ClipboardModule,
        ComponentsModule,
        DirectivesModule,
        RouterModule,
        AngularSvgIconModule.forRoot(),
        PipesModule,
        QrCodeModule,
        GenericDialogModule,
        NgxTranslateCutModule,
        NgxMaskModule.forRoot(),
        DynamicWidgetModule,
        InfoBlockModule,
        SearchableModule,
        AlertBlockModule,
        DynamicWidgetModule,
        TagModule,
        ThirdsPartyWidgetModule,

        LoginWebadminModule,
        TransferOwnershipModule,
        NxMergeModule,
        NxMoreDevicesModule,
        NxMoreTagsModule,
        NxBookmarksCardModalModule,
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
        AddPartnerBrandModalModule,
        AddCustomizationUserModalModule,
        AddPartnerModalModule,
        CloudStorageModule,
        NewFeatureInformationModalModule,
        NxAddOrgUserModule,
        NxEditOrgUserModule,
        NxUpdateSessionModalModule,
        ChangePasswordModalModule,
        UpdateCameraCredentialsModalModule,
        NxWebGlSelectTimeRangeModalModule,
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
        SelectTimeRangeModalContent,
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
