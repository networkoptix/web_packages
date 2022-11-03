import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import type { Content } from '@app/menu/menu.types';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { ServerDocumentationSettings } from '@services/system-api.types';
import { NxSystemService } from '@services/system.service/system.service';

@UntilDestroy()
@Component({
    selector: 'nx-server-documentation-component',
    templateUrl: 'server-documentation.component.html',
    styleUrls: ['server-documentation.component.scss']
})

export class NxServerDocumentationComponent {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    content: Content;
    serverDocumentation: ServerDocumentationSettings[];
    accessibleAt: string;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        settingsService: NxSettingsService,
        accountService: NxAccountService,
        systemService: NxSystemService,
        router: Router
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
        this.accessibleAt = this.LANG.serverDocumentation.accessibleAt({ windowsPath: this.CONFIG.serverDocumentation.windowsPath, defaultPath: this.CONFIG.serverDocumentation.defaultPath });
        if (!settingsService.system?.mediaserver) {
            accountService.get().then(async account => {
                if (!account) {
                    router.navigate(['/']);
                }
                const localSystem = systemService.createLocalSystem(accountService.mediaServerApi, account.id, account.email);
                await localSystem.update().catch(() => {});
                localSystem.mediaserver.getSettingsDocumentation().then(
                    settings => {
                        this.serverDocumentation = settings.reply.settings;
                    });
            });
        } else {
            systemService.getCurrentSystem().mediaserver.getSettingsDocumentation().then(
                settings => {
                    this.serverDocumentation = settings.reply.settings;
                });
        }
    }
}
