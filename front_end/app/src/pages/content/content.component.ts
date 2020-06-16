import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Location } from '@angular/common';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxPageService } from '../../services/page.service';
import { Component, OnInit, Compiler, NgModule, ViewChild, ViewContainerRef, Inject } from '@angular/core';
import { ComponentsModule } from '../../components/components.module';
import { SessionStorageService } from 'ngx-store';
import { WINDOW } from '../../services/window-provider';
import { NxAccountService } from '../../services/account.service';
import { NxProcessService } from '../../services/process.service';
import { NxCloudApiService } from '../../services/nx-cloud-api';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {NxStaticCacheService} from "../../services/nx-static-cache";

@Component({
    selector   : 'content-component',
    templateUrl: 'content.component.html',
    styleUrls : ['content.component.scss']
})

export class NxContentComponent implements OnInit {
    private title: string;
    private body: SafeHtml;
    private staticHTML: SafeHtml;
    private articleParam: string;
    private state: string;
    private id: string;
    private langCode: string;
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;
    private loaded = false;
    private staticContent: any;

    private agreement: boolean;
    private agreementDetails: any = {};
    private account: any;
    private showAgree = false;
    private agreeProcess: any;

    @ViewChild('title', { static: true }) titleElement;

    private setupDefaults() {
        this.title = '';
        this.body = '';
        this.staticHTML = '';
    }

    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(WINDOW) private window: Window,
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private location: Location,
        private language: NxLanguageProviderService,
        private pageService: NxPageService,
        private _compiler: Compiler,
        private sessionStorage: SessionStorageService,
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private sanitizer: DomSanitizer,
        private staticCacheService: NxStaticCacheService
    ) {
        this.setupDefaults();
        this.langCode = this.language.currentLanguage;
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        this.staticContent = JSON.parse(this.sessionStorage.get('staticContent')) || {};

        // Clear staticContent on reload so we can try to fetch from db again
        window.onbeforeunload = (event) => {
            this.sessionStorage.remove('staticContent');
        };

        this.agreeProcess = this.processService.createProcess(() => {
            return this.cloudApiService.acceptAgreement(this.agreementDetails.review_id);
        }, {
            successMessage: this.LANG.account.agreementAccepted
        }).then(() => {
            this.showAgree = false;
            if (this.account.is_staff) {
                window.location.href = '/admin/';
            }
        });
    }

    ngAfterViewInit(): void {
        this.accountService.get().then(account => {
            this.account = account;
            this.subscribeParams();
        });
    }

    subscribeParams() {
        this.route.paramMap.subscribe((paramMap) => {
            this.agreement = this.route.snapshot.routeConfig.path === 'agreement';
            this.state = this.route.snapshot.queryParamMap.get('state');
            this.id = this.route.snapshot.queryParamMap.get('id');
            this.title = '';
            this.body = '';
            this.staticHTML = '';
            this.loaded = false;
            this.showAgree = false;
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

    getContent() {
        let uri;
        if (this.agreement) {
            uri = `${this.CONFIG.apiBase}/agreement?`;
        } else {
            uri = `${this.CONFIG.apiBase}/article/${this.articleParam}/?`;
        }
        const state = (this.state) ? this.state : '';
        const id = (this.id) ? this.id : '';
        const params = new HttpParams().set('state', state).set('id', id);
        this.http.get(uri, { params }).subscribe(
            (data: any) => {
                this.title = data.title;
                this.body = this.sanitizer.bypassSecurityTrustHtml(data.body);
                this.pageService.pageTitle = this.title;
                this.loaded = true;
                if (data.id) {
                    this.id = data.id;
                }
                if (this.agreement) {
                    this.agreementDetails.review_id = data.review_id;
                    this.agreementDetails.accepted = data.accepted;
                    this.agreementDetails.preview = data.preview;
                    this.showAgree = !this.state && this.account && !this.agreementDetails.accepted;
                }
            },
            () => {
                if (!this.agreement) {
                    this.loadStaticContent();
                } else {
                    this.location.go('404');
                }
            });
    }

    loadStaticContent() {
        this.staticCacheService.requestStatic(this.articleParam).subscribe(
            html => {
                this.staticHTML = this.sanitizer.bypassSecurityTrustHtml(html);
                const titleRegex = /#title.*>(.*)</m;
                const match = titleRegex.exec(html);
                if (match && match[1]) {
                    this.pageService.pageTitle(match[1]);
                }
                this.loaded = true;
                this.staticContent[this.articleParam] = true;
                this.sessionStorage.set('staticContent', JSON.stringify(this.staticContent));
            },
            error => {
                console.error(error);
                this.location.go('404');
            });
    }
}
