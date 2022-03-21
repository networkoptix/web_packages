import {
    AfterViewInit,
    Component,
} from '@angular/core';
import {
    UntilDestroy,
} from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxSystem } from '../../services/system.service';
import { NxSettingsService } from '../systems/settings/settings.service';

@UntilDestroy()
@Component({
    selector: 'nx-monitoring',
    styleUrls: ['monitoring.component.scss'],
    templateUrl: 'monitoring.component.html',
})
export class NxMonitoringComponent implements AfterViewInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    system: NxSystem | any;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private settingsService: NxSettingsService,
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    ngAfterViewInit() {
        this.system = this.settingsService.system;
    }
}
