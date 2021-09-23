import { NgModule }                    from '@angular/core';
import { NgbModule }                   from '@ng-bootstrap/ng-bootstrap';
import { CommonModule }                from '@angular/common';
import {
    FormsModule, ReactiveFormsModule
}                                      from '@angular/forms';
import { RouterModule }                from '@angular/router';
import { TranslateModule }             from '@ngx-translate/core';
import { ClipboardModule }             from 'ngx-clipboard';
import { AngularSvgIconModule }        from 'angular-svg-icon';

import { ComponentsModule }            from '@components/components.module';
import { DirectivesModule }            from '@directives/directives.module';
import { PipesModule }                 from '@src/pipes/pipes.module';
import { LoginModalContent }           from './login/login.component';
import { DisconnectModalContent }      from './disconnect/disconnect.component';
import { AddUserModalContent }         from './add-user/add-user.component';
import { AddStorageModalContent }      from './add-storage/add-storage.component';
import { ChangeStorageModalContent }   from './change-storage/change-storage.component';
import { RemoveUserModalContent }      from './remove-user/remove-user.component';
import { MergeModalContent }           from './merge/merge.component';
import { MessageModalContent }         from './message/message.component';
import { EmbedModalContent }           from './embed/embed.component';
import { RestartServerModalContent }   from './restart-server/restart-server.component';
import { DetachServerModalContent }    from './detach-server/detach-server.component';
import { ResetServerModalContent }     from './reset-server/reset-server.component';
import { ChangePasswordModalContent }  from './change-password/change-password.component';
import { WizardModalContent }          from './wizard/wizard.component';
import { DeleteCloudUserModalContent } from './delete-cloud-user/delete-cloud-user.component';
import {
    GenericModalContent,
    NxModalGenericComponent
}                                         from './generic/generic.component';
import {
    ApplyModalContent,
    NxModalApplyComponent
}                                         from './apply/apply.component';
import {
    UpdateCameraCredentialsModalContent
}                                         from './update-camera-credentials/update-camera-credentials.component';
import { CloudStorageMoveModalContent }   from './cloud-storage/move/cloud-storage-move.component';
import { CloudStorageDeleteModalContent } from './cloud-storage/delete/cloud-storage-delete.component';
import { LoginWebadminModalContent }      from './login-webadmin/login-webadmin.component';
import { ResetBackupModalContent }        from './reset-backup/reset-backup.component';
import { RemoveSystemModalContent }       from './remove-system/remove-system.component';
import { EditModalContent }               from './edit/edit.component';
import { TwoFAModalContent }              from './two-fa/two-fa.component';
import { DownloadAsyncModalContent }      from './download-async/download-async.component';
import { NxDialogsService }               from './dialogs.service';
import { QrCodeModule } from 'ng-qrcode';

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
        NgbModule,
        AngularSvgIconModule.forRoot(),
        PipesModule,
        QrCodeModule
    ],
    declarations: [
        LoginModalContent,
        LoginWebadminModalContent,
        DisconnectModalContent,
        AddUserModalContent,
        AddStorageModalContent,
        ChangeStorageModalContent,
        MergeModalContent,
        MessageModalContent,
        RemoveUserModalContent,
        EmbedModalContent,
        GenericModalContent,
        ApplyModalContent,
        NxModalApplyComponent,
        RestartServerModalContent,
        DetachServerModalContent,
        ResetServerModalContent,
        ChangePasswordModalContent,
        WizardModalContent,
        DeleteCloudUserModalContent,
        NxModalGenericComponent,
        CloudStorageDeleteModalContent,
        CloudStorageMoveModalContent,
        UpdateCameraCredentialsModalContent,
        ResetBackupModalContent,
        AddStorageModalContent,
        RemoveSystemModalContent,
        EditModalContent,
        TwoFAModalContent,
        DownloadAsyncModalContent
    ],
    providers: [
        NxDialogsService,
        NxModalGenericComponent,
        NxModalApplyComponent
    ],
    exports: []
})
export class DialogsModule {
}
