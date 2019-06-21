import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location }                     from '@angular/common';
import { ActivatedRoute }               from '@angular/router';
import { DomSanitizer }                 from '@angular/platform-browser';
import { NxConfigService }              from '../../../services/nx-config';
import { NxLanguageProviderService }    from '../../../services/nx-language-provider';
import { TranslateService }             from '@ngx-translate/core';

import { map }           from 'rxjs/operators';
import { combineLatest } from 'rxjs';

@Component({
    selector   : 'nx-system-settings-component',
    templateUrl: 'settings.component.html',
    styleUrls  : ['settings.component.scss']
})

export class NxSettingsComponent implements OnInit, OnDestroy {

    plugin: any;
    config: any = {};
    content: any = {};
    lang: any = {};
    location: any;

    private setupDefaults() {
        this.config = this.configService.getConfig();
        this.language
            .translationsSubject
            .subscribe((lang) => {
                this.lang = lang;
            });


    }

    constructor(public sanitizer: DomSanitizer,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private translate: TranslateService,
                location: Location) {
        this.location = location;
        this.setupDefaults();
    }

    ngOnInit(): void {

    }

    ngOnDestroy() {

    }

}

