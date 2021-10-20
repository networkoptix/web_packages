import {
    Component,
    ViewEncapsulation
}                                    from '@angular/core';
import { NxPageService }             from '@services/page.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { debounceTime }              from 'rxjs/operators';
import {
    UntilDestroy,
    untilDestroyed
}                                    from '@ngneat/until-destroy';
import { IConfig, NxConfigService }  from '@services/nx-config';
import { NxAppStateService }         from '@services/nx-app-state.service';
import { NxScrollMechanicsService }  from '@services/scroll-mechanics.service';
import { NxAPIToolService }          from './api-tool.service';

@UntilDestroy()
@Component({
    selector: 'nx-api-tool',
    styleUrls: ['api-tool.component.scss'],
    templateUrl: 'api-tool.component.html',
    providers: [NxAPIToolService],
    encapsulation: ViewEncapsulation.None
})
export class NxAPIToolComponent {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    headerHeight: number;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        pageService: NxPageService,
        public APIToolService: NxAPIToolService,
        private appStateService: NxAppStateService,
        private scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();

        pageService.pageTitle = this.LANG.pageTitles.apiTool();

        // We listen to window resize and measure header height to know how much to offset the fixed menu by
        this.scrollMechanicsService.windowSizeSubject.pipe(untilDestroyed(this), debounceTime(25)).subscribe(({ width }) => {
            if (width >= 768) {
                this.setHeaderHeight();
            }
        });
    }

    setHeaderHeight() {
        this.headerHeight = this.appStateService.ribbonVisibility ? this.CONFIG.headerHeight + this.CONFIG.ribbonHeight : this.CONFIG.headerHeight;
    }
}
