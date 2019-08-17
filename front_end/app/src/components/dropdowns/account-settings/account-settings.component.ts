import { Component, OnInit } from '@angular/core';
import { Location }          from '@angular/common';
import { NxConfigService }   from '../../../services/nx-config';
import { NxAccountService }  from '../../../services/account.service';

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
                private location: Location) {
        this.config = this._config.getConfig();
        this.show = false;
    }

    ngOnInit(): void {
        this.accountService
            .checkLoginState()
            .then(() => {
                this.accountService
                    .get()
                    .then(result => {
                        if (result) {
                            this.settings.email = result.email;
                            this.settings.is_staff = result.is_staff;
                            this.settings.is_superuser = result.is_superuser;
                        }
                    });
            })
            .catch(() => {});
    }

    logout(): void {
        const url = this.location.path();
        const stay = url.startsWith('/systems') ||
                     url.startsWith('/account') ||
                     url.startsWith('/download') && !(this.config.publicDownloads || this.config.publicReleases);
        this.accountService.logout(!stay);
    }
}
