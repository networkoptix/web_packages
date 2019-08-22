import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService } from '../../services/nx-config';
import { Title } from '@angular/platform-browser';
import {
    Component,
    OnInit,
    AfterViewInit,
    Directive,
    ElementRef,
    Compiler,
    Injector,
    NgModuleRef, NgModule, ViewChild, ViewContainerRef
} from '@angular/core';

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
    private queryParamMap: any;
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
                private _compiler: Compiler,
                private _injector: Injector,
                private _m: NgModuleRef<any>) {
        this.setupDefaults();
        this.langCode = this.language.getLang();
        this.CONFIG = config.getConfig();
    }

    ngOnInit(): void {
        this.articleParam = this.route.snapshot.paramMap.get('article_param');
        this.queryParamMap = this.route.snapshot.queryParamMap;
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
        const uri = `${this.CONFIG.apiBase}/article/${this.articleParam}/`;
        // uri += (status) ? '?' + status : '' ;
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
        const tmpCmp = Component({
            moduleId: module.id,
            template
        })(class {
        });

        const tmpModule = NgModule({
            declarations: [tmpCmp]
        })(class {
        });

        this._compiler.compileModuleAndAllComponentsAsync(tmpModule)
            .then((factories) => {
                const factory = factories.componentFactories[0];
                const compRef = factory.create(this._injector, [], undefined, this._m);
                compRef.instance.name = 'dynamic';

                if (this.CONFIG.previewPath) {
                    // Image src is already compiled with full path
                    // .. so it needs some massaging
                    const images = compRef.location.nativeElement.querySelectorAll('img');
                    images.forEach((img) => {
                        const position = img.src.indexOf('/static');
                        img.src = [img.src.slice(0, position), '/' + this.CONFIG.previewPath, img.src.slice(position)].join('');
                    });
                }

                this.dynamicTemplate.insert(compRef.hostView);
            });
    }
}

