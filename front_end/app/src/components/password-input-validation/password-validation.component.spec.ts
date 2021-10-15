import {
    ComponentFixture, inject, TestBed,
    waitForAsync
}                                        from '@angular/core/testing';
import { NxPasswordValidationComponent } from './password-validation.component';
import { DebugElement }                  from '@angular/core';
import { nxConfig }                      from '@services/nx-config/config';
import { NxLanguageProviderService }     from '@services/nx-language-provider';
import { NxConfigService }               from '@services/nx-config';
import { NxTagComponent }                from '@components/tag/tag.component';
import { NxRibbonService }               from '@components/ribbon';

describe('NxPasswordValidationComponent', () => {
    let component: NxPasswordValidationComponent;
    let fixture: ComponentFixture<NxPasswordValidationComponent>;
    let el: DebugElement;

    let LANG;
    const translateMock = {
        translations: {
            passwordRequirements: {
                common: () => 'too common',
                commonMessage: () => 'This password is in top most popular passwords in the world',
                fair: () => 'fair',
                fairMessage: () => 'Use numbers, upper and lower case letters and special characters to make your password stronger',
                good: () => 'good',
                minLength: () => 'too short',
                minLengthMessage: () => 'Password must contain at least 8 characters',
                missingMessage: () => 'Password is required',
                required: () => 'incorrect',
                requiredMessage: () => 'Use only latin letters, numbers and keyboard symbols, avoid leading and trailing spaces',
                strongMessage: () => 'Strong password!',
                weak: () => 'weak',
                weakMessage: () => 'Use numbers, upper and lower case letters and special characters to make your password stronger'
            }
        }
    };
    const configMock = { getConfig: () => nxConfig };

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [NxPasswordValidationComponent, NxTagComponent],
                providers: [
                    { provide: NxLanguageProviderService, useValue: translateMock },
                    { provide: NxConfigService, useValue: configMock }
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
