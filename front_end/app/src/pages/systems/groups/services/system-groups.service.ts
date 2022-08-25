/* eslint-disable camelcase */
import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, switchMap } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { WINDOW } from '@services/window-provider';

import * as GroupActions from '../store/groups.actions';

import {
    WebSocketAction,
    IncomingData,
    OutgoingData,
} from './system-groups.service.types';

@Injectable({
    providedIn: 'root'
})
export class NxSystemGroupsService {
    private WEBSOCKET_URL: string;

    constructor(
        private store: Store,
        private http: HttpClient,
        @Inject(WINDOW) private window: Window,
    ) {
        this.WEBSOCKET_URL = `wss://${this.window.location.host}/system_groups/ws`;
    }

    private static connection$: WebSocketSubject<
        IncomingData[WebSocketAction] | OutgoingData[WebSocketAction]
    >;

    connect(): void {
        this.http.post<{ code: string }>('/api/systems/*/code', null)
            .pipe(
                map(response => this.WEBSOCKET_URL + `?code=${response.code}`),
                switchMap(url => {
                    if (!NxSystemGroupsService.connection$) {
                        NxSystemGroupsService.connection$ = webSocket(url);
                        this.send({ action: WebSocketAction.SYSTEMS });
                    }
                    return NxSystemGroupsService.connection$;
                })
            )
            .subscribe({
                next: this.receive,
                error: () => {
                    NxSystemGroupsService.connection$?.complete();
                    NxSystemGroupsService.connection$ = undefined;
                    setTimeout(() => this.connect(), 10000);
                },
                complete: () => console.log('websocket connection closed')
            });
    }

    private send(data: OutgoingData[WebSocketAction]): void {
        if (!NxSystemGroupsService.connection$) {
            console.error('no ws connection');
            return;
        }
        NxSystemGroupsService.connection$.next(data);
    }

    private receive = ({ action, data }: IncomingData[WebSocketAction]): void => {
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
                this.store.dispatch(
                    GroupActions.setSystemInfo({ systemInfo: data })
                );
                break;
        }
    };

    createGroup(name: string): void {
        this.send({ action: WebSocketAction.CREATE_GROUP, name });
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
