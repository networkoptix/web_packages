import {
    Component,
    ElementRef,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import {
    UntilDestroy,
    untilDestroyed
} from '@ngneat/until-destroy';
import { debounceTime, filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxAppStateService } from '@services/nx-app-state.service';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';

import { NxAPIToolService } from './api-tool.service';

@UntilDestroy()
@Component({
    selector: 'nx-api-tool',
    styleUrls: ['api-tool.component.scss'],
    templateUrl: 'api-tool.component.html',
    providers: [NxAPIToolService],
    encapsulation: ViewEncapsulation.None
})
export class NxAPIToolComponent {
    @ViewChild('developersMenu') developersMenuRef: ElementRef<HTMLElement>;
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    headerHeight: number;
    menuOffset: number = 0;

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
                if (this.developersMenuRef.nativeElement) {
                    this.setMenuOffset();
                }
            }
        });

        this.APIToolService.serversLoaded$.pipe(untilDestroyed(this), filter(loaded => loaded)).subscribe(loaded => {
            this.setMenuOffset();
        });
    }

    setMenuOffset() {
        if (this.developersMenuRef?.nativeElement) {
            this.menuOffset = this.developersMenuRef.nativeElement.getBoundingClientRect().top;
        }
    }

    setHeaderHeight() {
        this.headerHeight = this.appStateService.ribbonVisibility ? this.CONFIG.headerHeight + this.CONFIG.ribbonHeight : this.CONFIG.headerHeight;
    }
}
