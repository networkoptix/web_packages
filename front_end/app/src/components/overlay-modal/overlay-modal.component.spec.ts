import {
    waitForAsync, ComponentFixture, TestBed
}                                 from '@angular/core/testing';
import { DebugElement, NgModule } from '@angular/core';
import { CommonModule }           from '@angular/common';
import { Router }                 from '@angular/router';
import { LocalStorageService }    from 'ngx-webstorage';
import { TranslateModule }        from '@ngx-translate/core';

import { NxConfigService }           from '@services/nx-config';
import { nxConfig }                  from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxAppStateService }         from '@services/nx-app-state.service';
import { NxSystemService }           from '@services/system.service';
import { NxAccountService }          from '@services/account.service';
import { NxOverlayModalComponent }   from './overlay-modal.component';
import { BehaviorSubject, of } from 'rxjs';

@NgModule({
    imports: [TranslateModule.forRoot()],
    exports: [TranslateModule]
})
class TranslateTestingModule {}

describe('NxOverlayModalComponent', () => {
    let component: NxOverlayModalComponent;
    let fixture: ComponentFixture<NxOverlayModalComponent>;
    let el: DebugElement;

    const translateMock = {
        translations: {
            servers: {
                refresh: () => 'Refresh',
                refreshing: () => 'Refreshing'
            }
        }
    };
    const configMock = { getConfig: () => nxConfig };
    const localStorageMock = {
        retrieve: () => false
    };
    const appStateMock = {
        systemAvailable$: of(false),
        lastErrorStatus$: new BehaviorSubject<number>(undefined)
    };
    const accountMock = {
        get: () => Promise.resolve(undefined)
    };
    const systemServiceMock = {
        mediaserver: {
            getModuleInfo: () => { throw new Error('still offline'); }
        }
    };
    const servers = [
        {
            url: 'https://cloud-test.hdw.mx/serverONEurl',
            name: 'serverONEname',
            ip: 'serverONEip'
        },
        {
            url: 'https://cloud-test.hdw.mx/serverTWOurl',
            name: 'serverTWOname',
            ip: 'serverTWOip'
        },
        {
            url: 'https://cloud-test.hdw.mx/serverTHREEurl',
            name: 'serverTHREEname',
            ip: 'serverTHREEip'
        }
    ];

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxOverlayModalComponent],
            imports: [CommonModule, TranslateTestingModule],
            providers: [
                { provide: NxConfigService, useValue: configMock },
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxAppStateService, useValue: appStateMock },
                { provide: NxSystemService, useValue: systemServiceMock },
                { provide: NxAccountService, useValue: accountMock },
                { provide: Router, useValue: {} },
                { provide: LocalStorageService, useValue: localStorageMock }

            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxOverlayModalComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should load basic component', () => {
        fixture.detectChanges();
        const title = el.nativeElement.querySelector('h2');
        expect(title.innerText).toBe('Server offline');
        const message = el.nativeElement.querySelectorAll('span');
        expect(message.length).toBe(2);
        expect(message[1].innerText).toBe('Refresh');
    });

    it('should show different servers', () => {
        fixture.detectChanges();
        component.servers = servers;
        fixture.detectChanges();
        const otherServerTitle = el.nativeElement.querySelectorAll('p');
        expect(otherServerTitle.length).toBe(2);
        expect(otherServerTitle[1].innerText).toBe('You can try to connect to other servers in this system:');
        const serverNames = el.nativeElement.querySelectorAll('span.server-name');
        expect(serverNames.length).toBe(servers.length);
        expect(serverNames[0].innerText).toBe(servers[0].name);
        expect(serverNames[1].innerText).toBe(servers[1].name);
        expect(serverNames[2].innerText).toBe(servers[2].name);
        const serverIp = el.nativeElement.querySelectorAll('span.server-ip');
        expect(serverIp.length).toBe(servers.length);
        expect(serverIp[0].innerText).toBe(servers[0].ip);
        expect(serverIp[1].innerText).toBe(servers[1].ip);
        expect(serverIp[2].innerText).toBe(servers[2].ip);
        const serverUrls = el.nativeElement.querySelectorAll('a');
        expect(serverUrls.length).toBe(servers.length);
        expect(serverUrls[0].href).toBe(servers[0].url);
        expect(serverUrls[1].href).toBe(servers[1].url);
        expect(serverUrls[2].href).toBe(servers[2].url);
    });
});
