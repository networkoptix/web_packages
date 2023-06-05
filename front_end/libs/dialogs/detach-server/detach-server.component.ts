import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { DetachServer as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { servers, toast } from '@lib/variables/static-variables';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';

import { NxToastService } from '../toast.service';

@Component({
    selector: 'nx-modal-detach-server-content',
    templateUrl: 'detach-server.component.html',
    styleUrls: [],
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
        @Inject(WINDOW) private window: Window,
    ) {
        super(dialogRef);

        this.system = system;
        this.serverName = server.name;

        this.detachServer = this.processService
            .createProcess(
                () => this.system.serverManager.detachFromSystem(
                    server.id,
                    this.password
                ).toPromise(),
                { ignoreError: true },
                () => {
                    this.close(true);
                    this.toastService.notify(
                        this.LANG.servers.detachSystemSuccess,
                        toast.success,
                    );
                    this.window.location.reload();
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
                            toast.warning,
                        );
                    } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                        return this.dialogs.expiredSession().then(() => this.window.location.reload());
                    } else {
                        this.close();
                        this.toastService.notify(
                            this.LANG.servers.detachSystemFailed,
                            toast.warning,
                        );
                    }
                }
            );
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.passwordInput?.nativeElement.focus();
        });
    }
}
