import { NgModule }     from '@angular/core';
import { CommonModule } from '@angular/common';

import { ComponentsModule } from '../components/components.module';
import { DirectivesModule } from '../directives/directives.module';
import { LoginModalContent }                            from './login/login.component';
import { DisconnectModalContent }                       from './disconnect/disconnect.component';
import { RenameModalContent }                           from './rename/rename.component';
import { AddUserModalContent } from './add-user/add-user.component';
import { RemoveUserModalContent } from './remove-user/remove-user.component';
import { MergeModalContent }                            from './merge/merge.component';
import { MessageModalContent }                          from './message/message.component';
import { EmbedModalContent }                            from './embed/embed.component';
import { downgradeInjectable }                          from '@angular/upgrade/static';
import { FormsModule, EmailValidator }                  from '@angular/forms';
import { TranslateModule }                              from '@ngx-translate/core';
import { ClipboardModule }                              from 'ngx-clipboard';
import { RenameServerModalContent }                     from './rename-server/rename-server.component';
import { RestartServerModalContent }                    from './restart-server/restart-server.component';
import { DetachServerModalContent }                     from './detach-server/detach-server.component';
import { ResetServerModalContent }                      from './reset-server/reset-server.component';

import { GenericModalContent, NxModalGenericComponent } from './generic/generic.component';
import { NxDialogsService }                             from './dialogs.service';
import { ApplyModalContent, NxModalApplyComponent }     from './apply/apply.component';
import { RouterModule }                                 from '@angular/router';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        ClipboardModule,
        ComponentsModule,
        DirectivesModule,
        RouterModule,
    ],
    declarations   : [
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
        NxModalGenericComponent,
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
        NxModalGenericComponent,
    ],
    providers      : [
        NxDialogsService,
        NxModalGenericComponent,
        NxModalApplyComponent,
    ],
    exports        : []
})
export class DialogsModule {
}

declare var angular: angular.IAngularStatic;
angular
    .module('cloudApp.services')
    .service('nxDialogsService', downgradeInjectable(NxDialogsService));

