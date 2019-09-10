import {
    Component,
    OnInit,
    Input,
    ViewEncapsulation, Inject
}                                    from '@angular/core';
import { Location }                  from '@angular/common';
import { NxConfigService }           from '../../services/nx-config';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { NxUrlProtocolService }      from '../../services/url-protocol.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';

@Component({
    selector     : 'nx-client-button',
    templateUrl  : 'client-button.component.html',
    styleUrls    : ['client-button.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxClientButtonComponent implements OnInit {

    @Input() system: any;
    @Input() customClass: any;
    @Input() actionType: any;

    CONFIG: any = {};
    LANG: any = {};

    location: any;
    openClient: any;

    constructor(private processService: NxProcessService,
                private urlProtocol: NxUrlProtocolService,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private dialogs: NxDialogsService,
                location: Location) {

        this.location = location;
    }

    ngOnInit() {
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();

        this.openClient = this.processService.createProcess(() => {
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
