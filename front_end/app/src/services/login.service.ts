import { IParams } from './system.service';
import { LoginWebadminModalContent } from '../dialogs/login-webadmin/login-webadmin.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IConfig, NxConfigService } from './nx-config';
import { Location } from '@angular/common';
import { NxBootstrapProvider } from './nx-bootstrap-provider';
import { Router } from '@angular/router';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NxLoginService {
    CONFIG: IConfig;
    closeResult: string;

    constructor(configService: NxConfigService,
                private location: Location,
                private modalService: NgbModal,
                private router: Router,
                private bootstrapProvider: NxBootstrapProvider
    ) {
        this.CONFIG = configService.getConfig();
    }

    private createModal<Modal, Options extends IParams, Inputs extends IParams, Result extends any> (
        modal: Modal, options: Options, inputs: Inputs
    ): Promise<Result> {
        const modalRef = this.modalService.open(modal, options);
        Object.assign(modalRef.componentInstance, inputs);
        return modalRef.result;
    }

    login (
        keepPage?: boolean,
        redirectClose?: boolean,
        redirectHome = false,
        blockNavigation = false
    ) {
        if (this.CONFIG.browserNotSupported) {
            return;
        }

        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static',
            size: 'sm'
        };

        const params: IParams = {
            account: this,
            login: this.login,
            cancellable: !keepPage || false,
            closable: true,
            location: this.location,
            keepPage: (keepPage !== undefined) ? keepPage : true,
            redirectClose: redirectClose || false,
            redirectHome,
            blockNavigation
        };

        if (this.CONFIG.isLocal) {
            if (this.bootstrapProvider.newSystem) {
                return;
            }
            Object.assign(options, {
                centered: true,
                keyboard: false,
                backdropClass: 'webadmin-backdrop',
                windowClass: 'webadmin-window'
            });
        }

        return this.createModal(LoginWebadminModalContent, options, params)
            // handle how the dialog was closed
            // required if we need to have dismissible dialog otherwise
            // will raise a JS error ( Uncaught [in promise] )
            .then((result) => {
                this.closeResult = `Closed with: ${result}`;

                if (redirectClose && result === 'canceled') {
                    return this.router.navigate([this.CONFIG.redirect.unauthorised]);
                }
                return result;
            }, (reason) => {
                this.closeResult = 'Dismissed';
                return reason
            });
    }
}
