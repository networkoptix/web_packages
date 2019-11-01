import {
    Component, Inject, OnInit, Input,
    ViewEncapsulation, Renderer2,
    ChangeDetectorRef, ViewChild
}                                                from '@angular/core';
import { Location }                              from '@angular/common';
import { NgbModal, NgbActiveModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService }                       from '../../services/nx-config';
import { NxLanguageProviderService }             from '../../services/nx-language-provider';

@Component({
    selector   : 'nx-modal-embed-content',
    templateUrl: 'embed.component.html',
    styleUrls  : []
})
export class EmbedModalContent {
    @Input() systemId;
    @Input() disconnect;
    @Input() closable;

    LANG: any;
    config: any;
    auth: any;
    params: any;
    embedUrl: string;

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

        this.config = configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.createEmbedUrl(this.params);
    }

    ngAfterViewInit() {
        this.embedForm.form.valueChanges.subscribe((changes) => {
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