import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService } from '../../services/nx-config';
import { Title } from '@angular/platform-browser';


@Component({
    selector   : 'content-component',
    templateUrl: 'content.component.html',
    styleUrls  : [ 'content.component.scss' ]
})

export class NxContentComponent implements OnInit {
    private title: string;
    private body: string;
    private staticHTML: string;
    private articleParam: string;
    private langCode: string;
    private CONFIG: any;

    private setupDefaults() {
        this.title = '';
        this.body = '';
        this.staticHTML = '';
    }

    constructor(private route: ActivatedRoute,
                private http: HttpClient,
                private location: Location,
                private language: NxLanguageProviderService,
                private config: NxConfigService,
                private titleService: Title) {
        this.setupDefaults();
        this.langCode = this.language.getLang();
        this.CONFIG = config.getConfig();
    }

    ngOnInit(): void {
        this.articleParam = this.route.snapshot.paramMap.get('article_param');
        this.getArticle();
    }

    waitForViewsDir() {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (this.CONFIG.viewsDir) {
                    clearInterval(interval);
                    resolve();
                }
            }, 200);
        });
    }

    getArticle() {
        this.http.get(`/api/article/${this.articleParam}/`).subscribe(
            (data: any) => {
                this.title = data.title;
                this.body = data.body;
                this.titleService.setTitle(this.title);
            },
            error => {
                if (error.status === 404) {
                    this.waitForViewsDir().then(() => {
                        this.http.get(`/${this.CONFIG.viewsDir}static/${this.articleParam}.html`, {responseType: 'text'}).subscribe(
                        (html: any) => {
                            this.staticHTML = html;
                            this.titleService.setTitle(this.articleParam[0].toUpperCase() + this.articleParam.slice(1));
                        },
                        error => {
                            if (error.status === 404) {
                                this.location.go('404');
                            }
                        });
                    });
                }
            });
    }
}

