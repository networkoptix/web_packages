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

import { AddStorageModalContent } from './add-storage/add-storage.component';
import { AddUserModalContent } from './add-user/add-user.component';
import { AddWidgetModalContent } from './add-widget/add-widget.component';
import { ApplyModalContent } from './apply/apply.component';
import { NxMoreDevicesModule } from './bookmarks/more-devices/more-devices.module';
import { NxMoreTagsModule } from './bookmarks/more-tags/more-tags.module';
import { ChangePasswordModalContent } from './change-password/change-password.component';
import { ChangeStorageModalContent } from './change-storage/change-storage.component';
import { Client2faWarningModalContent } from './client-2fa-warning/client-2fa-warning.component';
import { CloudStorageActivateModalContent } from './cloud-storage/activate/cloud-storage-activate.component';
import { CloudStorageDeleteModalContent } from './cloud-storage/delete/cloud-storage-delete.component';
import { CloudStorageModifyModalContent } from './cloud-storage/modify/cloud-storage-modify.component';
import { CloudStorageMoveModalContent } from './cloud-storage/move/cloud-storage-move.component';
import { ConnectCloudModalContent } from './connect-cloud/connect-cloud.component';
import { CreateSystemGroupModalContent } from './create-system-group/create-system-group.component';
import { DeleteCloudUserModalContent } from './delete-cloud-user/delete-cloud-user.component';
import { DetachServerModalContent } from './detach-server/detach-server.component';
import { DisconnectModalContent } from './disconnect/disconnect.component';
import { DownloadAsyncModalContent } from './download-async/download-async.component';
import { EditModalContent } from './edit/edit.component';
import { EmbedModalContent } from './embed/embed.component';
import { GenericDialogModule } from './generic/generic.module';
import { Mandatory2faModalContent } from './mandatory-2fa/mandatory-2fa.component';
import { MergeModalContent } from './merge/merge.component';
import { MessageModalContent } from './message/message.component';
import { NewFeatureInformationModalContent } from './new-feature/new-feature.component';
import { RefreshSessionModalContent } from './refresh-session/refresh-session';
import { RemoveSystemModalContent } from './remove-system/remove-system.component';
import { RemoveUserModalContent } from './remove-user/remove-user.component';
import { ReserveSpaceWarningModalContent } from './reserve-space-warning/reserve-space-warning.component';
import { ResetBackupModalContent } from './reset-backup/reset-backup.component';
import { ResetServerModalContent } from './reset-server/reset-server.component';
import { RestartServerModalContent } from './restart-server/restart-server.component';
import { SelectTimeRangeModalContent } from './select-time-range-native-fallback/select-time-range.component';
import { TransferOwnershipModule } from './transfer-ownership/transfer-ownership.module';
import { TwoFAModalModule } from './two-fa/two-fa.module';
import {
    UpdateCameraCredentialsModalContent
} from './update-camera-credentials/update-camera-credentials.component';
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
        NxMoreDevicesModule,
        NxMoreTagsModule,
        TwoFAModalModule,
    ],
    declarations: [
        DisconnectModalContent,
        AddUserModalContent,
        AddStorageModalContent,
        ChangeStorageModalContent,
        MergeModalContent,
        MessageModalContent,
        RemoveUserModalContent,
        EmbedModalContent,
        ApplyModalContent,
        RestartServerModalContent,
        DetachServerModalContent,
        ResetServerModalContent,
        ChangePasswordModalContent,
        WizardModalContent,
        DeleteCloudUserModalContent,
        CloudStorageDeleteModalContent,
        CloudStorageMoveModalContent,
        UpdateCameraCredentialsModalContent,
        ResetBackupModalContent,
        AddStorageModalContent,
        RemoveSystemModalContent,
        EditModalContent,
        DownloadAsyncModalContent,
        Mandatory2faModalContent,
        AddWidgetModalContent,
        ConnectCloudModalContent,
        SelectTimeRangeModalContent,
        Client2faWarningModalContent,
        ReserveSpaceWarningModalContent,
        CreateSystemGroupModalContent,
        NewFeatureInformationModalContent,
        CloudStorageActivateModalContent,
        CloudStorageModifyModalContent,
        RefreshSessionModalContent
    ],
    providers: [],
    exports: [
        GenericDialogModule,
        DynamicWidgetModule
    ]
})
export class DialogsModule {
}
