import { AsyncPipe, CommonModule } from '@angular/common';
import {
    Component,
    inject,
    Input,
    OnInit,
    Signal,
    signal,
    ViewChild,
    WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, map, Observable, switchMap, zip } from 'rxjs';
import { catchError, take } from 'rxjs/operators';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import type { SearchFilter } from '@components/search/search.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { ChannelPartnerUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { icons } from '@static-variables';

import { NxChannelPartnersUsersTableComponent } from '../../users-table/refactor/channel-partner-users-table/channel-partner-users-table.component';
import { NxUsersTableComponent } from '../../users-table/users-table.component';

import { ChannelPartnerUsersStore } from './channel-partner-users.store';
import type { UserRecord } from './channel-partner-users.types';
import { UserType } from './channel-partner-users.types';

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
        NxUsersTableComponent,
        NxChannelPartnersUsersTableComponent,
        TranslateModule,
        AngularSvgIconModule,
        NxResizeObserver,
        NxSearchComponent,
        NxPreLoaderComponent,
    ],
})
export class NxChannelPartnerUsersComponent implements OnInit {
    LANG = staticLang;
    CONFIG = nxConfig;
    UserType = UserType;
    icons = icons;
    channelPartnerUsersStore = inject(ChannelPartnerUsersStore);
    Router = inject(Router);

    @Input() inSubchannel: boolean = false;
    searchModel: SearchFilter = { query: '' };
    currentPartnerId$: Observable<string>;
    currentPartnerId$$: Signal<string | undefined>;
    subchannelId$: Observable<string>;
    headers: HEADER_ITEM[] | undefined;
    roles$$ = toSignal(this.CPService.getChannelPartnerRoles());
    filteredRecords$$: WritableSignal<UserRecord[] | undefined> = signal(undefined);
    selectedUsers: { [key: string]: UserRecord } = {};
    selectedCount = 0;
    totalRecords: number;

    @ViewChild(NxChannelPartnersUsersTableComponent)
    channelPartnersUsersTable!: NxChannelPartnersUsersTableComponent;

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private translateService: TranslateService,
    ) {
        this.currentPartnerId$ = this.CPService.paramStateHandler.state$.pipe(
            map(({ params: { partnerId } }) => partnerId),
            distinctUntilChanged(),
        );
        this.currentPartnerId$$ = toSignal(this.currentPartnerId$);

        this.subchannelId$ = this.CPService.paramStateHandler.state$.pipe(
            map(({ params: { subchannelId } }) => subchannelId),
            distinctUntilChanged(),
        );
    }

    ngOnInit(): void {
        this.headers = [
            {
                name: 'email',
                value: this.LANG.channelPartners.usersTableHeaders.email,
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
            .subscribe(records => {
                this.channelPartnerUsersStore.setRecords(records);
                this.totalRecords = this.channelPartnerUsersStore.filteredRecords$$().length;
            });
    }

    get hasSelectedUsers(): boolean {
        return !!this.selectedUsersLength;
    }

    get hasSelectedMultipleUsers(): boolean {
        return this.selectedUsersLength > 1;
    }

    get selectedUsersLength(): number {
        return Object.keys(this.selectedUsers).length;
    }

    newUserDialog(id?: string): void {
        const partnerId = id || this.currentPartnerId$$();
        if (this.inSubchannel) {
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

    // Temporary any typing for table refactor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateSelectedUsers(users: any): void {
        this.selectedUsers = users;
    }

    deleteChannelPartnerUser(user?: UserRecord): void {
        if (!user) {
            user = this.selectedUsers[Object.keys(this.selectedUsers)[0]];
        }
        const message = this.hasSelectedMultipleUsers
            ? this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.multipleMessage,
                  {
                      count: this.selectedUsersLength,
                  },
              )
            : this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.channelPartner.singleMessage,
                  {
                      email: user.email,
                      permission: user.roles[0],
                  },
              );
        this.dialogsService
            .confirm(
                {
                    message,
                    title: this.LANG.channelPartners.usersTable.deleteDialog.deleteAccess,
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
                    const id = this.currentPartnerId$$();
                    if (id && this.hasSelectedMultipleUsers) {
                        // Todo: update this to bulk delete once added to API
                        const requests: Observable<void>[] = [];
                        for (const user of Object.values(this.selectedUsers)) {
                            requests.push(this.CPService.deleteChannelPartnerUser(id, user.email));
                        }
                        zip(requests)
                            .pipe(
                                catchError(err => {
                                    throw err;
                                }),
                            )
                            .subscribe(_ => {
                                this.channelPartnerUsersStore.removeRecords(
                                    Object.values(this.selectedUsers).map(user => user.userId),
                                );
                                this.selectedUsers = {};
                            });
                    } else if (id) {
                        const { email } = user;
                        this.CPService.deleteChannelPartnerUser(id, email)
                            .pipe(
                                catchError(err => {
                                    throw err;
                                }),
                            )
                            .subscribe({
                                error: err => console.error(err),
                                next: () => {
                                    this.channelPartnerUsersStore.removeRecord(user?.userId);
                                },
                            });
                    }
                }
            });
    }

    sortRecords(): void {
        alert('Will implement sort');
    }

    updateSelectedCount(count: number): void {
        this.selectedCount = count;
    }
}
