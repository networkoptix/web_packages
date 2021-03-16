import {
    Component, EventEmitter, Input, OnDestroy,
    OnInit, Output, ViewChild, OnChanges, SimpleChanges
}                       from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process }                   from '@services/process.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-connect-error-component',
    templateUrl : 'connect-error.component.html',
    styleUrls   : ['connect-error.component.scss']
})
export class NxAuthorizeConnectErrorComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() processTryAgain: Process;

    additionalText: string;
    templateText: {
        [clientType: string]: {
            additionalText: string
        }
    }

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.setupText();
        this.setText();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (!changes.clientType.firstChange) {
            this.setText();
        }
    }

    setupText() {
        const auth = this.LANG.authorize;
        this.templateText = {
            loginToCloud: {
                additionalText: auth.loginErrorAdditional()
            },
            connectSystemToCloud: {
                additionalText: auth.connectErrorAdditional()
            },
            setupWizard: {
                additionalText: auth.setupErrorAdditional()
            },
            loginToWebadmin: {
                additionalText: auth.loginErrorAdditional()
            }
        };

    }
    
    setText() {
        this.additionalText = this.templateText[this.clientType]?.additionalText;
    }

    setupNonCloudSystem() {
        // future TO-DO
    }

    ngOnDestroy(): void {}
}
