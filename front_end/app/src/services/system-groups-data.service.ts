import { Inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, retryWhen, switchMap } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

import { WINDOW } from '@services/window-provider';

@Injectable({
    providedIn: 'root'
})
export class SystemGroupsDataService {
    connection$: WebSocketSubject<any>;
    constructor(@Inject(WINDOW) private window: Window) {}

    connect(): Observable<any> {
        return of(`wss://${this.window.location.host}/ws`).pipe(
            switchMap(url => {
                if (!this.connection$) {
                    this.connection$ = webSocket(url);
                }
                return this.connection$;
            }),
            retryWhen(errors => errors.pipe(delay(10 * 1000)))
        );
    }

    send(data: any): void {
        if (!this.connection$) {
            console.error('Websocket is not open');
            return;
        }
        this.connection$.next(data);
    }
}
