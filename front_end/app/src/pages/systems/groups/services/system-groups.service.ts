import { HttpClient } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, switchMap } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { WINDOW } from '@services/window-provider';

import * as GroupActions from '../store/groups/groups.actions';
import { ListItem, SystemsItem } from '../store/groups/groups.types';

import {
    socketIncomingActionType,
    ISocketIncomingMessage,
} from './incoming-message-types';
import {
    socketOutgoingActionType,
    ISocketOutgoingMessage
} from './outgoing-message-types';

@Injectable({
    providedIn: 'root'
})
export class NxSystemGroupsService {
    protected WEBSOCKET_URL: string;

    constructor(
        private store: Store,
        private http: HttpClient,
        @Inject(WINDOW) private window: Window,
    ) {
        this.WEBSOCKET_URL = `wss://${this.window.location.host}/system_groups/ws`;
    }

    static connection$: WebSocketSubject<ISocketOutgoingMessage>;

    connect(): void {
        this.http.post<{ code: string }>('/api/systems/*/code', null)
            .pipe(
                map(response => this.WEBSOCKET_URL + `?code=${response.code}`),
                switchMap(url => {
                    if (!NxSystemGroupsService.connection$) {
                        NxSystemGroupsService.connection$ = webSocket(url);
                        this.act('systems');
                    }
                    return NxSystemGroupsService.connection$;
                })
            )
            .subscribe({
                next: this._onSocketMessage.bind(this),
                error: () => {
                    NxSystemGroupsService.connection$.unsubscribe();
                    NxSystemGroupsService.connection$ = undefined;
                    setTimeout(() => this.connect(), 10000);
                },
                complete: () => console.log('websocket connection closed')
            });
    }

    send(data: ISocketOutgoingMessage): void {
        if (!NxSystemGroupsService.connection$) {
            console.error('no ws connection');
            return;
        }
        NxSystemGroupsService.connection$.next(data);
    }

    public act(action: socketOutgoingActionType, data: Record<string, unknown> = {}): void {
        this.send({ action, ...data } as ISocketOutgoingMessage);
    }

    public move(id: string, newParentId: string, type: string): void {
        switch (type) {
            case 'group':
                this.act('move_group', { group_id: id, target_id: newParentId });
                break;
            case 'system':
                this.act('move_system', { system_id: id, group_id: newParentId });
                break;
        }
    }

    protected _onSocketMessage({ action, data }: ISocketIncomingMessage): void {
        switch (action as socketIncomingActionType) {
            case 'list_groups':
                this.store.dispatch(GroupActions.loadList({
                    list: data as unknown as Array<ListItem>
                }));
                break;
            case 'systems':
                this.store.dispatch(GroupActions.loadSystems({
                    systems: data as unknown as Array<SystemsItem>
                }));
                break;
        }
    }
}
