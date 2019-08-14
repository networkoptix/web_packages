import { Component, OnInit, Inject } from '@angular/core';
import { Location }                  from '@angular/common';
import { NxConfigService }           from '../../../services/nx-config';

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

    constructor(@Inject('account') private account: any,
                private _config: NxConfigService,
                private location: Location) {
        this.config = this._config.getConfig();
        this.show = false;
    }

    ngOnInit(): void {
        this.account
            .checkLoginState()
            .then(() => {
                this.account
                    .get()
                    .then(result => {
                        this.settings.email = result.email;
                        this.settings.is_staff = result.is_staff;
                        this.settings.is_superuser = result.is_superuser;
                    });
            });
    }

    logout(): void {
        const url = this.location.path();
        const stay = url.startsWith('/systems') ||
                     url.startsWith('/account') ||
                     url.startsWith('/download') && !(this.config.publicDownloads || this.config.publicReleases);
        this.account.logout(!stay);
    }
}
