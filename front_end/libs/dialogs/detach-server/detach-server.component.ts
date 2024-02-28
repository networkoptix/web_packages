import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { DetachServer as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { NxToastService } from '@services/toast.service';
import { servers } from '@static-variables';

@Component({
    selector: 'nx-modal-detach-server-content',
    templateUrl: 'detach-server.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        PipesModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class DetachServerModalContent extends ModalBase<DT['return']> implements AfterViewInit {
    @ViewChild('passwordInput') private passwordInput: ElementRef<HTMLInputElement>;

    LANG = staticLang;

    system: NxSystem;
    serverName: string;
    detachServer: Process;
    password: string;

    constructor(
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { system, server }: DT['data'],
    ) {
        super(dialogRef);

        this.system = system;
        this.serverName = server.name;

        this.detachServer = this.processService.createProcess(
            () =>
                firstValueFrom(
                    this.system.serverManager.detachFromSystem(server.id, this.password),
                ),
            { ignoreError: true },
            () => {
                this.close(true);
                this.toastService.notify(this.LANG.servers.detachSystemSuccess, ToastType.Success);
                window.location.reload();
                // may need to remove & update system eventually
                // const anotherServerId = this.system.servers.find(server => server.id !== this.serverId).id;
                // return this.system.serverManager.removeMediaserver(anotherServerId, this.serverId).toPromise();
                // return this.system.update().subscribe()
            },
            err => {
                this.unlock();
                if (err.errorId === servers.errors.oldSessionErrorId) {
                    this.toastService.notify(
                        this.LANG.dialogs.updateSession.detachServer,
                        ToastType.Warning,
                    );
                } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                    return this.dialogs.expiredSession().then(() => window.location.reload());
                } else {
                    this.close();
                    this.toastService.notify(
                        this.LANG.servers.detachSystemFailed,
                        ToastType.Warning,
                    );
                }
            },
        );
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.passwordInput?.nativeElement.focus();
        });
    }
}
