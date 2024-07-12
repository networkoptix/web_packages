import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { filter, map, startWith } from 'rxjs';

import { highlightRegex } from '@components/search-highlight/highlight-regex';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
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
        NxSearchHighlightComponent,
    ],
    standalone: true,
})
export class NxOrgSidebarLevelComponent {
    organization$$ = input.required<OrganizationStructure>({ alias: 'organization' });
    openLevels$$ = input.required<Set<string>>({ alias: 'openLevels' });
    selectedEntityId$$ = input.required<string | undefined>({ alias: 'selectedEntityId' });
    search$$ = input.required<string>({ alias: 'search' });

    icons = icons;
    EntityType = EntityType;

    isSelected$$ = computed<boolean>(() => this.organization$$().id === this.selectedEntityId$$());
    highlightRegex$$ = computed<RegExp | null>(() => highlightRegex(this.search$$()));

    currentTab$$ = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(event => (event as NavigationEnd).url.split('/')[4]),
            startWith(this.router.url.split('/')[4]),
            map(tab => tab.split('?')[0]),
        ),
    );
    routerLink$$ = computed<string[]>(() => {
        const orgId = this.organization$$().id;
        const currentTab = this.currentTab$$() || '';
        return ['/reports', EntityType.organization, orgId, currentTab];
    });

    @Output() openParentEvent = new EventEmitter<string>();

    constructor(private router: Router) {}

    handleSelection($event: MouseEvent): void {
        $event.stopPropagation();
        // In the search view we can select a child org when its parent partner is not open. We then want the parent to
        // be open after exiting the search
        this.openParentEvent.emit(this.organization$$().id);
    }
}
