import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, effect, inject, Input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
import { addEntity, removeEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, map, Observable, switchMap } from 'rxjs';
import { catchError, take } from 'rxjs/operators';

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

const UserStore = signalStore(
    withEntities<UserRecord>(),
    withMethods(store => ({
        addUser: user => patchState(store, addEntity(user, { idKey: 'userId' })),
        removeUser: user => patchState(store, removeEntity(user)),
        setUsers: users => patchState(store, setAllEntities(users, { idKey: 'userId' })),
    })),
);

@Component({
    selector: 'nx-channel-partner-users',
    templateUrl: 'channel-partner-users.component.html',
    styleUrls: [
        'channel-partner-users.component.scss',
        '../../../organizations/cards-container/org-cards-container.component.scss',
    ],
    standalone: true,
    providers: [UserStore],
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
    userStore = inject(UserStore);

    @Input() inSubchannel: boolean = false;
    searchModel: SearchFilter = { query: '' };
    currentPartnerId$: Observable<string>;
    subchannelId$: Observable<string>;
    headers: HEADER_ITEM[] | undefined;
    roles$$ = toSignal(this.CPService.getChannelPartnerRoles());
    searchQuery$$ = signal<string>('');
    filteredRecords: UserRecord[] | undefined = undefined;
    selectedUserEmail: string | undefined;

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private translateService: TranslateService,
    ) {
        this.currentPartnerId$ = this.CPService.paramStateHandler.state$.pipe(
            map(({ params: { partnerId } }) => partnerId),
            distinctUntilChanged(),
        );

        this.subchannelId$ = this.CPService.paramStateHandler.state$.pipe(
            map(({ params: { subchannelId } }) => subchannelId),
            distinctUntilChanged(),
        );

        this.searchQuery$$.set(this.searchModel.query);

        effect(() => {
            const searchQuery = this.searchQuery$$();

            const users = this.userStore.entities();
            if (!users) {
                this.filteredRecords = undefined; // avoid showing "No data" msg.
            } else if (searchQuery?.length) {
                this.filteredRecords = this.getUsersByModel(users, searchQuery);
            } else {
                this.filteredRecords = users;
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

        const currentItem = this.inSubchannel ? this.subchannelId$ : this.currentPartnerId$;
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
            .subscribe(users => this.userStore.setUsers(users));
    }

    newUserDialog(partnerId: string): void {
        let reqId = partnerId;
        if (this.inSubchannel) {
            this.CPService.paramStateHandler.state$
                .pipe(
                    map(({ params }) => params.subchannelId),
                    take(1),
                )
                .subscribe(id => {
                    reqId = id;
                });
        }
        this.dialogsService.addPartnerUser(reqId).then(user => {
            this.userStore.addUser({
                ...user,
                userId: user.email,
                userType: UserType.CHANNEL_PARTNER,
            });
        });
    }

    selectUser(rec: UserRecord): void {
        this.selectedUserEmail = rec.userId;
    }

    deleteChannelPartnerUser(user: UserRecord): void {
        this.dialogsService
            .confirm(
                {
                    message: this.translateService.instant(
                        this.LANG.channelPartners.usersTable.deleteDialog.channelPartner
                            .singleMessage,
                        {
                            email: user.email,
                            permission: user.roles[0],
                        },
                    ),
                    title: this.LANG.channelPartners.usersTable.deleteDialog.title,
                    footer: {
                        actionLabel:
                            this.LANG.channelPartners.usersTable.deleteDialog.footer.actionLabel,
                        cancelLabel:
                            this.LANG.channelPartners.usersTable.deleteDialog.footer.cancelLabel,
                        buttonClass: 'btn-danger',
                    },
                },
                { width: '313px' },
            )
            .then(confirm => {
                if (confirm) {
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
                            next: () => {
                                this.userStore.removeUser(email);
                            },
                        });
                }
            });
    }
}
