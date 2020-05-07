import { NgModule }                    from '@angular/core';
import { CommonModule }                from '@angular/common';
import { ComponentsModule }            from '../components/components.module';
import { DirectivesModule }            from '../directives/directives.module';
import { LoginModalContent }           from './login/login.component';
import { DisconnectModalContent }      from './disconnect/disconnect.component';
import { RenameModalContent }          from './rename/rename.component';
import { AddUserModalContent }         from './add-user/add-user.component';
import { RemoveUserModalContent }      from './remove-user/remove-user.component';
import { MergeModalContent }           from './merge/merge.component';
import { MessageModalContent }         from './message/message.component';
import { EmbedModalContent }           from './embed/embed.component';
import { FormsModule, EmailValidator } from '@angular/forms';
import { TranslateModule }             from '@ngx-translate/core';
import { ClipboardModule }             from 'ngx-clipboard';
import { RenameServerModalContent }    from './rename-server/rename-server.component';
import { RestartServerModalContent }   from './restart-server/restart-server.component';
import { DetachServerModalContent }    from './detach-server/detach-server.component';
import { ResetServerModalContent }     from './reset-server/reset-server.component';
import { ChangePasswordModalContent }  from './change-password/change-password.component';
import { DeleteCloudUserModalContent } from './delete-cloud-user/delete-cloud-user.component';
import { NxDialogsService }            from './';
import { RouterModule }                from '@angular/router';
import { AngularSvgIconModule }        from 'angular-svg-icon';
import {
    GenericModalContent,
    NxModalGenericComponent
}                                      from './generic/generic.component';
import {
    ApplyModalContent,
    NxModalApplyComponent
}                                      from './apply/apply.component';
import {
    CloudStorageMoveModalContent,
    CloudStorageDeleteModalContent
}                                      from './cloud-storage';
import {
    UpdateCameraCredentialsModalContent
}                                      from './update-camera-credentials/update-camera-credentials.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        ClipboardModule,
        ComponentsModule,
        DirectivesModule,
        RouterModule,
        AngularSvgIconModule.forRoot()
    ],
    declarations: [
        LoginModalContent,
        DisconnectModalContent,
        RenameModalContent,
        AddUserModalContent,
        MergeModalContent,
        MessageModalContent,
        RemoveUserModalContent,
        EmbedModalContent,
        GenericModalContent,
        ApplyModalContent,
        NxModalApplyComponent,
        RenameServerModalContent,
        RestartServerModalContent,
        DetachServerModalContent,
        ResetServerModalContent,
        ChangePasswordModalContent,
        DeleteCloudUserModalContent,
        NxModalGenericComponent,
        CloudStorageDeleteModalContent,
        CloudStorageMoveModalContent,
        UpdateCameraCredentialsModalContent
    ],
    entryComponents: [
        LoginModalContent,
        DisconnectModalContent,
        RenameModalContent,
        AddUserModalContent,
        MergeModalContent,
        MessageModalContent,
        RemoveUserModalContent,
        EmbedModalContent,
        GenericModalContent,
        ApplyModalContent,
        NxModalApplyComponent,
        RenameServerModalContent,
        RestartServerModalContent,
        DetachServerModalContent,
        ResetServerModalContent,
        ChangePasswordModalContent,
        DeleteCloudUserModalContent,
        NxModalGenericComponent,
        CloudStorageDeleteModalContent,
        CloudStorageMoveModalContent,
        UpdateCameraCredentialsModalContent
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
