import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { map } from 'rxjs';
import { filter } from 'rxjs/operators';

import { ActionItems } from '@components/dropdowns/three-dot/three-dot.component.types';
import { NxMultiLineEllipsisComponent } from '@components/multi-line-ellipsis/mle.component';
import { NxNoSystemsComponent } from '@components/no-systems/no-systems.component';
import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';
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
import { NxSystemInfo } from '@services/systems.service.types';
import { NxUriService } from '@services/uri.service';
import { NxUrlProtocolService } from '@services/url-protocol.service';
import { icons, search } from '@static-variables';
import { caseInsenstiveSearch } from '@utils/general';

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
        NxClientButtonComponent,
        NxTagComponent,
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
    urlProtocol = inject(NxUrlProtocolService);

    private nonOrgSystemsIds$$ = signal<string[]>([]);
    @Input() set nonOrgSystemsIds(systems: string[]) {
        this.nonOrgSystemsIds$$.set(systems);
    }

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
    showSearch$$ = computed<boolean>(() => this.nonOrgSystems$$().length >= search.minSystems);
    systems$$ = toSignal(this.systemsService.systemsSubject, { initialValue: [] });
    nonOrgSystems$$ = computed<NxSystemInfo[]>(() => {
        const systems = this.systems$$();
        const nonOrgSystemIds = this.nonOrgSystemsIds$$();
        return systems.filter(({ id }) => nonOrgSystemIds.includes(id));
    });
    visibleSystems$$ = computed(() => {
        const systems = this.nonOrgSystems$$();
        const searchText = this.search$$() || '';
        return systems.filter(system => {
            const ownerText = this.systemsService.getSystemOwnerName(system);
            return (
                caseInsenstiveSearch(system.name, searchText) ||
                (ownerText !== this.LANG.system.yourSystem &&
                    caseInsenstiveSearch(ownerText, searchText))
            );
        });
    });

    actionItemsForSystems$$ = computed<Record<string, ActionItems[]>>(() => {
        const systems = this.nonOrgSystems$$();
        const openVms = this.translateService.instant('Open in %VMS_NAME%');
        return systems.reduce((actionMap, { id, useRest }) => {
            actionMap[id] = [
                { name: openVms, id, action: () => this.protocolFactory(id, useRest) },
            ];
            return actionMap;
        }, {});
    });

    protocolFactory = (id: string, useRest: boolean) => () =>
        this.urlProtocol.open(id, useRest).catch(() =>
            this.dialogs
                .confirm({
                    title: this.LANG.dialogs.titles.noClientDetected,
                    message: this.LANG.errorCodes.cantOpenClient,
                    footer: {
                        actionLabel: this.LANG.dialogs.buttons.download,
                        cancelLabel: this.LANG.dialogs.buttons.cancel,
                    },
                })
                .then(result => {
                    if (result) {
                        this.router.navigate(['/download']).catch(error => {
                            console.error(error);
                        });
                    }
                }),
        );

    tagType(state: string): string {
        return this.CONFIG.system.status[state]?.style || this.CONFIG.system.status.default.style;
    }

    trackItem(index: number, item: NxSystemInfo): string | undefined {
        return item?.id;
    }

    openSystem(systemId: string): void {
        this.uriService
            .updateURI(environment.isLocal ? '/settings' : `/systems/${systemId}`, {
                search: undefined,
            })
            .catch(err => {
                console.error(err);
            });
    }

    protected readonly icons = icons;
}
