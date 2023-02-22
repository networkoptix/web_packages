import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import type { Content } from '@app/menu/menu.types';
import staticLang from '@common/language/language_i18n_static.json';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { Translatable } from '@pipes/nx-translate.types';
import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { ServerDocumentationSettings } from '@services/system-api.types';
import { NxSystemService } from '@services/system.service/system.service';

@UntilDestroy()
@Component({
    selector: 'nx-server-documentation-component',
    templateUrl: 'server-documentation.component.html',
    styleUrls: ['server-documentation.component.scss'],
})

export class NxServerDocumentationComponent {
    CONFIG: IConfig;
    LANG = staticLang;
    content: Content;
    serverDocumentation: ServerDocumentationSettings[];
    accessibleAt: Translatable;

    constructor(
        configService: NxConfigService,
        settingsService: NxSettingsService,
        accountService: NxAccountService,
        systemService: NxSystemService,
        router: Router
    ) {
        this.CONFIG = configService.getConfig();
        this.accessibleAt = {
            value: this.LANG.serverDocumentation.accessibleAt,
            params: {
                windowsPath: this.CONFIG.serverDocumentation.windowsPath,
                defaultPath: this.CONFIG.serverDocumentation.defaultPath
            }
        };
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
