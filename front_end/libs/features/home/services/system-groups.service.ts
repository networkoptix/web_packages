/* eslint-disable camelcase */
import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import staticLang from '@common/language/language_i18n_static.json';
import { NxToastService } from '@dialogs/toast.service';
import { toast } from '@lib/variables/static-variables';
import { WINDOW } from '@services/window-provider';
import { isObject } from '@utils/general';

import type { GroupsItem } from '../home.types';
import * as GroupActions from '../store/groups.actions';

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

    /** Signal for opening/collapsing all groups */
    sidebarOpenSubject = new Subject<boolean>();

    constructor(
        private store: Store,
        private http: HttpClient,
        private router: Router,
        private toastService: NxToastService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.WEBSOCKET_URL = `wss://${this.window.location.host}/system_groups/ws`;
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
                        // Also causes groups data response
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
                    console.log('WebSocket connection closed');
                    if (this.router.url.startsWith('/groups')) {
                        this.progressiveDelayReconnect();
                    }
                },
            });
    }

    private progressiveDelayReconnect(): void {
        if (this.attempt >= this.MAX_RECONNECT_ATTEMPTS) {
            this.toastService.remove();
            this.toastService.show(this.LANG.systemGroups.couldNotReconnect, toast.danger);
            return;
        }
        this.disconnect();
        this.toastService.show(this.LANG.systemGroups.connectionLost, toast.danger);
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
            this.toastService.notify(this.LANG.systemGroups.noConnection, toast.danger);
            return;
        }
        this.connection$.next(data);
    }

    private receive({ action, data }: WebSocketIncoming): void {
        if (action === 'connected') {
            if (this.attempt > 0) {
                this.attempt = 0;
                this.toastService.remove();
                this.toastService.notify(this.LANG.systemGroups.connectionRestored, toast.success);
            }
            return;
        }
        if (isObject(data) && 'error' in data) {
            this.toastService.notify(
                this.LANG.systemGroups.errorMsg[data.msg] ?? data.msg,
                toast.danger,
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
                this.store.dispatch(GroupActions.setSystemInfo({ systemInfo: data }));
                break;
        }
    }

    onDrop(src: GroupsItem, dest: GroupsItem | null): void {
        if (src.id === dest?.id) {
            this.toastService.notify(this.LANG.systemGroups.addGroupToSelf, toast.danger);
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
            this.toastService.notify(msg, toast.info);
            return;
        }

        if (src.type === 'group') {
            this.moveGroup(src.id, dest ? dest.id : null);
        } else if (src.type === 'system') {
            this.moveSystem(src.id, dest ? dest.id : null);
        }
    }

    createGroup(name: string, target_id?: string): void {
        this.send({ action: WebSocketAction.CREATE_GROUP, name, target_id });
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
