import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService } from '../../services/nx-config';
import { Title } from '@angular/platform-browser';
import { Component, OnInit, Compiler, NgModule, ViewChild, ViewContainerRef } from '@angular/core';
import { ComponentsModule } from '../../components/components.module';

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
    private langCode: string;
    private CONFIG: any;

    @ViewChild('dynamicTemplate', { read: ViewContainerRef, static: true }) dynamicTemplate;
    @ViewChild('dynamicImage', { read: ViewContainerRef, static: true }) dynamicImage;

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
                private titleService: Title,
                private _compiler: Compiler) {
        this.setupDefaults();
        this.langCode = this.language.getLang();
        this.CONFIG = config.getConfig();
    }

    ngOnInit(): void {
        this.articleParam = this.route.snapshot.paramMap.get('article_param');
        this.state = this.route.snapshot.queryParamMap.get('state');
    }

    ngAfterViewInit(): void {
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
        let uri = `${this.CONFIG.apiBase}/article/${this.articleParam}/`;
        uri += (this.state) ? '?' + this.state : '';
        return this.http.get(uri).subscribe(
            (data: any) => {
                this.title = data.title;
                this.body = data.body;
                this.titleService.setTitle(this.title);
            },
            () => {
                this.loadStaticArticle();
            });
    }

    loadStaticArticle() {
        this.waitForViewsDir().then(() => {
            const templateUrl = `/${this.CONFIG.viewsDir}static/${this.articleParam}.html`;
            this.http.get(templateUrl, {responseType: 'text'}).subscribe(
                (html: any) => {
                    this.compileStaticArticle(html);
                },
                () => {
                    this.location.go('404');
                }
            );
        });
    }

    compileStaticArticle(template) {
        @Component({template})
        class TemplateComponent {}

        @NgModule({declarations: [TemplateComponent], imports: [ComponentsModule]})
        class TemplateModule {}

        const mod = this._compiler.compileModuleAndAllComponentsSync(TemplateModule);
        const factory = mod.componentFactories.find((comp) => comp.componentType === TemplateComponent);

        this.dynamicTemplate.createComponent(factory);
    }
}

