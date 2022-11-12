import { Component, OnDestroy, OnInit } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';

@Component({
    selector: 'toaster',
    templateUrl: 'toaster.component.html',
    styleUrls: ['toaster.component.scss']
})
export class ToasterComponent implements OnInit, OnDestroy {
    LANG: LanguageI18NStaticTypes;

    autohide: boolean;
    ribbonType: string;
    icons = icons;

    constructor(
        languageService: NxLanguageProviderService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private ribbonService: NxRibbonService,
        private processService: NxProcessService,
    ) {
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        this.menuService.section = 'components';
        this.menuService.detail = 'toaster';
    }

    ngOnDestroy(): void {
        this.ribbonService.hide();
    }

    showAlertRibbon(): void {
        this.ribbonService.hide();
        if (this.ribbonType) {
            this.ribbonService.show(
                this.LANG.common.viewingOutdatedReport(),
                [{ type: 'link', text: 'Refresh', value: '' }],
                this.ribbonType,
                this.refreshHealth
            );
        }
    }

    showInfoRibbon(): void {
        this.ribbonService.hide();
        if (this.ribbonType) {
            this.ribbonService.show(
                this.LANG.ribbon.newVersionAvailable.notification(),
                [{
                    type: 'process-button',
                    text: this.LANG.ribbon.newVersionAvailable.installButton(),
                    value: this.processService.createProcess(() => {
                        return Promise.resolve();
                    })
                }]);
        }
    }

    refreshHealth(): void {
    }

    notify(msg: string, type: string): void {
        this.dialogs.notify(msg, type, !this.autohide);
    }

    click(): void {
        alert('CLICK!');
    }
}
