import {
    Component, EventEmitter, Input, OnDestroy,
    OnInit, Output
}                       from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process }                   from '@services/process.service';
import { combineLatest, Observable } from 'rxjs';
import { map }                       from 'rxjs/operators';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { AuthorizeState }            from '../authorize.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-activate-account-component',
    templateUrl : 'activate-account.component.html',
    styleUrls   : ['activate-account.component.scss']
})

export class NxAuthorizeActivateAccountComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() loginEmail: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeState>();
    @Input() checkActivationProcess: Process;
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
            return NxLanguageProviderService.translate(activated
                ? fromEmail && this.LANG.authorize.activatedAdditional || (() => '')
                : this.LANG.authorize.createdAdditional);
        }));
    }

    login() {
        this.setCurrentState.emit(AuthorizeState.email);
    }

    ngOnDestroy(): void {}
}
