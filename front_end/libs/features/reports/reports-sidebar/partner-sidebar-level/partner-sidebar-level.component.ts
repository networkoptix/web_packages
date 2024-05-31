import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { filter, map, startWith } from 'rxjs';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { EntityType } from '@pages/reports/reports.types';
import { PartnerStructure } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

import { NxOrgSidebarLevelComponent } from '../org-sidebar-level/org-sidebar-level.component';

@Component({
    selector: 'nx-partner-sidebar-level',
    templateUrl: './partner-sidebar-level.component.html',
    styleUrls: ['./partner-sidebar-level.component.scss'],
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxOrgSidebarLevelComponent,
        RouterModule,
    ],
    standalone: true,
})
export class NxPartnerSidebarLevelComponent {
    partnerStructure$$ = input.required<PartnerStructure>({ alias: 'partnerStructure' });
    openLevels$$ = input.required<Set<string>>({ alias: 'openLevels' });
    selectedEntityId$$ = input.required<string | undefined>({ alias: 'selectedEntityId' });
    icons = icons;
    EntityType = EntityType;

    isOpen$$ = computed<boolean>(() => {
        const partnerStructure = this.partnerStructure$$();
        const openLevels = this.openLevels$$();
        return openLevels.has(partnerStructure.id);
    });
    hasChildren$$ = computed<boolean>(() => {
        const { subChannels, organizations } = this.partnerStructure$$();
        return subChannels.length > 0 || organizations.length > 0;
    });
    isSelected$$ = computed<boolean>(
        () => this.partnerStructure$$().id === this.selectedEntityId$$(),
    );

    currentTab$$ = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(event => (event as NavigationEnd).url.split('/')[4]),
            startWith(this.router.url.split('/')[4]),
        ),
    );
    routerLink$$ = computed<string[]>(() => {
        const partnerId = this.partnerStructure$$().id;
        const currentTab = this.currentTab$$() || '';
        return ['/reports', EntityType.channelPartner, partnerId, currentTab];
    });

    @Output() toggleOpenEvent = new EventEmitter<string>();
    @Output() openEvent = new EventEmitter<string>();

    constructor(private router: Router) {}

    toggleOpen(entityId: string): void {
        this.toggleOpenEvent.emit(entityId);
    }
    open(entityId: string): void {
        if (this.hasChildren$$()) {
            this.openEvent.emit(entityId);
        }
    }
}
