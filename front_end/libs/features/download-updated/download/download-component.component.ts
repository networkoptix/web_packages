import { CommonModule } from '@angular/common';
import { Component, input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSectionPlaceholderComponent } from '@components/placeholders/section/section-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { DownloadMobileComponent } from '@pages/download-updated/download-mobile/download-mobile.component';
import { PipesModule } from '@pipes/pipes.module';
import type { Downloads, Installer, Platform } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { Groups } from '@services/nx-config/base-config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { images } from '@static-variables';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-download-component',
    templateUrl: 'download-component.component.html',
    styleUrls: ['download-component.component.scss'],
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
        TranslateModule,
        DownloadMobileComponent,
        NxAddSvgSrcDirective,
    ],
})
export class DownloadComponent implements OnChanges {
    releaseType = input.required<string>();
    activePlatform = input.required<string>({ alias: 'platform' });
    downloadData = input.required<Downloads>();
    sortedPlatforms = input.required<Platform[]>();

    CONFIG: IConfig;
    LANG = staticLang;
    images = images;

    downloadButton: Installer;
    // Placeholder should not appear while downloads are loading
    otherPackages: Installer[];

    // TODO: Fix arm supported. It says the same thing as linux

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnChanges(): void {
        this.parsePlatform();
    }

    private calcDisplayedPackages(platformName: string): void {
        const platform = this.sortedPlatforms().find(platform => platform.name === platformName);
        this.downloadButton = undefined;
        this.otherPackages = [];
        if (platform !== undefined) {
            if (platform.name === 'sdk') {
                this.otherPackages = platform.files;
            } else {
                // Ensures the first client found is always selected for the download button.
                let client: Installer;
                const clients = platform.files.filter(({ appType }) => appType === 'client');
                if (platform.name === 'macos') {
                    client = clients.find(({ platform }) => platform === 'macos_arm64');
                }
                if (!client) {
                    client = clients.shift();
                }
                this.downloadButton = client;
                // Remove the download button from the other packages.
                this.otherPackages = platform.files.filter(
                    ({ fileName }) => fileName !== client.fileName,
                );
            }
        }
    }
    private parsePlatform(): void {
        for (const mobile in this.CONFIG.downloads.mobile) {
            const { name, os } = this.CONFIG.downloads.mobile[mobile];
            if (os === this.activePlatform()) {
                const link = this.LANG.downloads.mobile[name].link;
                if (link !== 'disabled') {
                    document.location.href = link;
                    return;
                }
                break;
            }
        }
        const platform = this.downloadData().platforms.find(
            ({ name }) => name === this.activePlatform(),
        );
        if (platform) {
            platform.files = platform.files
                .filter(installer =>
                    this.CONFIG.downloads.groups[platform.name as keyof Groups].appTypes.includes(
                        installer.appType,
                    ),
                )
                .map(installer => {
                    if (!installer.niceName) {
                        const translatedPlatform =
                            this.LANG.downloads.platforms[installer.platform];
                        const translatedAppType = this.LANG.downloads.appTypes[installer.appType];
                        if (platform.name === 'sdk' && translatedAppType) {
                            installer.niceName = translatedAppType;
                        } else if (translatedPlatform && translatedAppType) {
                            installer.niceName = `${translatedPlatform} - ${translatedAppType}`;
                        } else {
                            installer.niceName = `${installer.platform} - ${this.LANG.downloads.appTypes.package}`;
                        }
                    }
                    return installer;
                });
        }

        this.calcDisplayedPackages(this.activePlatform());
    }
    installerName(platformName: string): string {
        return (
            this.LANG.downloads.groups[platformName].shortLabel ||
            this.LANG.downloads.groups[platformName].label
        );
    }
}
