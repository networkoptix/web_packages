import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

@Injectable({
    providedIn: 'root',
})
export class NxStorageService {
    private storage: LocalStorageService;

    constructor(localStorageService: LocalStorageService) {
        this.storage = localStorageService;
    }

    clear(key?: string): void {
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

    get loginRegister(): boolean {
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

    get language(): string {
        return this.storage.retrieve('language') || undefined;
    }

    set language(language: string) {
        this.storage.store('language', language);
    }

    get langChanged(): boolean {
        return this.storage.retrieve('langChanged') || false;
    }

    set langChanged(langChanged: boolean) {
        this.storage.store('langChanged', langChanged);
    }

    get cloudAccessToken(): string {
        return this.storage.retrieve('cloudAccessToken') || undefined;
    }

    set cloudAccessToken(token: string) {
        this.storage.store('cloudAccessToken', token);
    }

    get refreshToken(): string {
        return this.storage.retrieve('refreshToken') || undefined;
    }

    set refreshToken(token: string) {
        this.storage.store('refreshToken', token);
    }

    get cloudApiAccessToken(): string {
        return this.storage.retrieve('cloudApiAccessToken') || undefined;
    }

    set cloudApiAccessToken(token: string) {
        this.storage.store('cloudApiAccessToken', token);
    }

    get cloudApiRefreshToken(): string {
        return this.storage.retrieve('cloudApiRefreshToken') || undefined;
    }

    set cloudApiRefreshToken(token: string) {
        this.storage.store('cloudApiRefreshToken', token);
    }
}
