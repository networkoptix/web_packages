import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, effect, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { DeviceInfo } from 'ngx-device-detector';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSectionPlaceholderComponent } from '@components/placeholders/section/section-placeholder.component';
import staticLang from '@language_static';
import { MenuModule } from '@menu/menu.module';
import { NxMenuService } from '@menu/menu.service';
import { Content } from '@menu/menu.types';
import { DownloadComponent } from '@pages/download-updated/download/download-component.component';
import { DownloadHistoryComponent } from '@pages/download-updated/download-history/download-history-component.component';
import { ribbonHeight } from '@pages/static-variables-features';
import { PipesModule } from '@pipes/pipes.module';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { DownloadReleases } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { images, menus } from '@static-variables';
import { GridBreakpoints } from '@styles/theme-variables-common';
import { useNewCloud } from '@utils/general';
import { NxLayoutComponent, NxMenuProjectionDirective } from 'nx-components';

import { DownloadsService } from '../downloads.service';

@UntilDestroy()
@Component({
    selector: 'nx-downloads-releases-component',
    templateUrl: 'downloads-releases.component.html',
    styleUrls: ['downloads-releases.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxFooterComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxSectionPlaceholderComponent,
        MenuModule,
        NxCheckboxComponent,
        DownloadHistoryComponent,
        DownloadComponent,
        NxMenuProjectionDirective,
    ],
})
export class NxDownloadsReleasesComponentNew implements AfterViewInit {
    @Input() downloadData: DownloadReleases;

    useNewCloud = useNewCloud();
    clampWidthEffect = NxLayoutComponent.configureLayout({
        clampSize: 1440,
        viewIdentifier: 'downloads',
    });
    ds = inject(DownloadsService);
    private platform$$ = this.ds.platform$$.asReadonly();
    private activeType$$ = this.ds.type$$.asReadonly();

    CONFIG: IConfig;
    LANG = staticLang;
    images = images;
    content: Content;
    deviceInfo: DeviceInfo;
    headerHeight: number;

    constructor(
        configService: NxConfigService,
        private menuService: NxMenuService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private appStateService: NxAppStateService,
    ) {
        this.CONFIG = configService.getConfig();

        effect(
            () => {
                if (this.menuService.selectedSection$$() === 'colors') {
                    const activeType = this.activeType$$();
                    if (activeType) {
                        this.menuService.selectedSection$$.set(activeType);
                    } else {
                        this.menuService.selectedSection$$.set('other');
                    }
                }
                if (this.content) {
                    this.content.selectedSection = this.menuService.selectedSection$$();
                    this.content = { ...this.content };
                }
            },
            { allowSignalWrites: true },
        );
        effect(() => {
            const platform = this.platform$$();
            this.initMenu(platform);
        });

        this.scrollMechanicsService.windowSizeSubject
            .pipe(untilDestroyed(this))
            .subscribe(({ width }) => {
                if (width >= GridBreakpoints.MD) {
                    this.setHeaderHeight();
                }
            });
    }
    ngAfterViewInit(): void {
        this.setHeaderHeight();
    }

    initMenu(platform: string): void {
        this.content = {
            base: menus.download.baseUrl,
            selectedSection: this.activeType$$() || 'other',
            level1: [],
        };

        if (!platform) {
            platform = 'x';
        }

        if (this.downloadData.releases) {
            this.content.level1.push({
                id: menus.download.releases.id,
                label: this.LANG.menu.titles.releases,
                path: `${menus.download.releases.path}/${platform}`,
            });
        }

        if (this.downloadData.betas) {
            this.content.level1.push({
                id: menus.download.betas.id,
                label: this.LANG.menu.titles.betas,
                path: `${menus.download.betas.path}/${platform}`,
            });
        }

        this.content.level1.push({
            id: menus.download.other.id,
            label: this.LANG.menu.titles.other,
            path: 'other/releases',
        });
    }
    setHeaderHeight(): void {
        this.headerHeight = this.appStateService.ribbonVisibility
            ? this.CONFIG.headerHeight + ribbonHeight
            : this.CONFIG.headerHeight;
    }
}
