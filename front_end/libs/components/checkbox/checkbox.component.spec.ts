import { SimpleChange } from '@angular/core';

import { setupComponent } from '../src/setup';

import { NxCheckboxComponent } from './checkbox.component';

describe('NxCheckboxComponent', () => {
    it('should create NxCheckboxComponent', async () => {
        const { component } = await setupComponent(NxCheckboxComponent);
        expect(component).toBeTruthy();
    });

    it('should handle @Input(labelText)', async () => {
        const { component } = await setupComponent(NxCheckboxComponent);
        expect(component.labelText).toBeUndefined();
    });

    it('should have defined states', async () => {
        const { component } = await setupComponent(NxCheckboxComponent);
        expect(component['cbxStates']).toEqual({
            false: 'unchecked',
            true: 'checked',
            // undefined: 'tristate'
        });
    });

    describe('should set state on @Input(change) change', () => {
        it('to false', async () => {
            const { component } = await setupComponent(NxCheckboxComponent);
            component.ngOnChanges({
                checked: new SimpleChange(undefined, false, true)
            });

            component.value = false;
            expect(component.state).toBe(component['cbxStates'].false);
        });

        it('to true', async () => {
            const { component } = await setupComponent(NxCheckboxComponent);
            component.ngOnChanges({
                checked: new SimpleChange(undefined, true, false)
            });

            expect(component.value).toBeTruthy();
            expect(component.state).toBe(component['cbxStates'].true);
        });

        it('on toggle', async () => {
            const { component } = await setupComponent(NxCheckboxComponent);
            let emitValue: boolean;

            component.value = true;
            component.onClick.subscribe((value: boolean) => {
                emitValue = value;
            });

            component.changeState(null);
            expect(emitValue).toBeFalsy();
            expect(component.value).toBeFalsy();
            expect(component.state).toBe(component['cbxStates'].false);
        });
    });
});
