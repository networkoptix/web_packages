import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { filter, map, startWith } from 'rxjs';

import { highlightRegex } from '@components/search-highlight/highlight-regex';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { EntityType } from '@pages/reports/reports.types';
import { icons } from '@static-variables';

import { NxOrgSidebarLevelComponent } from '../org-sidebar-level/org-sidebar-level.component';
import { FormattedPartnerStructure } from '../reports-sidebar.types';

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
        NxSearchHighlightComponent,
    ],
    standalone: true,
})
export class NxPartnerSidebarLevelComponent {
    partnerStructure$$ = input.required<FormattedPartnerStructure>({ alias: 'partnerStructure' });
    openLevels$$ = input.required<Set<string>>({ alias: 'openLevels' });
    selectedEntityId$$ = input.required<string | undefined>({ alias: 'selectedEntityId' });
    search$$ = input.required<string>({ alias: 'search' });

    icons = icons;
    EntityType = EntityType;

    isOpen$$ = computed<boolean>(() => {
        const partnerStructure = this.partnerStructure$$();
        const openLevels = this.openLevels$$();
        const search = this.search$$();
        return openLevels.has(partnerStructure.id) || !!search;
    });
    hasChildren$$ = computed<boolean>(() => {
        const { subChannels, organizations } = this.partnerStructure$$();
        return subChannels.length > 0 || organizations.length > 0;
    });
    isOpenIconVisible$$ = computed<boolean>(() => this.hasChildren$$() && !this.search$$());
    isSubchannel$$ = computed<boolean>(() => !!this.partnerStructure$$().parentPartner);
    isSelected$$ = computed<boolean>(
        () => this.partnerStructure$$().id === this.selectedEntityId$$(),
    );
    highlightRegex$$ = computed<RegExp | null>(() => highlightRegex(this.search$$()));

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
        this.openEvent.emit(entityId);
    }
    maybeOpenPartner($event: MouseEvent): void {
        const partnerStructure = this.partnerStructure$$();
        const isOpen = this.isOpen$$();
        const openLevels = this.openLevels$$();
        const isSubchannel = this.isSubchannel$$();
        const { parentPartner } = partnerStructure;

        $event.stopPropagation();
        // In the search view it's possible to select a child partner when its parent is not open. We want the parent to
        // be open after exiting the search
        if (parentPartner && !openLevels.has(parentPartner)) {
            this.open(parentPartner);
        }
        // If it's a root partner we want to open it if it isn't already
        else if (!isSubchannel && !isOpen) {
            this.open(partnerStructure.id);
        }
    }
}
