import { Component, Inject, OnInit } from '@angular/core';
import { NxConfigService }           from '../../services/nx-config';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { Title }                     from '@angular/platform-browser';
import { NxAccountService }          from '../../services/account.service';

@Component({
    selector   : 'landing-component',
    templateUrl: 'landing.component.html',
    styleUrls  : ['landing.component.scss']
})

export class NxLandingComponent implements OnInit {
    private CONFIG: any = {};
    params: any;
    userEmail: any;

    private setupDefaults() {
        this.CONFIG = this.config.getConfig();
        this.title.setTitle(this.CONFIG.cloudName);
    }

    constructor(private config: NxConfigService,
                private dialogs: NxDialogsService,
                private accountService: NxAccountService,
                // @Inject('authorizationCheckService') private authorizationService: any,
                private title: Title) {

        this.setupDefaults();
    }

    ngOnInit(): void {
        // TODO: Replace this once this component is not routed by AJS
        // if (this.router.url === '/login') {
        if (window.location.pathname === '/login') {
            this.dialogs.login(this.accountService, false, false);
        } else {
            this.accountService.redirectAuthorised();
            this.userEmail = this.accountService.getEmail();
        }
    }
}

