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

import { ComponentsModule } from '@components/components.module';
import { TransferOwnershipModalContent } from '@dialogs/transfer-ownership/transfer-ownership.component';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { AddStorageModalContent } from './add-storage/add-storage.component';
import { AddUserModalContent } from './add-user/add-user.component';
import { AddWidgetModalContent } from './add-widget/add-widget.component';
import { ApplyModalContent } from './apply/apply.component';
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
import { NxDialogsService } from './dialogs.service';
import { DisconnectModalContent } from './disconnect/disconnect.component';
import { DownloadAsyncModalContent } from './download-async/download-async.component';
import { EditModalContent } from './edit/edit.component';
import { EmbedModalContent } from './embed/embed.component';
import { GenericDialogModule } from './generic/generic.module';
import { LoginWebadminModalContent } from './login-webadmin/login-webadmin.component';
import { Mandatory2faModalContent } from './mandatory-2fa/mandatory-2fa.component';
import { MergeModalContent } from './merge/merge.component';
import { MessageModalContent } from './message/message.component';
import { MoveSystemToGroupModalContent } from './move-system-to-group/move-system-to-group.component';
import { NewFeatureInformationModalContent } from './new-feature/new-feature.component';
import { RemoveSystemModalContent } from './remove-system/remove-system.component';
import { RemoveUserModalContent } from './remove-user/remove-user.component';
import { ReserveSpaceWarningModalContent } from './reserve-space-warning/reserve-space-warning.component';
import { ResetBackupModalContent } from './reset-backup/reset-backup.component';
import { ResetServerModalContent } from './reset-server/reset-server.component';
import { RestartServerModalContent } from './restart-server/restart-server.component';
import { SelectTimeRangeModalContent } from './select-time-range-native-fallback/select-time-range.component';
import { SystemGroupSettingsModalContent } from './system-group-settings/system-group-settings.component';
import { TwoFAModalContent } from './two-fa/two-fa.component';
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
        NgxMaskModule
    ],
    declarations: [
        LoginWebadminModalContent,
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
        TwoFAModalContent,
        DownloadAsyncModalContent,
        Mandatory2faModalContent,
        AddWidgetModalContent,
        ConnectCloudModalContent,
        SelectTimeRangeModalContent,
        TransferOwnershipModalContent,
        Client2faWarningModalContent,
        ReserveSpaceWarningModalContent,
        CreateSystemGroupModalContent,
        SystemGroupSettingsModalContent,
        MoveSystemToGroupModalContent,
        NewFeatureInformationModalContent,
        CloudStorageActivateModalContent,
        CloudStorageModifyModalContent
    ],
    providers: [
        NxDialogsService,
    ],
    exports: [
        GenericDialogModule
    ]
})
export class DialogsModule {
}
