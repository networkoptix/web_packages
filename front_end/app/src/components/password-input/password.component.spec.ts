import {
    ComponentFixture, fakeAsync, TestBed, tick, waitForAsync
}                                           from '@angular/core/testing';
import { FormsModule }                      from '@angular/forms';
import { NxPasswordComponent }              from '@components/password-input/password.component';
import { nxConfig }                         from '@services/nx-config/config';
import { NxConfigService }                  from '@services/nx-config';
import { NxCloudApiService }                from '@services/nx-cloud-api';
import { of }                               from 'rxjs';
import { delay }                            from 'rxjs/operators';
import { NxLanguageProviderService }        from '@services/nx-language-provider';
import { CommonModule } from '@angular/common';

function keyEvent(el: HTMLInputElement, key: string, eventType: string): void {
    const event: KeyboardEvent = new KeyboardEvent(eventType, {
        key: key
    });
    el.dispatchEvent(event);
}

describe('NxPasswordComponent', () => {
    let component: NxPasswordComponent;
    let fixture: ComponentFixture<NxPasswordComponent>;
    let el: HTMLInputElement;

    const translateMock = {
        translations: {}
    };
    const configMock = { getConfig: () => nxConfig };

    let apiSpy: jasmine.SpyObj<NxCloudApiService>;

    beforeEach(waitForAsync(() => {
        const spyApi = jasmine.createSpyObj('NxCloudApiService', ['getCommonPasswords']);

        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                FormsModule
            ],
            declarations : [NxPasswordComponent],
            providers    : [
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxConfigService, useValue: configMock },
                { provide: NxCloudApiService, useValue: spyApi }
            ]
        })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxPasswordComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement.nativeElement.querySelector('input');

                apiSpy = TestBed.inject(NxCloudApiService) as jasmine.SpyObj<NxCloudApiService>;
                apiSpy.getCommonPasswords.and.returnValue(of({ test1234: 1, 12345678: 1 }).pipe(delay(1)));

                fixture.detectChanges();
            });
    }));

    it('should create component and initialize commonPasswordsList', fakeAsync(() => {
        expect(apiSpy.getCommonPasswords).toHaveBeenCalledWith();
        tick(1);

        expect(component.CONFIG.commonPasswordsList).toEqual({ 12345678: 1, test1234: 1 });
        expect(component).toBeTruthy();
    }));

    it('should have default properties', () => {
        expect(el.autocomplete).toBe('new-password');
        expect(el.className).toContain('form-control');
        expect(el.pattern).toBe(component.CONFIG.credentialsValidation.passwordRequirements.requiredRegex);
    });

    it('should be in "password" mode', () => {
        component.passwordToggle = true;
        fixture.detectChanges();

        const toggle = fixture.debugElement.nativeElement.querySelectorAll('span.input-group-addon svg-icon');
        expect(toggle.length).toBe(1);
        expect(el.type).toBe('password');
    });

    it('should be in "text" mode', () => {
        component.passwordToggle = false;
        fixture.detectChanges(); // apply changes

        const toggle = fixture.debugElement.nativeElement.querySelectorAll('span.input-group-addon svg-icon');
        expect(toggle.length).toBe(1);
        expect(el.type).toBe('text');
    });

    it('should call setValue on keyup', () => {
        const spy = spyOn(component, 'setValue');

        keyEvent(el, '1', 'keyup');
        fixture.detectChanges();
        expect(spy.calls.count()).toBe(1, 'setValue method should be called once');
    });

    it('should check for common password (Fn test)', () => {
        expect(component['checkCommon']('test1234')).toBe(1);
        expect(component['checkCommon']('TEST1234')).toBe(1);
    });

    it('should check for password complexity (Fn test)', () => {
        expect(component['checkComplexity']('test')).toBe(1);
        expect(component['checkComplexity']('test1234')).toBe(2);
        expect(component['checkComplexity']('Test1234')).toBe(3);
        expect(component['checkComplexity']('Test1234!')).toBe(4);
    });
});
