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

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { GridBreakpoints } from '@styles/theme-variables-common';

import { NxAPIToolSystemService } from './services/api-tool-system.service';
import { NxOpenAPIJSONService } from './services/openapi-json.service';
import { NxReadonlyAPIService } from './services/readonly-api.service';

@UntilDestroy()
@Component({
    selector: 'nx-api-tool',
    styleUrls: ['api-tool.component.scss'],
    templateUrl: 'api-tool.component.html',
    providers: [NxAPIToolSystemService, NxOpenAPIJSONService, NxReadonlyAPIService],
    encapsulation: ViewEncapsulation.None
})
export class NxAPIToolComponent {
    @ViewChild('developersMenu') developersMenuRef: ElementRef<HTMLElement>;
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    headerHeight: number;
    menuOffset: number = 0;

    constructor(
        private configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private appStateService: NxAppStateService,
        private scrollMechanicsService: NxScrollMechanicsService,
        public APIToolService: NxAPIToolSystemService,
        public APIJSONService: NxOpenAPIJSONService,
    ) {
        this.LANG = this.languageService.translations;
        this.CONFIG = this.configService.getConfig();

        // We listen to window resize and measure header height to know how much to offset the fixed menu by
        this.scrollMechanicsService.windowSizeSubject.pipe(untilDestroyed(this), debounceTime(25)).subscribe(({ width }) => {
            if (width >= GridBreakpoints.MD) {
                this.setHeaderHeight();
                if (this.developersMenuRef?.nativeElement) {
                    this.setMenuOffset();
                }
            }
        });
    }

    ngOnInit(): void {
        this.APIToolService.serversLoading$.pipe(untilDestroyed(this), filter(loading => !loading)).subscribe(() => {
            this.setMenuOffset();
        });
    }

    setMenuOffset(): void {
        if (this.developersMenuRef?.nativeElement) {
            this.menuOffset = this.developersMenuRef.nativeElement.getBoundingClientRect().top;
        }
    }

    setHeaderHeight(): void {
        this.headerHeight = this.appStateService.ribbonVisibility ? this.CONFIG.headerHeight + this.CONFIG.ribbonHeight : this.CONFIG.headerHeight;
    }
}
