import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { filter, map, startWith } from 'rxjs';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { EntityType } from '@pages/reports/reports.types';
import { OrganizationStructure } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-org-sidebar-level',
    templateUrl: './org-sidebar-level.component.html',
    styleUrls: ['./org-sidebar-level.component.scss'],
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        RouterModule,
    ],
    standalone: true,
})
export class NxOrgSidebarLevelComponent {
    organization$$ = input.required<OrganizationStructure>({ alias: 'organization' });
    openLevels$$ = input.required<Set<string>>({ alias: 'openLevels' });
    selectedEntityId$$ = input.required<string | undefined>({ alias: 'selectedEntityId' });
    icons = icons;
    EntityType = EntityType;

    isOpen$$ = computed<boolean>(() => {
        const organization = this.organization$$();
        const openLevels = this.openLevels$$();
        return openLevels.has(organization.id);
    });
    isSelected$$ = computed<boolean>(() => this.organization$$().id === this.selectedEntityId$$());

    currentTab$$ = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(event => (event as NavigationEnd).url.split('/')[4]),
            startWith(this.router.url.split('/')[4]),
        ),
    );
    routerLink$$ = computed<string[]>(() => {
        const orgId = this.organization$$().id;
        const currentTab = this.currentTab$$() || '';
        return ['/reports', EntityType.organization, orgId, currentTab];
    });

    constructor(private router: Router) {}
}
