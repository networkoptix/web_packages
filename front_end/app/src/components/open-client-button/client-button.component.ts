import {
    Component, OnInit, Input,
    ViewEncapsulation, OnDestroy
}                                    from '@angular/core';
import { Router }                    from '@angular/router';
import { NxDialogsService }          from '../../dialogs';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import {
    NxConfigService, IConfig,
    NxUrlProtocolService, NxProcessService,
    NxLanguageProviderService
}                                    from '../../services';

@Component({
    selector     : 'nx-client-button',
    templateUrl  : 'client-button.component.html',
    styleUrls    : ['client-button.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxClientButtonComponent implements OnInit, OnDestroy {
    @Input() system: any;
    @Input() customClass: any;
    @Input() actionType: any;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    location: any;
    canceled: boolean;
    modalActive: boolean;
    openClient: any;

    constructor(configService: NxConfigService,
                private processService: NxProcessService,
                private urlProtocol: NxUrlProtocolService,
                private language: NxLanguageProviderService,
                private dialogs: NxDialogsService,
                private router: Router
    ) {
        this.location = location;
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    ngOnDestroy(): void {
        this.canceled = true;
    }

    ngOnInit() {
        this.modalActive = false;
        this.canceled = false;

        this.openClient = this.processService.createProcess(() => {
            return this.urlProtocol
                .open(this.system && this.system.id);
        }, {
            errorCodes: {
                notVisited: () => false
            }
        }).then(() => {
            this.modalActive = false;
        }, () => {
            // message, title, actionLabel, actionType
            if (this.modalActive || this.canceled) {
                return;
            }
            this.modalActive = true;
            return this.dialogs
                .confirm(
                    this.LANG.errorCodes.cantOpenClient,
                    this.LANG.dialogs.titles.noClientDetected,
                    this.LANG.dialogs.buttons.download,
                    'btn-primary',
                    this.LANG.dialogs.buttons.cancel
                )
                .then((result) => {
                    if (result) {
                        this.router
                            .navigate(['/download'])
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }).finally(() => {
                    this.modalActive = false;
                });
        });
    }
}
