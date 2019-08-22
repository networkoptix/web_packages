import { Injectable }        from '@angular/core';
import { LocalStorageService }       from 'ngx-store';
import { ReplaySubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxSessionService {
    loginStateSubject = new ReplaySubject(0);
    session: any;

    constructor(private localStorageService: LocalStorageService) {
        this.session = this.localStorageService;
        this.loginStateSubject.next(this.loginState);
    }

    invalidateSession() {
        this.session.clear('all');
        this.loginStateSubject.next(this.loginState);
    }

    get email() {
        return this.session.get('email');
    }

    set email(email: string) {
        this.session.set('email', email);
    }

    get loginState() {
        return this.session.get('loginState');
    }

    set loginState(email: string) {
        this.session.set('loginState', email);
        this.loginStateSubject.next(email);
    }
}
