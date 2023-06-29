import { setupComponent } from '../src/setup';

import { NxEmailComponent } from './email.component';

const setupEmailComponent = (): ReturnType<typeof setupComponent<NxEmailComponent>> => setupComponent(NxEmailComponent);

describe('NxEmailComponent email input Unit Test', () => {
    it('should create the component', async () => {
        const { component } = await setupEmailComponent();
        expect(component).toBeTruthy();
    });

    it('should show normal email input', async () => {
        const { component, fixture, debugElement } = await setupEmailComponent();
        fixture.detectChanges();
        const input = debugElement.nativeElement.querySelector('input');
        expect(input.attributes.getNamedItem('ng-reflect-name')).toBeNull();
        component.componentId = 'exampleId';
        component.lockEmail = false;
        fixture.detectChanges();
        expect(input.attributes.getNamedItem('ng-reflect-name')?.value).toBe('exampleId');
        expect(input.className).toContain('form-control');
        expect(input.type).toBe('email');
        expect(debugElement.nativeElement.querySelectorAll('.hide-errors').length).toBe(0);
    });

    it('should show email input with hide-errors class', async () => {
        const { component, fixture, debugElement } = await setupEmailComponent();
        component.componentId = 'exampleId';
        component.hideErrors = true;
        fixture.detectChanges();
        const input = debugElement.nativeElement.querySelector('input');
        'hide-errors form-control'.split(' ').forEach(className => {
            expect(input.className).toContain(className);
        });
    });

    it('should show non-authorize email input', async () => {
        const { component, fixture, debugElement } = await setupEmailComponent();
        component.componentId = 'exampleId';
        component.hideErrors = false;
        component.authorize = true;
        fixture.detectChanges();
        const input = debugElement.nativeElement.querySelector('input');
        expect(input.className).not.toContain('form-control');
    });

    it('should show locked email input', async () => {
        const { component, fixture, debugElement } = await setupEmailComponent();
        component.lockEmail = true;
        component.authorize = false;
        fixture.detectChanges();
        const input = debugElement.nativeElement.querySelector('input');
        expect(input.attributes.getNamedItem('ng-reflect-name')?.value)
            .toBe('registerEmailLocked');
        expect(input.type).toBe('text');
        expect(input.className).toContain('form-control');
    });
});
