import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-download-mobile',
    templateUrl: 'download-mobile.component.html',
    styleUrls: ['download-mobile.component.scss'],
    imports: [CommonModule, TranslateModule],
    standalone: true,
})
export class DownloadMobileComponent {
    readonly CONFIG = inject(NxConfigService).getConfig();
    readonly LANG = staticLang;
}
