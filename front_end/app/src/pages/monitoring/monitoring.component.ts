import {
    Component,
} from '@angular/core';
import {
    UntilDestroy, untilDestroyed,
} from '@ngneat/until-destroy';

import { NxMenuService } from '../../menu/menu.service';
import { Content } from '../../menu/menu.types';
import { NxAppSourceService } from '../../services/nx-app-source.service';
import { NxSystem } from '../../services/system.service';
import { NxSettingsService } from '../systems/settings/settings.service';

@UntilDestroy()
@Component({
    selector: 'nx-monitoring',
    styleUrls: ['monitoring.component.scss'],
    templateUrl: 'monitoring.component.html',
})
export class NxMonitoringComponent {
    content: Content;
    system: NxSystem;

    constructor(
        private menuService: NxMenuService,
        private sourceService: NxAppSourceService,
        private settingsService: NxSettingsService,
    ) {
        this.content = {
            base: '',
            selectedSection: 'graphs',
            selectedSubSection: '',
            level1: [
                {
                    id: 'graphs',
                    svg: 'system',
                    label: 'Graphs',
                    path: '',
                }, {
                    id: 'logs',
                    svg: 'server',
                    label: 'Logs',
                    path: 'logs',
                }
            ]
        };

        this.settingsService.systemSubject
            .pipe(untilDestroyed(this))
            .subscribe(system => {
                if (system) {
                    this.system = system;
                    this.content.base = this.sourceService.getMonitoringMenuBase(system);
                    this.content = { ...this.content }; // trigger onChange
                }
            });

        this.menuService.selectedSectionSubject
            .pipe(untilDestroyed(this))
            .subscribe(selection => {
                if (this.content.selectedSection === selection) {
                    return;
                }
                this.content.selectedSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });
    }
}
