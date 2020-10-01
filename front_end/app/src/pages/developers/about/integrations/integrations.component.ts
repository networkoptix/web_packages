import { Component, Input, HostListener, OnInit, Output, EventEmitter, ViewChild, ElementRef, Inject } from '@angular/core';
import { UntilDestroy }                           from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '../../../../../language_i18n_static_types';
import { AboutNode } from '../about.component';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';

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

    @ViewChild('integrationsScroll') integrationsScroll: ElementRef

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    getScrollPosition({ target: { scrollLeft, scrollWidth } }, positions) {
        const tabWidth = scrollWidth / positions;
        return Math.round(scrollLeft / tabWidth);
    }

    updateIndex(index) {
        this.scrollIndex = index;
    }

    updateScroll(index, positions) {
        const scrollWidth = this.integrationsScroll.nativeElement.scrollWidth;
        const tabWidth = scrollWidth / positions;
        this.integrationsScroll.nativeElement.scrollLeft = index * tabWidth;
    }

    integrationsDetails() {
        const nodes = this.integrationsNode.nodes[1].nodes;
        const plugins = nodes.slice(0, nodes.length - 1);
        const more = { url: '/integrations' };
        const getPluginsToShow = () => {
            switch (true) {
                case (this.currentWindowWidth > 1476):
                    return Math.min(plugins.length, 5);
                case (this.currentWindowWidth > 1264):
                    return Math.min(plugins.length, 4);
                case (this.currentWindowWidth > 1048):
                    return Math.min(plugins.length, 3);
                case (this.currentWindowWidth > 836):
                    return Math.min(plugins.length, 2);
                case (this.currentWindowWidth > 608):
                    return 1;
                default:
                    return plugins.length;
            }
        };
        const show = getPluginsToShow();
        const translatedCount = NxLanguageProviderService.translate(
            this.LANG.common.morePlugins,
            {
                count    : this.pluginCount - show,
                startTag : '<strong class="brand-text">',
                endTag   : '</strong>'
            }
        );
        return { plugins: plugins.slice(0, show), more, translatedCount };
    }

    navigate(url: string) {
        // Need to figure out why router.navigate doesn't work
        window.location.href = url;
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        @Inject(WINDOW) private window: Window,
        private cloudApi: NxCloudApiService
    ) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
        this.cloudApi.getIntegrations().subscribe(integrations => {
            this.pluginCount = integrations.data.length || 0;
        });
    }

    ngOnInit() {
        this.currentWindowWidth = window.innerWidth;
    }
};
