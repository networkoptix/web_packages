import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, Input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LetDirective } from '@ngrx/component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { map } from 'rxjs';
import { filter } from 'rxjs/operators';

import { ActionItems } from '@components/dropdowns/three-dot/three-dot.component.types';
import { NxMultiLineEllipsisComponent } from '@components/multi-line-ellipsis/mle.component';
import { NxNoSystemsComponent } from '@components/no-systems/no-systems.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { SearchFilter } from '@components/search/search.component.types';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxCardComponent } from '@pages/home/components/card/card.component';
import type { Account } from '@services/account.service/account';
import { nxConfig } from '@services/nx-config/config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { NxUriService } from '@services/uri.service';
import { NxVmsClientService } from '@services/vms-client.service';
import { icons, search } from '@static-variables';
import { caseInsensitiveSearch } from '@utils/general';
import { isUserSystem } from '@utils/nx';

@Component({
    selector: 'nx-home-systems-list',
    templateUrl: './systems-list.component.html',
    styleUrls: ['./systems-list.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        NxCardComponent,
        NxSearchComponent,
        ReactiveFormsModule,
        NxPreLoaderComponent,
        NxNoSystemsComponent,
        NxMultiLineEllipsisComponent,
        NxSearchHighlightComponent,
        RouterLink,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxTagComponent,
        LetDirective,
    ],
})
export class HomeSystemListComponent {
    CONFIG: IConfig = nxConfig;
    LANG = staticLang;
    dialogs = inject(NxDialogsService);
    router = inject(Router);
    systemsService = inject(NxSystemsService);
    translateService = inject(TranslateService);
    uriService = inject(NxUriService);
    clientService = inject(NxVmsClientService);

    directAccessSystems$$ = input.required<NxSystemInfo[]>({ alias: 'directAccessSystems' });
    isUserSystem = isUserSystem;

    @Input({ required: true }) account: Account;

    search = new FormControl<SearchFilter>({ query: '' });
    search$$ = toSignal(
        this.search.valueChanges.pipe(
            // debounceTime(100),
            filter(query => query !== null),
            map(searchFilter => searchFilter?.query || ''),
        ),
        { initialValue: '' },
    );
    showSearch$$ = computed<boolean>(
        () => this.directAccessSystems$$().length >= search.minSystems,
    );
    visibleSystems$$ = computed(() => {
        const systems = this.directAccessSystems$$();
        const searchText = this.search$$() || '';
        return systems.filter(system => {
            const ownerText = this.systemsService.getSystemOwnerName(system);
            return (
                caseInsensitiveSearch(system.name, searchText) ||
                (ownerText !== this.LANG.system.yourSystem &&
                    caseInsensitiveSearch(ownerText, searchText))
            );
        });
    });

    actionItemsForSystems$$ = computed<Record<string, ActionItems[]>>(() => {
        const systems = this.directAccessSystems$$();
        const openVms = this.translateService.instant('Open in %VMS_NAME%');
        return systems.reduce((actionMap, system) => {
            const actions: ActionItems[] = [];
            if (system.stateOfHealth === 'online') {
                actions.push({
                    name: openVms,
                    id: system.id,
                    action: () => this.clientService.openClient(system),
                });
            }
            actionMap[system.id] = actions;
            return actionMap;
        }, {});
    });

    tagType(state: string): string {
        return this.CONFIG.system.status[state]?.style || this.CONFIG.system.status.default.style;
    }

    trackItem(index: number, item: NxSystemInfo): string | undefined {
        return item?.id;
    }

    openSystem(systemId: string): void {
        this.uriService
            .updateURI(environment.isWebadmin ? '/settings' : `/systems/${systemId}`, {
                search: undefined,
            })
            .catch(err => {
                console.error(err);
            });
    }

    protected readonly icons = icons;
}
