import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service';

import { AuthorizeStateType } from '../authorize.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-connect-error-component',
    templateUrl: 'connect-error.component.html',
    styleUrls: ['connect-error.component.scss']
})
export class NxAuthorizeConnectErrorComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() clientType: string;
    @Input() errorType: string;
    @Input() processTryAgain: Process;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
    }

    setupNonCloudSystem() {
        // future TO-DO
    }
}
