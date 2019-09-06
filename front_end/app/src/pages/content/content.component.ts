import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Location } from '@angular/common';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService } from '../../services/nx-config';
import { Title } from '@angular/platform-browser';
import { Component, OnInit, Compiler, NgModule, ViewChild, ViewContainerRef, Inject } from '@angular/core';
import { ComponentsModule } from '../../components/components.module';
import { SessionStorageService } from 'ngx-store';
import { WINDOW } from '../../services/window-provider';

@Component({
    selector : 'content-component',
    templateUrl: 'content.component.html',
    styleUrls: ['content.component.scss']
})

export class NxContentComponent implements OnInit {
    private title: string;
    private body: string;
    private staticHTML: string;
    private articleParam: string;
    private state: string;
    private id: string;
    private langCode: string;
    private CONFIG: any;
    private loaded: boolean;
    private staticContent: any;

    @ViewChild('dynamicTemplate', { read: ViewContainerRef, static: true }) dynamicTemplate;
    @ViewChild('dynamicImage', { read: ViewContainerRef, static: true }) dynamicImage;

    private setupDefaults() {
        this.title = '';
        this.body = '';
        this.staticHTML = '';
    }

    constructor(@Inject(WINDOW) private window: Window,
                private route: ActivatedRoute,
                private http: HttpClient,
                private location: Location,
                private language: NxLanguageProviderService,
                private config: NxConfigService,
                private titleService: Title,
                private _compiler: Compiler,
                private sessionStorage: SessionStorageService) {
        this.setupDefaults();
        this.langCode = this.language.getLang();
        this.CONFIG = config.getConfig();
    }

    ngOnInit(): void {
        this.staticContent = JSON.parse(this.sessionStorage.get('staticContent')) || {};

        // Clear staticContent on reload so we can try to fetch from db again
        window.onbeforeunload = (event) => {
            this.sessionStorage.remove('staticContent');
        };
    }

    ngAfterViewInit(): void {
        this.route.paramMap.subscribe((paramMap) => {
            this.articleParam = paramMap.get('article_param');
            this.state = this.route.snapshot.queryParamMap.get('state');
            this.id = this.route.snapshot.queryParamMap.get('id');

            this.dynamicTemplate.clear();
            this.title = '';
            this.body = '';
            this.loaded = false;

            if (!this.staticContent[this.articleParam]) {
                this.getArticle();
            } else {
                this.loadStaticArticle();
            }
        });
    }

    getArticle() {
        const uri = `${this.CONFIG.apiBase}/article/${this.articleParam}/?`;
        const state = (this.state) ? this.state : '';
        const id = (this.id) ? this.id : '';
        const params = new HttpParams().set('state', state).set('id', id);
        this.http.get(uri, {params}).subscribe(
            (data: any) => {
                this.title = data.title;
                this.body = data.body;
                this.titleService.setTitle(this.title);
                this.loaded = true;
            },
            () => {
                this.loadStaticArticle();
            });
    }

    loadStaticArticle() {
        const templateUrl = `/${this.CONFIG.viewsDir}static/${this.articleParam}.html`;
        this.compileStaticArticle(templateUrl);
    }

    compileStaticArticle(templateUrl) {
        @Component({templateUrl})
        class TemplateComponent {}

        @NgModule({declarations: [TemplateComponent], imports: [ComponentsModule]})
        class TemplateModule {}

        this._compiler.compileModuleAndAllComponentsAsync(TemplateModule).then((mod) => {
            const factory = mod.componentFactories.find((comp) => comp.componentType === TemplateComponent);

            this.dynamicTemplate.createComponent(factory);
            this.loaded = true;

            /* If content was successfully compiled from static files,
                add to staticContent so we don't do an API call each time we switch pages */
            this.staticContent[this.articleParam] = true;
            this.sessionStorage.set('staticContent', JSON.stringify(this.staticContent));
        }).catch(() => this.location.go('404'));
    }
}

