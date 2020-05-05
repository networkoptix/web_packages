import { Component, Inject } from '@angular/core';
import {
    NxLanguageProviderService,
    NxConfigService, IConfig,
    NxScrollMechanicsService,
    NxAppStateService, WINDOW
}                            from '../app/src/services';
import '../app/styles/main.scss';
import 'bootstrap';
import { fromEvent }         from 'rxjs';
import { debounceTime }      from 'rxjs/operators';

@Component({
    selector: 'health-monitor-app',
    template: '<router-outlet></router-outlet>'
})
export class HealthMonitorComponent {
    CONFIG: IConfig;
    constructor(private appStateService: NxAppStateService,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private scrollMechanicsService: NxScrollMechanicsService,
                @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = this.config.getConfig();
        this.appStateService.setHeaderVisibility(false);
        this.scrollMechanicsService.setWindowSize(window.innerHeight, window.innerWidth);

        // @ts-ignore
        this.language.setDefaultLang('en_US');
        // @ts-ignore
        this.language.setTranslations(window.LANG.ajs.language, window.LANG.i18n);
        // @ts-ignore
        this.CONFIG.viewsDir = 'static/lang_' + window.LANG.ajs.language + '/views/';
        // @ts-ignore
        this.CONFIG.viewsDirCommon = 'static/lang_' + window.LANG.ajs.language + '/web_common/views/';
        fromEvent(window, 'resize').pipe(debounceTime(100)).subscribe((event: any) => {
            this.scrollMechanicsService.setWindowSize(event.target.innerHeight, event.target.innerWidth);
        });
    }
}
