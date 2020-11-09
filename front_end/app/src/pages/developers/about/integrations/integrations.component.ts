import { Component, Input, HostListener, OnInit, Output, EventEmitter, ViewChild, ElementRef, Inject } from '@angular/core';
import { UntilDestroy }                           from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '../../../../../language_i18n_static_types';
import { AboutNode } from '../about.component';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { WINDOW } from '@services/window-provider';
import { DomSanitizer } from '@angular/platform-browser';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-integrations',
    templateUrl : 'integrations.component.html',
    styleUrls   : ['integrations.component.scss']
})
export class NxIntegrationsComponent implements OnInit {
    @Input() integrationsNode: AboutNode;

    currentWindowWidth: number;
    scrollIndex = 0;
    pluginCount = 0;

    @HostListener('window:resize') onResize() {
        this.currentWindowWidth = window.innerWidth;
    }

    // @ViewChild('integrationsScroll') integrationsScroll: ElementRef

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    // getScrollPosition({ target: { scrollLeft, scrollWidth } }, positions) {
    //     const tabWidth = scrollWidth / positions;
    //     return Math.round(scrollLeft / tabWidth);
    // }

    // updateIndex(index) {
    //     this.scrollIndex = index;
    // }

    // updateScroll(index, positions) {
    //     const scrollWidth = this.integrationsScroll.nativeElement.scrollWidth;
    //     const tabWidth = scrollWidth / positions;
    //     this.integrationsScroll.nativeElement.scrollLeft = index * tabWidth;
    // }

    integrationsDetails() {
        const allPlugins = this.integrationsNode.nodes[1].nodes;
        const more = { url: '/integrations' };
        const getPluginsToShow = () => {
            switch (true) {
                case (this.currentWindowWidth > 1476):
                    return 9;
                case (this.currentWindowWidth > 1264):
                    return 7;
                case (this.currentWindowWidth > 1048):
                    return 5;
                default:
                    return 3;
            }
        };
        const maxPlugins = getPluginsToShow();
        const show = Math.min(allPlugins.length, maxPlugins);
        const translatedCount = this.sanitizer.bypassSecurityTrustHtml(NxLanguageProviderService.translate(
            this.LANG.common.morePlugins,
            {
                count    : this.pluginCount - show,
                startTag : '<strong style="font-size: 20px; display: block; text-align: center;">',
                endTag   : '</strong>'
            }
        ));
        const plugins = allPlugins.slice(0, show);
        return { plugins, more, translatedCount, moreStart: `more-span${plugins.length - maxPlugins - 1}` };
    }

    navigate(url: string) {
        // Need to figure out why router.navigate doesn't work
        window.location.href = url;
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(WINDOW) private window: Window,
        private cloudApi: NxCloudApiService,
        private sanitizer: DomSanitizer
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
        this.cloudApi.getIntegrationsCount().subscribe(data => {
            this.pluginCount = data.count || 0;
        });
    }

    ngOnInit() {
        this.currentWindowWidth = window.innerWidth;
    }
};
