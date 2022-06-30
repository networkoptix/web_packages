import { HttpClient } from '@angular/common/http';
import { Injectable /*, Inject */ } from '@angular/core';
import { Store } from '@ngrx/store';
// import { of } from 'rxjs';
import { map, delay, retryWhen, switchMap } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

// import { WINDOW } from '@services/window-provider';

import * as GroupActions from '../store/groups/groups.actions';
import { ListItem, SystemsItem } from '../store/groups/groups.types';

interface ISocketIncomingMessage {
    action: string,
    data: Record<string, string> | Array<Record<string, string>>,
} // TODO: more detailed typed message types

interface ISocketOutgoingMessage {
    action: string,
    [_: string]: unknown;
}

@Injectable({
    providedIn: 'root'
})
export class NxSystemGroupsService {
    protected WEBSOCKET_URL: string;

    constructor(
        private store: Store,
        private http: HttpClient,
        // @Inject(WINDOW) private window: Window,
    ) {
        // this.WEBSOCKET_URL = `wss://${this.window.location.host}/ws`;
        this.WEBSOCKET_URL = 'ws://127.0.0.1:5000/ws';
    }

    static connection$: WebSocketSubject<ISocketOutgoingMessage>;

    connect(): void {
        this.http.post<{ code: string }>('/api/systems/*/code', null)
            .pipe(
                map(response =>
                    this.WEBSOCKET_URL + `?code=${response.code}`
                )
            ).pipe(
                switchMap(url => {
                    if (!NxSystemGroupsService.connection$) {
                        NxSystemGroupsService.connection$ = webSocket(url);
                        this.act('systems');
                    }
                    return NxSystemGroupsService.connection$;
                }),
                retryWhen(errors => errors.pipe(delay(10 * 1000)))
            )
            .subscribe({
                next: this._onSocketMessage.bind(this),
                error: console.error,
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

    public act(action: string, data: Record<string, unknown> = {}): void {
        this.send({ action, ...data });
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
        switch (action) {
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
