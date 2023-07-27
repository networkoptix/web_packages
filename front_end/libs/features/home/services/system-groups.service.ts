/* eslint-disable camelcase */
import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { distinctUntilChanged, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import staticLang from '@common/language/language_i18n_static.json';
import { ToastType } from '@components/toast-container/toast.types';
import { System } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxSystemsService } from '@services/systems.service';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';
import { isObject } from '@utils/general';

import type { GroupsItem, SystemInfo } from '../home.types';
import { selectCurrentOrgId } from '../store/channel-partners/channel-partners.selectors';
import * as GroupActions from '../store/groups/groups.actions';

import { NxChannelPartnersService } from './channel-partners.service';
import {
    WebSocketAction,
    WebSocketIncoming,
    WebSocketOutgoing,
} from './system-groups.service.types';

@Injectable({
    providedIn: 'root',
})
export class NxSystemGroupsService {
    LANG = staticLang;
    private WEBSOCKET_URL: string;
    private readonly MAX_RECONNECT_ATTEMPTS = 8; // Total time is 510 seconds. Which is the sum  of series 2 * 2 ** x from 1 to 8.
    private attempt = 0;
    private systems$ = this.systemsService.systemsSubject.pipe(
        takeUntilDestroyed(),
        distinctUntilChanged(),
        map(systems => {
            const converted = systems.map(sys => {
                return {
                    ...sys,
                    version: sys.version.toString(),
                };
            });
            return systems
                ? new Map<string, SystemInfo>(converted.map(s => [s.id, s]))
                : (systems as null);
        }),
    );
    private currentOrgId$ = this.store.select(selectCurrentOrgId);
    private orgSystems$ = this.store.select(selectCurrentOrgId).pipe(
        filter(id => !!id),
        mergeMap(id => this.CPService.getOrgSystems(id)),
    );
    queue: WebSocketOutgoing[] = [];

    constructor(
        private store: Store,
        private http: HttpClient,
        private router: Router,
        private toastService: NxToastService,
        private systemsService: NxSystemsService,
        private CPService: NxChannelPartnersService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.WEBSOCKET_URL = `wss://${this.window.location.host}/system_groups/ws`;
        combineLatest([this.systems$, this.currentOrgId$, this.orgSystems$])
            .pipe(takeUntilDestroyed())
            .subscribe(([systems, currentOrgId, orgSystems]) => {
                const currentSystems: System[] = [];
                orgSystems.forEach(sys => {
                    if (sys.organization === currentOrgId) {
                        currentSystems.push(systems.get(sys.systemId));
                    }
                });
                this.store.dispatch(GroupActions.setSystemInfo({ orgSystems: currentSystems }));
            });
    }

    private connection$: WebSocketSubject<WebSocketIncoming | WebSocketOutgoing>;

    connect(): void {
        this.http
            .post<{ code: string }>('/api/systems/*/code', null)
            .pipe(
                map(response => this.WEBSOCKET_URL + `?code=${response.code}`),
                switchMap(url => {
                    if (!this.connection$) {
                        this.connection$ = webSocket(url);
                        this.send({ action: WebSocketAction.SYSTEMS });
                        while (this.queue.length) {
                            this.send(this.queue.shift());
                        }
                    }
                    return this.connection$;
                }),
            )
            .subscribe({
                next: value => this.receive(value as WebSocketIncoming),
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

    private progressiveDelayReconnect(): void {
        if (this.attempt >= this.MAX_RECONNECT_ATTEMPTS) {
            this.toastService.remove();
            this.toastService.show(this.LANG.systemGroups.couldNotReconnect, ToastType.Danger);
            return;
        }
        this.disconnect();
        this.toastService.show(this.LANG.systemGroups.connectionLost, ToastType.Danger);
        this.attempt += 1;
        setTimeout(() => {
            this.connect();
        }, 2000 * 2 ** this.attempt);
    }

    disconnect(): void {
        this.connection$?.complete();
        this.connection$ = undefined;
    }

    private send(data: WebSocketOutgoing): void {
        if (!this.connection$) {
            console.error('No WebSocket connection');
            this.queue.push(data);
            this.progressiveDelayReconnect();
            this.toastService.notify(this.LANG.systemGroups.noConnection, ToastType.Danger);
            return;
        }
        this.connection$.next(data);
    }

    private receive({ action, data }: WebSocketIncoming): void {
        if (action === 'connected') {
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

    createGroup(name: string, org_id?: string, target_id?: string): void {
        this.send({ action: WebSocketAction.CREATE_GROUP, name, org_id, target_id });
    }

    deleteGroup(group_id: string): void {
        this.send({ action: WebSocketAction.DELETE_GROUP, group_id });
    }

    moveGroup(group_id: string, target_id: string | null): void {
        this.send({ action: WebSocketAction.MOVE_GROUP, group_id, target_id });
    }

    moveSystem(system_id: string, group_id: string | null): void {
        this.send({ action: WebSocketAction.MOVE_SYSTEM, system_id, group_id });
    }
}
