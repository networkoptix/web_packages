import { Component, OnInit } from '@angular/core';
import { Location }          from '@angular/common';
import { pipe } from 'rxjs';
import { filter } from 'rxjs/operators';
import { NxConfigService }   from '../../../services/nx-config';
import { NxAccountService }  from '../../../services/account.service';
import { NxSessionService }  from '../../../services/session.service';

@Component({
    selector: 'nx-account-settings-select',
    templateUrl: 'account-settings.component.html',
    styleUrls: ['account-settings.component.scss']
})

export class NxAccountSettingsDropdown implements OnInit {
    config: any;
    settings = {
        email: '',
        is_staff: false,
        is_superuser: false
    };
    show: boolean;

    constructor(private accountService: NxAccountService,
                private _config: NxConfigService,
                private sessionService: NxSessionService,
                private location: Location) {
        this.config = this._config.getConfig();
        this.show = false;
    }

    ngOnInit(): void {
        this.accountService
            .checkLoginState()
            .then(() => {
                this.getAccount();
            })
            .catch(() => {});

        this.sessionService.loginStateSubject.pipe(
            filter((state) => {
                return typeof state === 'string';
            })
        ).subscribe((state) => {
            this.getAccount();
        });
    }

    getAccount() {
        this.accountService
            .get()
            .then(account => {
                if (account) {
                    this.settings.email = account.email;
                    this.settings.is_staff = account.is_staff;
                    this.settings.is_superuser = account.is_superuser;
                }
            });
    }

    logout(): void {
        const url = this.location.path();
        const stay = url.startsWith('/systems') ||
                     url.startsWith('/account') ||
                     url.startsWith('/download') && !(this.config.publicDownloads || this.config.publicReleases);
        this.accountService.logout(!stay);
    }
}
