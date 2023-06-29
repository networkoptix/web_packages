import { setupComponent } from '../src/setup';

import { NxClientButtonComponent } from './client-button.component';

const setupClientButtonComponent = (): ReturnType<typeof setupComponent<NxClientButtonComponent>> => {
    NxClientButtonComponent.prototype.system = {
        capabilities: []
    };

    return setupComponent(NxClientButtonComponent);
};

/**
 * Need to figure out how we mock account globally
 */
xdescribe('NxClientButtonComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupClientButtonComponent();
        expect(component).toBeTruthy();
    });

    it('should show basic component', async () => {
        const { debugElement } = await setupClientButtonComponent();
        const button = debugElement.nativeElement.querySelectorAll('nx-process-button');
        expect(button).toBeTruthy();
        expect(button.length).toBe(1);
    });
});
