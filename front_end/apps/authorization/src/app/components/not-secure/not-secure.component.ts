import {
    Component,
    EventEmitter,
    Input,
    Output
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { htmlToEntity } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';

@Component({
    selector: 'nx-authorize-not-secure-component',
    templateUrl: 'not-secure.component.html',
    styleUrls: ['not-secure.component.scss']
})

export class NxAuthorizeNotSecureComponent {
    CONFIG: IConfig;
    LANG = staticLang;
    readonly environment = environment;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() redirectUrl: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    constructor(
        configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnChanges(changes: NgChanges<NxAuthorizeNotSecureComponent>): void {
        if (changes.redirectUrl?.currentValue) {
            this.redirectUrl = htmlToEntity(this.redirectUrl);
        }
    }

    next(): void {
        this.setCurrentState.emit(this.loginEmail ? 'password' : 'email');
    }
}
