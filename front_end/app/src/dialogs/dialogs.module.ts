import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { QrCodeModule } from 'ng-qrcode';
import { ClipboardModule } from 'ngx-clipboard';

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
import { CloudStorageDeleteModalContent } from './cloud-storage/delete/cloud-storage-delete.component';
import { CloudStorageMoveModalContent } from './cloud-storage/move/cloud-storage-move.component';
import { ConnectCloudModalContent } from './connect-cloud/connect-cloud.component';
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
import { RemoveSystemModalContent } from './remove-system/remove-system.component';
import { RemoveUserModalContent } from './remove-user/remove-user.component';
import { ResetBackupModalContent } from './reset-backup/reset-backup.component';
import { ResetServerModalContent } from './reset-server/reset-server.component';
import { RestartServerModalContent } from './restart-server/restart-server.component';
import { SelectTimeRangeModalContent } from './select-time-range-native-fallback/select-time-range.component';
import { TwoFAModalContent } from './two-fa/two-fa.component';
import {
    UpdateCameraCredentialsModalContent
} from './update-camera-credentials/update-camera-credentials.component';
import { WizardModalContent } from './wizard/wizard.component';
import { CreateSystemGroupModalContent } from '@dialogs/create-system-group/create-system-group.component';

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
        GenericDialogModule
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
        CreateSystemGroupModalContent
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
