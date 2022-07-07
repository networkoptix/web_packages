import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
    ComponentFixture,
    fakeAsync,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { FormsModule, NgModel } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockProvider } from 'ng-mocks';

import {
    NxPasswordTagValidationComponent
} from '@components/password-input-tag-validation/password-tag-validation.component';
import { NxPasswordComponent } from '@components/password-input/password.component';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

function keyEvent(el: HTMLInputElement, key: string, eventType: string): void {
    const event: KeyboardEvent = new KeyboardEvent(eventType, {
        key
    });
    el.dispatchEvent(event);
}

describe('NxPasswordComponent', () => {
    let component: NxPasswordComponent;
    let fixture: ComponentFixture<NxPasswordComponent>;
    let el: HTMLInputElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                FormsModule,
                AngularSvgIconModule.forRoot(),
                HttpClientTestingModule
            ],
            declarations: [
                NxPasswordComponent,
                NxPasswordTagValidationComponent
            ],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
                MockProvider(NxCloudApiService)
            ]
        })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxPasswordComponent);
                component = fixture.componentInstance;
                component.component = { valid: true } as NgModel;
                el = fixture.debugElement.nativeElement.querySelector('input');

                fixture.detectChanges();
            });
    }));

    it('should create component and initialize commonPasswordsList', fakeAsync(() => {
        expect(component.CONFIG.commonPasswordsList).toEqual({ 12345678: 1, test1234: 1 });
        expect(component).toBeTruthy();
    }));

    it('should have default properties', () => {
        expect(el.autocomplete).toBe('new-password');
        expect(el.className).toContain('form-control');
        expect(el.pattern).toBe(
            component.CONFIG.credentialsValidation.passwordRequirements.requiredRegex
        );
    });

    it('should be in "password" mode', () => {
        component.passwordToggle = true;
        fixture.detectChanges();

        const toggle = fixture.debugElement.nativeElement.querySelectorAll(
            'span.input-group-addon svg-icon'
        );
        expect(toggle.length).toBe(1);
        expect(el.type).toBe('password');
    });

    it('should be in "text" mode', () => {
        component.passwordToggle = false;
        fixture.detectChanges(); // apply changes

        const toggle = fixture.debugElement.nativeElement.querySelectorAll(
            'span.input-group-addon svg-icon'
        );
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
