import { DebugElement } from '@angular/core';
import {
    ComponentFixture,
    inject,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

import { NxTagComponent } from '@components/tag/tag.component';
import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxPasswordValidationComponent } from './password-validation.component';

describe('NxPasswordValidationComponent', () => {
    let component: NxPasswordValidationComponent;
    let fixture: ComponentFixture<NxPasswordValidationComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [NxPasswordValidationComponent, NxTagComponent],
                providers: [
                    // default mocks are in test.ts
                    MockProvider(NxLanguageProviderService),
                    MockProvider(NxConfigService)
                ]
            })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxPasswordValidationComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;

                component.forElement = {
                    valid: true,
                    touched: true,
                    errors: {
                        minlength: false,
                        common: false,
                        weak: false,
                        pattern: false,
                        required: false
                    }
                };

                fixture.detectChanges();
            })
            .catch(err => console.error(err));
    }));

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should not display if valid', () => {
        const error = el.nativeElement.querySelectorAll('div[name=error-labels]');
        expect(error.length).toBe(0);
    });

    it('should not display if not touched', () => {
        component.forElement.valid = false;
        component.forElement.touched = false;
        fixture.detectChanges();

        const error = el.nativeElement.querySelectorAll('div[name=error-labels]');
        expect(error.length).toBe(0);
    });

    it('should be "WEAK"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            component.forElement.valid = false;
            component.forElement.errors.weak = true;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.weakMessage());
        })
    );

    it('should be "COMMON"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            component.forElement.valid = false;
            component.forElement.errors.common = true;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.commonMessage());
        })
    );

    it('should be "MIN_LENGTH"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            component.forElement.valid = false;
            component.forElement.errors.minlength = true;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.minLengthMessage());
        })
    );

    it('should be "PATTERN"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            component.forElement.valid = false;
            component.forElement.errors.pattern = true;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.requiredMessage());
        })
    );

    it('should be "REQUIRED"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            component.forElement.valid = false;
            component.forElement.errors.required = true;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.missingMessage());
        })
    );
});
