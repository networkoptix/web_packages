import { AsyncPipe, CommonModule } from '@angular/common';
import {
    Component,
    computed,
    effect,
    inject,
    Input,
    OnInit,
    signal,
    Signal,
    untracked,
    ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, map, Observable, switchMap } from 'rxjs';
import { take } from 'rxjs/operators';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import type { SearchFilter } from '@components/search/search.component.types';
import { NxFilterTagsComponent } from '@components/tag-filter/tag.component';
import { UserFilter } from '@dialogs/channel-partners/filter-users/filter-users.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { ChannelPartnerUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

import { NxChannelPartnersUsersTableComponent } from '../../users-tables/channel-partner-users-table/channel-partner-users-table.component';

import { ChannelPartnerUsersStore } from './channel-partner-users.store';
import { UserRecord, UserType } from './channel-partner-users.types';

const mapCpUser = (user: ChannelPartnerUser): UserRecord => {
    return {
        ...user,
        userId: user.email,
        userType: UserType.CHANNEL_PARTNER,
    };
};

@Component({
    selector: 'nx-channel-partner-users',
    templateUrl: 'channel-partner-users.component.html',
    styleUrls: [
        'channel-partner-users.component.scss',
        '../../../organizations/cards-container/org-cards-container.component.scss',
    ],
    standalone: true,
    providers: [ChannelPartnerUsersStore],
    imports: [
        CommonModule,
        FormsModule,
        AsyncPipe,
        NxChannelPartnersUsersTableComponent,
        TranslateModule,
        AngularSvgIconModule,
        NxResizeObserver,
        NxSearchComponent,
        NxPreLoaderComponent,
        NxFilterTagsComponent,
    ],
})
export class NxChannelPartnerUsersComponent implements OnInit {
    LANG = staticLang;
    icons = icons;
    channelPartnerUsersStore = inject(ChannelPartnerUsersStore);
    Router = inject(Router);

    @Input() inSubChannel: boolean = false;
    searchModel: SearchFilter = { query: '' };
    currentPartnerId$: Observable<string>;
    currentPartnerId$$: Signal<string | undefined>;
    subChannelId$: Observable<string>;
    selectedCount = 0;
    totalRecords: number = 0;

    @ViewChild(NxChannelPartnersUsersTableComponent)
    channelPartnersUsersTable!: NxChannelPartnersUsersTableComponent;

    filters$$ = signal<UserFilter[]>([]);

    searchFilters$$ = computed<Record<string, unknown>>(() => {
        const filters = this.filters$$();
        if (!filters) {
            return {};
        }
        const searchFilters: Record<string, unknown> = {};
        filters.forEach(filter => {
            if (filter.selected) {
                searchFilters[filter.group] = filter.value;
            }
        });
        return searchFilters;
    });
    updateSearchEffect = effect(() => {
        this.filters$$();
        untracked(() => {
            this.channelPartnerUsersStore.setSearchFilters(this.searchFilters$$());
        });
    });

    constructor(
        private route: ActivatedRoute,
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private dialogs: NxDialogsService,
    ) {
        this.currentPartnerId$ = this.CPService.paramStateHandler.state$.pipe(
            map(({ params: { partnerId } }) => partnerId),
            distinctUntilChanged(),
        );
        this.currentPartnerId$$ = toSignal(this.currentPartnerId$);

        this.subChannelId$ = this.CPService.paramStateHandler.state$.pipe(
            map(({ params: { subchannelId } }) => subchannelId),
            distinctUntilChanged(),
        );
    }

    ngOnInit(): void {
        const searchParam = this.route.snapshot.queryParamMap.get('search') || '';

        this.searchModel.query = searchParam;
        this.setQuery(this.searchModel);

        const currentItem = this.inSubChannel ? this.subChannelId$ : this.currentPartnerId$;
        currentItem
            .pipe(
                take(1),
                switchMap(id => this.CPService.getChannelPartnerUsers(id)),
                map(users =>
                    users.map(user => ({
                        ...user,
                        userId: user.email,
                        userType: UserType.CHANNEL_PARTNER,
                    })),
                ),
            )
            .subscribe(records => {
                this.channelPartnerUsersStore.setRecords(records);
                this.totalRecords = this.channelPartnerUsersStore.filteredRecords$$().length;
            });
    }

    newUserDialog(id?: string): void {
        const partnerId = id || this.currentPartnerId$$();
        if (this.inSubChannel) {
            this.CPService.paramStateHandler.state$
                .pipe(
                    map(({ params }) => params.subchannelId),
                    take(1),
                )
                .subscribe(id => {
                    this.dialogsService
                        .addPartnerUser({
                            partnerId,
                            users: this.channelPartnerUsersStore.entities(),
                        })
                        .then(user => {
                            if (user) {
                                this.channelPartnerUsersStore.addRecord(mapCpUser(user));
                            }
                        });
                });
        } else {
            this.dialogsService
                .addPartnerUser({ partnerId, users: this.channelPartnerUsersStore.entities() })
                .then(user => {
                    if (user) {
                        this.channelPartnerUsersStore.addRecord(mapCpUser(user));
                    }
                });
        }
    }

    sortRecords(): void {
        alert('Will implement sort');
    }

    updateSelectedCount(count: number): void {
        this.selectedCount = count;
    }

    setQuery(model: SearchFilter): void {
        this.channelPartnerUsersStore.setSearchQuery(model.query);
    }

    filterRecords(): void {
        this.dialogs.filterUsers(null).then(filters => {
            this.filters$$.update(() => filters);
        });
    }

    updateFilters({
        idx,
        value,
        remove = false,
    }: {
        idx: number;
        value: boolean;
        remove?: boolean;
    }): void {
        this.filters$$.update(filters => {
            const newFilters: UserFilter[] = [...filters];
            if (remove) {
                newFilters.splice(idx, 1);
            } else {
                newFilters[idx].selected = value;
            }

            return newFilters;
        });
    }
}
