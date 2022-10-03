import {
    Component,
    OnInit,
    Input,
    ViewChild,
    OnDestroy,
    AfterViewInit
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

interface IParams<Value = any> {
    [key: string]: Value;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-embed-content',
    templateUrl: 'embed.component.html',
    styleUrls: []
})
export class EmbedModalContent implements OnInit, OnDestroy, AfterViewInit {
    @Input() systemId;
    @Input() disconnect;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    auth;
    params: IParams;
    embedUrl: string;
    private formChangesSubscription: Subscription;

    @ViewChild('embedForm', { static: true }) embedForm: NgForm;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        public activeModal: NgbActiveModal
    ) {
        this.params = {
            authString: '',
            nocameras: false,
            noheader: false,
            nocontrols: false
        };

        this.auth = {
            email: '',
            password: ''
        };

        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnDestroy() {
    }

    ngOnInit() {
        this.createEmbedUrl(this.params);
    }

    ngAfterViewInit() {
        this.formChangesSubscription = this.embedForm.form.valueChanges
            .subscribe((changes) => {
                this.createEmbedUrl(changes);
            });
    }

    createEmbedUrl(params): void {
        // Cannot use A6 router at this moment - AJS is leading the parade
        const url = window.location.href.replace('systems', 'embed').split('?')[0];
        let uri   = '';

        for (const paramsKey in params) {
            // eslint-disable-next-line no-prototype-builtins
            if (params.hasOwnProperty(paramsKey)) {
                // filter checkboxes in form
                if (this.params[paramsKey] !== undefined && !params[paramsKey]) {
                    uri += (uri === '') ? '?' : '&';
                    uri += (typeof params[paramsKey] === 'boolean')
                        ? paramsKey
                        : params[paramsKey];
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
