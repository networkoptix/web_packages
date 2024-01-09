import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, effect, OnInit, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, map, Observable, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { NxSearchComponent } from '@components/search/search.component';
import type { SearchFilter } from '@components/search/search.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { caseInsenstiveSearch } from '@utils/general';

import { NxUsersTableComponent } from '../../users-table/users-table.component';

import type { UserRecord } from './channel-partner-users.types';
import { UserType } from './channel-partner-users.types';

@Component({
    selector: 'nx-channel-partner-users',
    templateUrl: 'channel-partner-users.component.html',
    styleUrls: [
        'channel-partner-users.component.scss',
        '../../../organizations/cards-container/org-cards-container.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AsyncPipe,
        NxUsersTableComponent,
        TranslateModule,
        AngularSvgIconModule,
        NxResizeObserver,
        NxSearchComponent,
    ],
})
export class NxChannelPartnerUsersComponent implements OnInit {
    LANG = staticLang;
    UserType = UserType;

    searchModel: SearchFilter = { query: '' };
    currentPartnerId$: Observable<string>;
    headers: HEADER_ITEM[] | undefined;
    records$: Observable<UserRecord[]>;
    records$$: Signal<UserRecord[] | undefined>;
    roles$$ = toSignal(this.CPService.getChannelPartnerRoles());
    searchQuery$$ = signal<string>('');
    filteredRecords: UserRecord[] | undefined = undefined;
    selectedUserEmail: string | undefined;
    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
    ) {
        this.currentPartnerId$ = this.CPService.paramStateHandler.state$.pipe(
            map(({ params: { partnerId } }) => partnerId),
            distinctUntilChanged(),
        );

        this.records$ = this.currentPartnerId$.pipe(
            switchMap(id => this.CPService.getChannelPartnerUsers(id)),
            map(users =>
                users.map(user => ({
                    ...user,
                    userId: user.email,
                    userType: UserType.CHANNEL_PARTNER,
                })),
            ),
        );

        this.records$$ = toSignal(this.records$);
        this.searchQuery$$.set(this.searchModel.query);

        effect(() => {
            const records = this.records$$();
            const searchQuery = this.searchQuery$$();

            if (!records) {
                this.filteredRecords = undefined; // avoid showing "No data" msg.
            } else if (searchQuery?.length) {
                this.filteredRecords = this.getUsersByModel(records, searchQuery);
            } else {
                this.filteredRecords = records;
            }
        });
    }

    getUsersByModel(records: UserRecord[] | undefined, query: string): UserRecord[] {
        if (records) {
            return records.filter(user => caseInsenstiveSearch(user.email, query));
        }
        return [];
    }

    setQuery(model: SearchFilter): void {
        this.searchQuery$$.set(model.query);
    }

    // filteredRecords$$ = computed(() => {
    //     const records = this.records$$();
    //     const searchQuery = this.searchQuery$$();
    //
    //     if (!records) {
    //         return undefined; // avoid showing "No data" msg.
    //     } else if (searchQuery?.length) {
    //         return records.filter(user => caseInsenstiveSearch(user.email, searchQuery));
    //     } else {
    //         return records;
    //     }
    // });

    ngOnInit(): void {
        this.headers = [
            {
                name: 'email',
                value: this.LANG.channelPartners.usersTableHeaders.login,
                sort: 'string',
            },
            {
                name: 'fullName',
                value: this.LANG.channelPartners.usersTableHeaders.fullName,
                sort: 'string',
            },
            { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
        ];
    }

    newUserDialog(partnerId: string): void {
        this.dialogsService.addPartnerUser(partnerId);
    }

    selectUser(rec: UserRecord): void {
        this.selectedUserEmail = rec.userId;
    }

    deleteChannelPartnerUser(user: UserRecord): void {
        const { email } = user;
        this.currentPartnerId$
            .pipe(
                switchMap(id => this.CPService.deleteChannelPartnerUser(id, email)),
                catchError(err => {
                    throw err;
                }),
            )
            .subscribe({
                error: err => console.error(err),
            });
    }
}
