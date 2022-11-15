import {
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-confirmation-component',
    templateUrl: 'confirmation.component.html',
    styleUrls: ['confirmation.component.scss']
})
export class NxAuthorizeConfirmationComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG = staticLang;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() confirm: (route?: string) => void;

    constructor(
        configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
    }

    ngOnDestroy(): void { }
}
