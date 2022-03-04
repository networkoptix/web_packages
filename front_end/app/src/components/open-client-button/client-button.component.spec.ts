import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MockProvider } from 'ng-mocks';

import {
    NxProcessButtonComponent
} from '@components/process-button/process-button.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAccountService } from '@services/account.service';
import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { NxUrlProtocolService } from '@services/url-protocol.service';

import { NxClientButtonComponent } from './client-button.component';

describe('NxClientButtonComponent', () => {
    let component: NxClientButtonComponent;
    let fixture: ComponentFixture<NxClientButtonComponent>;
    let el: DebugElement;

    const system = {
        capabilities: []
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxClientButtonComponent, NxProcessButtonComponent],
            imports: [CommonModule, TranslateModule.forRoot()],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
                MockProvider(NxUrlProtocolService),
                MockProvider(NxDialogsService),
                MockProvider(NxProcessService),
                MockProvider(Router),
                MockProvider(NxAccountService),
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxClientButtonComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
                component.system = system;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should show basic component', () => {
        fixture.detectChanges();
        const button = el.nativeElement.querySelectorAll('nx-process-button');
        expect(button).toBeTruthy();
        expect(button.length).toBe(1);
    });
});
