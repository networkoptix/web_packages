import { Component, OnDestroy, OnInit } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';
import { NxProcessService } from '@services/process.service';

@Component({
    selector: 'toaster',
    templateUrl: 'toaster.component.html',
    styleUrls: ['toaster.component.scss'],
})
export class ToasterComponent implements OnInit, OnDestroy {
    LANG = staticLang;

    autohide: boolean;
    ribbonType: string;
    icons = icons;

    constructor(
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private ribbonService: NxRibbonService,
        private processService: NxProcessService,
    ) {}

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
                this.LANG.common.viewingOutdatedReport,
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
                this.LANG.ribbon.newVersionAvailable.notification,
                [{
                    type: 'process-button',
                    text: this.LANG.ribbon.newVersionAvailable.installButton,
                    value: this.processService.createProcess(() => {
                        return Promise.resolve();
                    })
                }]);
        }
    }

    refreshHealth(): void {}

    notify(msg: string, type: string): void {
        this.dialogs.notify(msg, type, !this.autohide);
    }

    click(): void {
        alert('CLICK!');
    }
}
