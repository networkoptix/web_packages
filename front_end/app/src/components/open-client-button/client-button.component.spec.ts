import {
    waitForAsync, ComponentFixture, TestBed
}                                          from '@angular/core/testing';
import { DebugElement, NgModule }                    from '@angular/core';
import { CommonModule }                    from '@angular/common';
import { NxConfigService }                 from '@services/nx-config';
import { nxConfig }                        from '@services/nx-config/config';
import { NxLanguageProviderService }       from '@services/nx-language-provider';
import { NxDialogsService }          from '@dialogs/dialogs.service';
import { NxUrlProtocolService }      from '@services/url-protocol.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxClientButtonComponent }         from './client-button.component';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
    imports : [TranslateModule.forRoot()],
    exports : [TranslateModule]
})
class TranslateTestingModule {}

describe('NxClientButtonComponent', () => {
    let component: NxClientButtonComponent;
    let fixture: ComponentFixture<NxClientButtonComponent>;
    let el: DebugElement;

    const translateMock = {
        translations: {
            system: () => 'system'
        }
    };
    const configMock = { getConfig: () => nxConfig };
    const processMock = {
        createProcess: () => Promise.resolve()
    };

    const system = {
        capabilities: []
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations : [NxClientButtonComponent],
            imports      : [CommonModule, TranslateTestingModule],
            providers    : [
                { provide: NxConfigService, useValue: configMock },
                { provide: NxProcessService, useValue: processMock },
                { provide: NxUrlProtocolService, useValue: {} },
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxDialogsService, useValue: {} },
                { provide: Router, useValue: {} }
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
