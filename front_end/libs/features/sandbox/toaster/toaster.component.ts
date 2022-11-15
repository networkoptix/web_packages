import { Component, OnDestroy, OnInit } from '@angular/core';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';

@Component({
    selector: 'toaster',
    templateUrl: 'toaster.component.html',
    styleUrls: ['toaster.component.scss']
})
export class ToasterComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG = staticLang;

    autohide: boolean;
    ribbonType: string;

    constructor(
        configService: NxConfigService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private ribbonService: NxRibbonService,
        private processService: NxProcessService,
    ) {
        this.CONFIG = configService.getConfig();
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

    refreshHealth(): void {
    }

    notify(msg: string, type: string): void {
        this.dialogs.notify(msg, type, !this.autohide);
    }

    click(): void {
        alert('CLICK!');
    }
}
