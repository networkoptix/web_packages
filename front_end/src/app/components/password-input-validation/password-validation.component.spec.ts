import { DebugElement } from '@angular/core';
import {
    ComponentFixture,
    inject,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

import { NxTagComponent } from '@components/tag/tag.component';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxPasswordValidationComponent } from './password-validation.component';

describe('NxPasswordValidationComponent', () => {
    let component: NxPasswordValidationComponent;
    let fixture: ComponentFixture<NxPasswordValidationComponent>;
    let el: DebugElement;

    // Mock NgModel, but NgModel properties are read-only so we're leaving
    // forElement as any to avoid TS errors when configuring for tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let forElement: any;

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

                forElement = {
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

                // Placeholder to make the template work until assigning
                // the configuration we want to test
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                component.forElement = { errors: {} } as any;

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
        forElement.valid = false;
        forElement.touched = false;
        component.forElement = forElement;
        fixture.detectChanges();

        const error = el.nativeElement.querySelectorAll('div[name=error-labels]');
        expect(error.length).toBe(0);
    });

    it('should be "WEAK"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            forElement.valid = false;
            forElement.errors.weak = true;
            component.forElement = forElement;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.weakMessage());
        })
    );

    it('should be "COMMON"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            forElement.valid = false;
            forElement.errors.common = true;
            component.forElement = forElement;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.commonMessage());
        })
    );

    it('should be "MIN_LENGTH"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            forElement.valid = false;
            forElement.errors.minlength = true;
            component.forElement = forElement;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.minLengthMessage());
        })
    );

    it('should be "PATTERN"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            forElement.valid = false;
            forElement.errors.pattern = true;
            component.forElement = forElement;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.requiredMessage());
        })
    );

    it('should be "REQUIRED"',
        inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
            forElement.valid = false;
            forElement.errors.required = true;
            component.forElement = forElement;
            fixture.detectChanges();

            const error = el.nativeElement.querySelectorAll('div[name=error-labels] > div');
            expect(error.length).toBe(1);
            expect(error[0].className).toContain('input-error');
            expect(error[0].innerText).toBe(service.translations.passwordRequirements.missingMessage());
        })
    );
});
