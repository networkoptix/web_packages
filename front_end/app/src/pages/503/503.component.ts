import {
    Compiler, Component, Injector, NgModule,
    NgModuleRef, ViewChild, ViewContainerRef
}                                   from '@angular/core';
import { Router }                   from '@angular/router';
import { Title }                    from '@angular/platform-browser';
import { NxPageService }            from '../../services/page.service';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxAppStateService }        from '../../services/nx-app-state.service';
import { LanguageI18NStaticTypes }  from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-503',
    styleUrls   : ['503.component.scss'],
    templateUrl : '503.component.html'
})
export class Nx503Component {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    @ViewChild('dynamicTemplate', { read: ViewContainerRef, static: true }) dynamicTemplate;
    @ViewChild('dynamicImage', { read: ViewContainerRef, static: true }) dynamicImage;

    constructor(private _compiler: Compiler,
        private _injector: Injector,
        private _m: NgModuleRef<any>,
        configService: NxConfigService,
        private appState: NxAppStateService,
        private pageService: NxPageService,
        private router: Router,
        private title: Title
    ) {
        this.title.setTitle('Maintenance is in progress');
        this.CONFIG = configService.getConfig();
        this.appState.setFooterVisibility(false);
        this.appState.setHeaderVisibility(false);
    }

    ngAfterViewInit() {
        // const myTemplateUrl = '/static/503.html';
        //
        // const tmpCmp = Component({
        //     moduleId   : module.id,
        //     templateUrl: myTemplateUrl
        // })(class {
        // });
        //
        // const tmpModule = NgModule({
        //     declarations: [tmpCmp]
        // })(class {
        // });
        //
        // this._compiler.compileModuleAndAllComponentsAsync(tmpModule)
        //     .then((factories) => {
        //         const factory         = factories.componentFactories[0];
        //         const compRef         = factory.create(this._injector, [], null, this._m);
        //         compRef.instance.name = 'dynamic';
        //
        //         if (this.CONFIG.previewPath) {
        //             // Image src is already compiled with full path
        //             // .. so it needs some massaging
        //             const images = compRef.location.nativeElement.querySelectorAll('img');
        //             images.forEach((img) => {
        //                 const position = img.src.indexOf('/static');
        //                 img.src = [img.src.slice(0, position), '/' + this.CONFIG.previewPath, img.src.slice(position)].join('');
        //             });
        //         }
        //
        //         this.dynamicTemplate.insert(compRef.hostView);
        //     }).catch((e) => console.error(e));
        // setTimeout(() => {
        //     this.router.navigate(['/']).catch(() => console.log('Error navigating to the index'));
        // }, this.CONFIG.maintenanceTimeout);
    }
}
