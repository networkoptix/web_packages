import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { combineLatest, Observable, interval } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service/process';

import type { AuthorizeStateType } from '../authorize.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-activate-account-component',
    templateUrl: 'activate-account.component.html',
    styleUrls: ['activate-account.component.scss']
})

export class NxAuthorizeActivateAccountComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();
    @Input() checkActivationProcess: Process;
    @Input() checkIfActivated: () => void;
    @Input() loginProcess: Process;
    @Input() activated$: Observable<boolean>;
    @Input() fromEmail$: Observable<boolean>;

    contentHeader$: Observable<string>;
    contentMessage$: Observable<string>;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.contentHeader$ = this.activated$.pipe(map((activated: boolean) => {
            return activated
                ? this.LANG.authorize.activatedText()
                : this.LANG.authorize.createdText();
        }));
        this.contentMessage$ = combineLatest([this.activated$, this.fromEmail$]).pipe(map(([activated, fromEmail]) => {
            const params = { accountEmail: this.loginEmail || '' };
            if (activated) {
                return fromEmail
                    ? this.LANG.authorize.activatedAdditional(params)
                    : '';
            } else {
                return this.LANG.authorize.createdAdditional(params);
            }
        }));

        // automatically checks if activated every 5 seconds
        interval(5000)
            .pipe(takeUntil(this.activated$.pipe(filter(activated => activated === true))))
            .subscribe(this.checkIfActivated);
    }

    ngOnDestroy(): void { }
}
