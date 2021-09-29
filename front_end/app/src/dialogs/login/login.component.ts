import { Component, Inject, Input }  from '@angular/core';
import { Location }                  from '@angular/common';
import { Router }                    from '@angular/router';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { WINDOW }                    from '@services/window-provider';

@Component({
    selector    : 'ngbd-modal-content',
    templateUrl : 'login.component.html',
    styleUrls   : []
})
export class LoginModalContent {
    @Input() cancellable;
    @Input() closable;
    @Input() keepPage;
    @Input() redirectHome;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    locationService: Location;

    constructor(
        configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        locationService: Location,
        private router: Router,
        public activeModal: NgbActiveModal,
        @Inject(WINDOW) protected window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.translations;
        this.locationService = locationService;
    }

    redirectToAuthorize(): void {
        this.activeModal.close();
        this.router.navigate(
            ['authorize'],
            { queryParams: { redirect_url: this.window.location.origin + this.locationService.path() } }
        );
    }

    close() {
        // prevent unnecessary reload
        this.activeModal.close('canceled');
        if (!this.keepPage) {
            return this.router.navigate([this.CONFIG.redirect.unauthorised]);
        }
    }
}
