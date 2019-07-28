import {
    Component,
    OnInit,
    Input,
    ViewEncapsulation, Inject
}                           from '@angular/core';
import { Location }         from '@angular/common';
import { NxConfigService }  from '../../services/nx-config';
import { TranslateService } from '@ngx-translate/core';
import { NxDialogsService } from '../../dialogs/dialogs.service';

@Component({
    selector     : 'nx-client-button',
    templateUrl  : 'client-button.component.html',
    styleUrls    : ['client-button.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxClientButtonComponent implements OnInit {

    @Input() system: any;
    @Input() customClass: any;

    CONFIG: any = {};
    LANG: any = {};

    location: any;
    openClient: any;

    constructor(@Inject('process') private process: any,
                @Inject('urlProtocol') private urlProtocol: any,
                private config: NxConfigService,
                private translate: TranslateService,
                private dialogs: NxDialogsService,
                location: Location) {

        this.location = location;
    }

    ngOnInit() {
        this.CONFIG = this.config.getConfig();
        this.translate
            .getTranslation(this.translate.currentLang)
            .subscribe((lang) => {
                this.LANG = lang;
            });

        this.openClient = this.process.init(() => {
            this.urlProtocol
                .open(this.system && this.system.id)
                .then(() => {
                        },
                        () => {
                            // message, title, actionLabel, actionType
                            return this.dialogs
                                       .confirm(
                                               this.LANG.errorCodes.cantOpenClient,
                                               this.LANG.dialogs.noClientDetectedTitle,
                                               this.LANG.dialogs.download,
                                               'btn-primary',
                                               this.LANG.dialogs.cancelButton
                                       )
                                       .then((result) => {
                                           if (result) {
                                               this.location.path('/download');
                                           }
                                       });
                        });
        });
    }
}
