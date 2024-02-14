import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, Subscription, of } from 'rxjs';
import {
    catchError,
    delay,
    distinctUntilChanged,
    filter,
    map,
    switchMap,
    take,
    timeout,
} from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { ToastType } from '@components/toast-container/toast.types';
import staticLang from '@language_static';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';
import { isObject } from '@utils/general';

import type { GroupsItem } from '../home.types';
import * as GroupActions from '../store/groups/groups.actions';

import { NxChannelPartnersService } from './channel-partners.service';
import {
    WebSocketAction,
    WebSocketIncoming,
    WebSocketOutgoing,
} from './system-groups.service.types';

@Injectable({ providedIn: 'root' })
export class NxSystemGroupsService {
    LANG = staticLang;
    private WEBSOCKET_URL: string;
    private readonly MAX_RECONNECT_ATTEMPTS = 8; // Total time is 510 seconds. Which is the sum  of series 2 * 2 ** x from 1 to 8.
    private attempt = 0;
    queue: WebSocketOutgoing[] = [];

    paramStateHandler = this.CPService.paramStateHandler;

    constructor(
        private store: Store,
        private http: HttpClient,
        private router: Router,
        private toastService: NxToastService,
        private CPService: NxChannelPartnersService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.WEBSOCKET_URL = `wss://${this.window.location.host}/system_groups/ws`;

        // Handles managing the connection to the WebSocket
        this.paramStateHandler.state$
            .pipe(
                switchMap(({ params: { organizationId = null, partnerId = null } }) =>
                    organizationId
                        ? of(true)
                        : of(false).pipe(delay(partnerId ? 30 * 1000 : 10 * 1000)),
                ),
                distinctUntilChanged(),
                takeUntilDestroyed(),
            )
            .subscribe(connect => {
                if (connect) {
                    this.connect();
                } else {
                    this.disconnect();
                }
            });

        // Handles clearing groups on org change
        this.paramStateHandler.state$
            .pipe(
                map(({ params: { organizationId } }) => organizationId),
                distinctUntilChanged(),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.store.dispatch(GroupActions.setItems({ items: [] })));
    }

    private connection$: WebSocketSubject<WebSocketIncoming | WebSocketOutgoing>;

    // TODO: This needs to be revisted. The reconnect logic needs to be updated and probably don't need to keep a reference to the connection.
    connectionSubscription: Subscription;
    connected = new BehaviorSubject(false);
    connect(): Observable<boolean> {
        if (!this.connectionSubscription) {
            this.connectionSubscription = this.http
                .post<{ code: string }>('/api/systems/*/code', null)
                .pipe(
                    map(response => this.WEBSOCKET_URL + `?code=${response.code}`),
                    switchMap(url => {
                        this.connection$ = webSocket(url);
                        return this.connection$;
                    }),
                )
                .subscribe({
                    next: value => {
                        this.receive(value as WebSocketIncoming);
                        this.connected.next(true);
                    },
                    error: err => {
                        console.error('WebSocket error:', err);
                        this.progressiveDelayReconnect();
                    },
                    complete: () => {
                        // Assuming that we never want to deliberately close the
                        // socket while in the component so if it does close we
                        // try to reconnect
                        console.info('WebSocket connection closed');
                        if (this.router.url.startsWith('/home')) {
                            this.progressiveDelayReconnect();
                        }
                    },
                });
        }

        return this.connected.pipe(
            filter(Boolean),
            timeout(5000),
            catchError(() => Promise.resolve(false)),
            take(1),
        );
    }

    private progressiveDelayReconnect(): void {
        if (this.attempt >= this.MAX_RECONNECT_ATTEMPTS) {
            this.toastService.remove();
            this.toastService.show(this.LANG.systemGroups.couldNotReconnect, ToastType.Danger);
            return;
        }
        this.disconnect();
        this.toastService.show(this.LANG.systemGroups.connectionLost, ToastType.Danger);
        this.attempt += 1;
        setTimeout(
            () => {
                this.connect();
            },
            2000 * 2 ** this.attempt,
        );
    }

    disconnect(): void {
        this.connected.next(false);
        this.connectionSubscription?.unsubscribe();
        this.connection$?.complete();
        this.connection$ = undefined;
        this.connectionSubscription = undefined;
    }

    private send(data: WebSocketOutgoing): void {
        if (!this.connection$) {
            this.queue.push(data);
            if (!this.connectionSubscription) {
                console.error('No WebSocket connection');
                this.progressiveDelayReconnect();
                this.toastService.notify(this.LANG.systemGroups.noConnection, ToastType.Danger);
            }
            return;
        }
        this.connection$.next(data);
    }

    private receive({ action, data }: WebSocketIncoming): void {
        if (action === 'connected') {
            this.send({ action: WebSocketAction.SYSTEMS });
            while (this.queue.length) {
                this.send(this.queue.shift());
            }
            if (this.attempt > 0) {
                this.attempt = 0;
                this.toastService.remove();
                this.toastService.notify(
                    this.LANG.systemGroups.connectionRestored,
                    ToastType.Success,
                );
            }
            return;
        }
        if (isObject(data) && 'error' in data) {
            this.toastService.notify(
                this.LANG.systemGroups.errorMsg[data.msg] ?? data.msg,
                ToastType.Danger,
            );
            return;
        }
        switch (action) {
            case WebSocketAction.CREATE_GROUP:
            case WebSocketAction.DELETE_GROUP:
            case WebSocketAction.MOVE_GROUP:
            case WebSocketAction.MOVE_SYSTEM:
                // Automatically sends back updated list_groups
                break;
            case WebSocketAction.LIST_GROUPS:
                this.store.dispatch(GroupActions.setItems({ items: data }));
                break;
            case WebSocketAction.SYSTEMS:
                this.store.dispatch(GroupActions.setSystemInfo({ orgSystems: data }));
                break;
        }
    }

    onDrop(src: GroupsItem, dest: GroupsItem | null): void {
        if (src.id === dest?.id) {
            this.toastService.notify(this.LANG.systemGroups.addGroupToSelf, ToastType.Danger);
        }

        const parent = src.type === 'group' ? src.parent_group_id : src.group_id;
        if ((!parent && !dest) || parent === dest?.id) {
            const destName = dest ? dest.name : this.LANG.systemGroups.root;
            const msg =
                src.type === 'group'
                    ? {
                          value: this.LANG.systemGroups.groupAlreadyIn,
                          params: { srcName: src.name, destName },
                      }
                    : {
                          value: this.LANG.systemGroups.systemAlreadyIn,
                          params: { srcName: src.name, destName },
                      };
            this.toastService.notify(msg, ToastType.Info);
            return;
        }

        if (src.type === 'group') {
            this.moveGroup(src.id, dest ? dest.id : null);
        } else if (src.type === 'system') {
            this.moveSystem(src.id, dest ? dest.id : null);
        }
    }

    public getGroups(orgId: string): void {
        this.send({ action: WebSocketAction.LIST_GROUPS, org_id: orgId });
    }

    createGroup(name: string, org_id: string, target_id?: string): void {
        this.send({ action: WebSocketAction.CREATE_GROUP, name, org_id, target_id });
    }

    deleteGroup(group_id: string, org_id: string): void {
        this.send({ action: WebSocketAction.DELETE_GROUP, group_id, org_id });
    }

    moveGroup(group_id: string, target_id: string | null): void {
        this.send({ action: WebSocketAction.MOVE_GROUP, group_id, target_id });
    }

    moveSystem(system_id: string, target_id: string | null): void {
        this.send({ action: WebSocketAction.MOVE_SYSTEM, system_id, target_id });
    }
}
