import { NgModel } from '@angular/forms';
import { cloneDeep } from 'lodash-es';

import staticLang from '@language_static';

import { setupComponent } from '../src/setup';

import { NxPasswordValidationComponent } from './password-validation.component';

const updateModel = (
    component: NxPasswordValidationComponent,
    model: unknown,
    fixture?: Awaited<ReturnType<typeof setupComponent<NxPasswordValidationComponent>>>['fixture'],
): void => {
    component.forElement = model as NgModel;
    if (fixture) {
        fixture.detectChanges();
        fixture.whenStable();
    }
};

const modelBase = {
    valid: true,
    touched: true,
    errors: {
        minlength: false,
        common: false,
        weak: false,
        pattern: false,
        required: false,
    },
};

const setupPasswordValidationComponent = async (): Promise<
    Awaited<ReturnType<typeof setupComponent<NxPasswordValidationComponent>>> & {
        model: typeof modelBase;
    }
> => {
    updateModel(NxPasswordValidationComponent.prototype, { errors: {} });
    return {
        ...(await setupComponent(NxPasswordValidationComponent)),
        model: cloneDeep(modelBase),
    };
};

describe('NxPasswordValidationComponent', () => {
    it('should create component', async () => {
        const { component } = await setupPasswordValidationComponent();
        expect(component).toBeTruthy();
    });

    it('should not display if valid', async () => {
        const { debugElement } = await setupPasswordValidationComponent();
        const error = debugElement.nativeElement.querySelectorAll('div[name=error-labels]');
        expect(error.length).toBe(0);
    });

    it('should not display if not touched', async () => {
        const { component, fixture, debugElement, model } =
            await setupPasswordValidationComponent();
        model.valid = false;
        model.touched = false;
        updateModel(component, model, fixture);

        const error = debugElement.nativeElement.querySelectorAll('div[name=error-labels]');
        expect(error.length).toBe(0);
    });

    it('should be "WEAK"', async () => {
        const { component, fixture, debugElement, model } =
            await setupPasswordValidationComponent();
        model.valid = false;
        model.errors.weak = true;
        updateModel(component, model, fixture);

        const error = debugElement.nativeElement.querySelectorAll('div[name=error-labels] > div');
        expect(error.length).toBe(1);
        expect(error[0].className).toContain('input-error');
        expect(error[0].textContent.trim()).toBe(staticLang.passwordRequirements.weakMessage);
    });

    it('should be "COMMON"', async () => {
        const { component, fixture, debugElement, model } =
            await setupPasswordValidationComponent();
        model.valid = false;
        model.errors.common = true;
        updateModel(component, model, fixture);

        const error = debugElement.nativeElement.querySelectorAll('div[name=error-labels] > div');
        expect(error.length).toBe(1);
        expect(error[0].className).toContain('input-error');
        expect(error[0].textContent.trim()).toBe(staticLang.passwordRequirements.commonMessage);
    });

    it('should be "MIN_LENGTH"', async () => {
        const { component, fixture, debugElement, model } =
            await setupPasswordValidationComponent();
        model.valid = false;
        model.errors.minlength = true;
        updateModel(component, model, fixture);

        const error = debugElement.nativeElement.querySelectorAll('div[name=error-labels] > div');
        expect(error.length).toBe(1);
        expect(error[0].className).toContain('input-error');
        expect(error[0].textContent.trim()).toBe(staticLang.passwordRequirements.minLengthMessage);
    });

    it('should be "PATTERN"', async () => {
        const { component, fixture, debugElement, model } =
            await setupPasswordValidationComponent();
        model.valid = false;
        model.errors.pattern = true;
        updateModel(component, model, fixture);

        const error = debugElement.nativeElement.querySelectorAll('div[name=error-labels] > div');
        expect(error.length).toBe(1);
        expect(error[0].className).toContain('input-error');
        expect(error[0].textContent.trim()).toBe(staticLang.passwordRequirements.requiredMessage);
    });

    it('should be "REQUIRED"', async () => {
        const { component, fixture, debugElement, model } =
            await setupPasswordValidationComponent();
        model.valid = false;
        model.errors.required = true;
        updateModel(component, model, fixture);

        const error = debugElement.nativeElement.querySelectorAll('div[name=error-labels] > div');
        expect(error.length).toBe(1);
        expect(error[0].className).toContain('input-error');
        expect(error[0].textContent.trim()).toBe(staticLang.passwordRequirements.missingMessage);
    });
});
