import {
    Component, OnInit, Input, Renderer2, ViewChild, OnDestroy, AfterViewInit
} from '@angular/core';
import { Location }                              from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService }                       from '../../services/nx-config/nx-config.service';
import { NxLanguageProviderService }             from '../../services/nx-language-provider';
import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { IConfig } from '../../services/nx-config/config-types';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector   : 'nx-modal-embed-content',
    templateUrl: 'embed.component.html',
    styleUrls  : []
})
export class EmbedModalContent implements OnInit, OnDestroy, AfterViewInit {
    @Input() systemId;
    @Input() disconnect;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    auth: any;
    params: any;
    embedUrl: string;
    private formChangesSubscription: Subscription;

    @ViewChild('embedForm', { static: true }) embedForm;

    constructor(private activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private location: Location,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                /* @Inject(DOCUMENT) private document: Document */
    ) {
        this.params = {
            authString: '',
            nocameras : false,
            noheader  : false,
            nocontrols: false,
        };

        this.auth = {
            email   : '',
            password: ''
        };

        this.CONFIG = configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    ngOnDestroy() {}

    ngOnInit() {
        this.createEmbedUrl(this.params);
    }

    ngAfterViewInit() {
        this.formChangesSubscription = this.embedForm.form.valueChanges.subscribe((changes) => {
            this.createEmbedUrl(changes);
        });
    }

    createEmbedUrl(params): void {
        // Cannot use A6 router at this moment - AJS is leading the parade
        const url = window.location.href.replace('systems', 'embed').split('?')[ 0 ];
        let uri = '';

        for (const paramsKey in params) {
            if (params.hasOwnProperty(paramsKey)) {
                // filter checkboxes in form
                if (this.params[ paramsKey ] !== undefined && !params[ paramsKey ]) {
                    uri += (uri === '') ? '?' : '&';
                    uri += (typeof params[ paramsKey ] === 'boolean') ? paramsKey : params[ paramsKey ];
                }
            }
        }

        uri += (uri === '') ? '?' : '&';
        uri += 'auth=' + btoa(params.login_email + ':' + params.login_password);

        // HTML tags are needed for copy to clipboard functionality
        this.embedUrl = '<iframe ' +
                            'src = "' + url + uri + '" >' +
                            'Your browser doesn\'t support iframe.' +
                        '</iframe>';
    }

    close() {
        this.activeModal.close();
    }
}
