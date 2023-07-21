import { setupComponent } from '../src/setup';

import { NxTagComponent } from './tag.component';
const setupRadioComponent = (): ReturnType<typeof setupComponent<NxTagComponent>> =>
    setupComponent(NxTagComponent);

describe('NxTagComponent', () => {
    it('should create component', async () => {
        const { component } = await setupRadioComponent();
        expect(component).toBeTruthy();
    });

    it('should init component (DEFAULT)', async () => {
        const { component, fixture } = await setupRadioComponent();
        fixture.detectChanges();
        expect(component.locked).toBeUndefined();
        expect(component.size).toBe('small');
        expect(component.element).toBe('badge');
        expect(component.badgeType).toBe('badge');
    });

    it('should init component (w/ OPTIONS)', async () => {
        const { component, fixture } = await setupRadioComponent();
        component.locked = ''; // not undefined
        component.element = 'btn';
        component.type = 'success';
        fixture.detectChanges();

        expect(component.locked).toBeTruthy();
        expect(component.element).toBe('btn');
        expect(component.badgeType).toBe('badge-success');
    });

    it('should change state when clicked', async () => {
        const { component, fixture, debugElement } = await setupRadioComponent();
        jest.spyOn(component.onClick, 'emit');
        component.type = 'success';
        fixture.detectChanges();

        const tag = debugElement.nativeElement.querySelector('a');
        tag.click();

        expect(component.selected).toBeTruthy();
        expect(component.badgeType).toBe('badge-success-selected');
        expect(component.onClick.emit).toHaveBeenCalledWith(true);
    });

    it('should not change state when clicked if locked', async () => {
        const { component, fixture, debugElement } = await setupRadioComponent();
        component.type = 'success';
        component.locked = ''; // not undefined
        fixture.detectChanges();

        const tag = debugElement.nativeElement.querySelector('a');
        tag.click();

        expect(component.selected).toBeUndefined();
        expect(component.badgeType).toBe('badge-success');
    });
});
