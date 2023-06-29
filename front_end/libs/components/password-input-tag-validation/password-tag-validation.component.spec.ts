import { setupComponent } from '../src/setup';

import { NxPasswordTagValidationComponent } from './password-tag-validation.component';

const setupPasswordTagValidationComponent = (): ReturnType<typeof setupComponent<NxPasswordTagValidationComponent>> => {
    NxPasswordTagValidationComponent.prototype.forElement = {
        valid: true,
        touched: true,
        dirty: true,
        control: {
            fairPassword: false
        },
        errors: {
            minlength: false,
            common: false,
            weak: false,
            pattern: false
        }
    };
    return setupComponent(NxPasswordTagValidationComponent);
};

describe('NxPasswordTagValidationComponent', () => {
    it('should create component', async () => {
        const { component } = await setupPasswordTagValidationComponent();
        expect(component).toBeTruthy();
    });

    it('should be "GOOD"', async () => {
        const { debugElement } = await setupPasswordTagValidationComponent();
        const tag = debugElement.nativeElement.querySelectorAll('span#successMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-success-bright static');
        expect(tag[0].textContent).toBe('GOOD');
    });

    it('should be "FAIR"', async () => {
        const { component, fixture, debugElement } = await setupPasswordTagValidationComponent();
        component.forElement.control.fairPassword = true;
        fixture.detectChanges();

        const tag = debugElement.nativeElement.querySelectorAll('span#successMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-warning-bright static');
        expect(tag[0].textContent).toBe('FAIR');
    });

    it('should be "TOO SHORT"', async () => {
        const { component, fixture, debugElement } = await setupPasswordTagValidationComponent();
        component.forElement.valid = false;
        component.forElement.dirty = true;
        component.forElement.errors.minlength = true;

        fixture.detectChanges();

        const tag = debugElement.nativeElement.querySelectorAll('span#failMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-danger-bright static');
        expect(tag[0].textContent).toBe('TOO SHORT');
    });

    it('should be "TOO COMMON"', async () => {
        const { component, fixture, debugElement } = await setupPasswordTagValidationComponent();
        component.forElement.valid = false;
        component.forElement.dirty = true;
        component.forElement.errors.common = true;

        fixture.detectChanges();

        const tag = debugElement.nativeElement.querySelectorAll('span#failMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-danger-bright static');
        expect(tag[0].textContent).toBe('TOO COMMON');
    });

    it('should be "WEAK"', async () => {
        const { component, fixture, debugElement } = await setupPasswordTagValidationComponent();
        component.forElement.valid = false;
        component.forElement.dirty = true;
        component.forElement.errors.weak = true;

        fixture.detectChanges();

        const tag = debugElement.nativeElement.querySelectorAll('span#failMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-danger-bright static');
        expect(tag[0].textContent).toBe('WEAK');
    });

    it('should be "INCORRECT"', async () => {
        const { component, fixture, debugElement } = await setupPasswordTagValidationComponent();
        component.forElement.valid = false;
        component.forElement.dirty = true;
        component.forElement.errors.pattern = true;
        component.forElement.errors.minlength = false;

        fixture.detectChanges();

        const tag = debugElement.nativeElement.querySelectorAll('span#failMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-danger-bright static');
        expect(tag[0].textContent).toBe('INCORRECT');
    });
});
