import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

@Injectable({
    providedIn: 'root'
})
export class NxStorageService {
    private storage: LocalStorageService;

    constructor(
        localStorageService: LocalStorageService
    ) {
        this.storage = localStorageService;
    }

    clear(key?: string) {
        if (key) {
            this.storage.clear(key);
        } else {
            this.storage.clear();
        }
    }

    get systemId(): string {
        return this.storage.retrieve('systemId') || '';
    }

    set systemId(systemId: string) {
        this.storage.store('systemId', systemId);
    }

    get email(): string {
        return this.storage.retrieve('email') || '';
    }

    set email(email: string) {
        this.storage.store('email', email);
    }

    get loginRegister():boolean {
        return this.storage.retrieve('loginRegister') || false;
    }

    set loginRegister(loginRegister: boolean) {
        this.storage.store('loginRegister', loginRegister);
    }

    get regProcess(): boolean | string {
        return this.storage.retrieve('regProcess') || false;
    }

    set regProcess(regProcess: boolean | string) {
        this.storage.store('regProcess', regProcess);
    }

    get regActivated(): boolean {
        return this.storage.retrieve('regActivated') || false;
    }

    set regActivated(regActivated: boolean) {
        this.storage.store('regActivated', regActivated);
    }

    get langChanged(): boolean {
        return this.storage.retrieve('langChanged') || false;
    }

    set langChanged(langChanged: boolean) {
        this.storage.store('langChanged', langChanged);
    }

    get restoreProcess(): any {
        return this.storage.retrieve('restoreProcess') || undefined;
    }

    set restoreProcess(restoreProcess: any) {
        this.storage.store('restoreProcess', restoreProcess);
    }

    get cloudAccessToken(): string {
        return this.storage.retrieve('cloudAccessToken') || undefined;
    }

    set cloudAccessToken(token) {
        this.storage.store('cloudAccessToken', token);
    }

    get refreshToken(): string {
        return this.storage.retrieve('refreshToken') || undefined;
    }

    set refreshToken(token) {
        this.storage.store('refreshToken', token);
    }

    get cloudApiAccessToken(): string {
        return this.storage.retrieve('cloudApiAccessToken') || undefined;
    }

    set cloudApiAccessToken(token) {
        this.storage.store('cloudApiAccessToken', token);
    }

    get cloudApiRefreshToken(): string {
        return this.storage.retrieve('cloudApiRefreshToken') || undefined;
    }

    set cloudApiRefreshToken(token) {
        this.storage.store('cloudApiRefreshToken', token);
    }
}
