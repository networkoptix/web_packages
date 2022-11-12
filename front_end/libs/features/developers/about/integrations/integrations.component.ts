import { Component, Input, HostListener, OnInit, Inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { WINDOW } from '@services/window-provider';

import type { AboutNode } from '../about.component.types';
import { ErrorStateManager } from '../error-state/error-state-manager';

@UntilDestroy()
@Component({
    selector: 'nx-integrations',
    templateUrl: 'integrations.component.html',
    styleUrls: ['integrations.component.scss']
})
export class NxIntegrationsComponent implements OnInit {
    @Input() integrationsNode: AboutNode;

    errorManager: ErrorStateManager;

    currentWindowWidth: number;
    scrollIndex = 0;
    pluginCount = 0;
    integrationsShortDescription = '';
    integrations;

    @HostListener('window:resize') onResize(): void {
        this.currentWindowWidth = this.window.innerWidth;
    }

    // @ViewChild('integrationsScroll') integrationsScroll: ElementRef

    LANG: LanguageI18NStaticTypes;

    integrationsDetails() {
        const allPlugins = this.integrationsNode.nodes[1].nodes;
        const more = { url: '/integrations' };
        const getPluginsToShow = () => {
            switch (true) {
                case (this.currentWindowWidth > 1048):
                    return { maxPlugins: 7, perRow: 4 };
                // case (this.currentWindowWidth > 1048):
                //     return { maxPlugins: 5, perRow: 3 };
                default:
                    return { maxPlugins: 3, perRow: 2 };
            }
        };
        const { maxPlugins, perRow } = getPluginsToShow();
        const show = Math.min(allPlugins.length, maxPlugins);
        const translatedCount = this.sanitizer.bypassSecurityTrustHtml(
            this.LANG.common.morePlugins({
                count: this.pluginCount - show,
                startTag: '<strong style="font-size: 24px; line-height: 30px; display: block; text-align: center;">',
                endTag: '</strong>'
            })
        );
        const plugins = allPlugins.slice(0, show);
        const getColSpan = (
            numPlugins: number,
            maxPlugins: number,
            perRow: number
        ) => {
            let variant = numPlugins - maxPlugins - 1;
            while (Math.abs(variant) > perRow) {
                variant += perRow;
            }
            return variant;
        };
        return {
            plugins,
            more,
            translatedCount,
            moreStart: `more-span more-span${getColSpan(
                plugins.length,
                maxPlugins,
                perRow
            )}`
        };
    }

    navigate(url: string): void {
        // Need to figure out why router.navigate doesn't work
        this.window.location.href = url;
    }

    constructor(
        languageService: NxLanguageProviderService,
        @Inject(WINDOW) private window: Window,
        private cloudApi: NxCloudApiService,
        private sanitizer: DomSanitizer
    ) {
        this.LANG = languageService.translations;
        this.errorManager = new ErrorStateManager(this.window);
    }

    ngOnInit(): void {
        this.cloudApi.getIntegrationsCount()
            .pipe(untilDestroyed(this))
            .subscribe(data => {
                this.pluginCount = data.count || 0;
                this.integrations = this.integrationsDetails();
            });
        this.currentWindowWidth = this.window.innerWidth;
        this.integrationsShortDescription =
            (this.integrationsNode?.nodes?.[0]?.asset?.shortDescription || '')
                .split('\n')
                .reduce((prev, paragraph) => `${prev}<p>${paragraph}</p>`, '');

        const integrationsConfig = this.errorManager.buildConfig(
            ['title'],
            this.errorManager.buildConfig(
                ['title'],
                null,
                this.errorManager.buildConfig(
                    ['title', 'shortDescription', 'blocks']
                ))
        );
        this.errorManager.checkAboutNode(
            this.integrationsNode,
            integrationsConfig
        );
    }
}
