import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, Inject, Injector, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SessionStorageService } from 'ngx-webstorage';

import staticLang from '@common/language/language_i18n_static.json';
import { apiBase } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-content-component',
    templateUrl: 'content.component.html',
    styleUrls: ['content.component.scss'],
})
export class NxContentComponent implements OnInit {
    CONFIG: IConfig;
    LANG = staticLang;
    apiBase: string = apiBase;

    injector: Injector;

    public title: string;
    public body: string;
    public loaded = false;

    private articleParam: string;
    private state: string;
    private id: string;
    private staticContent;

    private agreement: boolean;
    private agreementDetails: any = {};
    private account: Account;
    public showAgree = false;
    public agreeProcess: Process;

    private setupDefaults(): void {
        this.title = '';
        this.body = '';
    }

    constructor(
        injector: Injector,
        configService: NxConfigService,
        private route: ActivatedRoute,
        private http: HttpClient,
        private pageService: NxPageService,
        private sessionStorage: SessionStorageService,
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.setupDefaults();
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.staticContent = JSON.parse(
            this.sessionStorage.retrieve('staticContent')
        ) || {};

        // Clear staticContent on reload so we can try to fetch from db again
        this.window.onbeforeunload = event => {
            this.sessionStorage.clear('staticContent');
        };

        this.agreeProcess = this.processService.createProcess(() => {
            return this.cloudApiService.acceptAgreement(
                this.agreementDetails.review_id
            );
        }, {
            successMessage: this.LANG.account.agreementAccepted
        }).then(() => {
            this.showAgree = false;
            if (this.account.is_staff) {
                this.window.location.href = decodeURIComponent(
                    this.route.snapshot.queryParams.next
                        ? this.route.snapshot.queryParams.next
                        : '/admin/'
                );
            }
        });
    }

    ngAfterViewInit(): void {
        this.accountService.get().then(account => {
            if (account) {
                this.account = account;
            }
        }).finally(() => this.subscribeParams());
    }

    subscribeParams(): void {
        this.route.paramMap.subscribe(paramMap => {
            this.agreement =
                this.route.snapshot.parent.routeConfig.path === 'agreement';
            this.state = this.route.snapshot.queryParamMap.get('state');
            this.id = this.route.snapshot.queryParamMap.get('id');
            this.title = '';
            this.body = '';
            this.loaded = false;
            this.showAgree = false;
            this.articleParam = paramMap.get('article_param');
            if (this.articleParam === 'temp_url' && this.state === 'draft') {
                // Internal no need to translate
                const message = 'No saved content to preview. Please save draft or submit for review to view preview.';
                this.injector.get(NxPageService).redirect404(message);

                return;
            }

            if (this.agreement) {
                this.getContent();
            } else {
                this.articleParam = paramMap.get('article_param');

                if (!this.staticContent[this.articleParam]) {
                    this.getContent();
                } else {
                    this.loadStaticContent();
                }
            }
        });
    }

    getContent(): void {
        let uri;
        if (this.agreement) {
            uri = `${this.apiBase}/cms/agreement?`;
        } else {
            uri = `${this.apiBase}/cms/article/${this.articleParam}/?`;
        }
        const state = (this.state) ? this.state : '';
        const id = (this.id) ? this.id : '';
        const params = new HttpParams().set('state', state).set('id', id);
        let headers = new HttpHeaders().set('ngsw-bypass', 'true');
        if (this.account && this.account.is_staff) {
            headers = headers.set('ngsw-bypass', 'true');
        }
        this.http.get(uri, { headers, params }).subscribe(
            (data: any) => {
                this.title = data.title;
                this.body = data.body;
                this.pageService.pageTitle(this.title, data.shortDescription);
                this.loaded = true;
                if (data.id) {
                    this.id = data.id;
                }
                if (this.agreement) {
                    this.agreementDetails.review_id = data.review_id;
                    this.agreementDetails.accepted = data.accepted;
                    this.agreementDetails.preview = data.preview;
                    this.showAgree = !this.state &&
                        this.account &&
                        !this.agreementDetails.accepted;
                }
            },
            () => {
                if (!this.agreement) {
                    this.loadStaticContent();
                } else {
                    this.injector.get(NxPageService).redirect404();
                }
            });
    }

    loadStaticContent(): void {
        const templateUrl =
            `/${this.CONFIG.viewsDir}static/${this.articleParam}.html`;

        this.cloudApiService
            .getStatic(templateUrl)
            .toPromise()
            .then(result => {
                this.body = result;
                const parser = new DOMParser();
                const content = parser.parseFromString(result, 'text/html');
                this.pageService.pageTitle(
                    content.querySelector('h1')?.innerText ||
                    this.LANG.productName
                );
                this.loaded = true;
                /* If content was successfully compiled from static files,
                    add to staticContent so we don't do an API call each time we switch pages */
                this.staticContent[this.articleParam] = true;
                this.sessionStorage.store(
                    'staticContent',
                    JSON.stringify(this.staticContent)
                );
            }).catch(e => {
                if (e.status === 404) {
                    this.injector.get(NxPageService).redirect404();
                }
                console.error(e);
            });
    }
}
