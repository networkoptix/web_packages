import { setupComponent } from '../src/setup';

import { NxNoSystemsComponent } from './no-systems.component';

const setupNoSystemsComponent = (): ReturnType<typeof setupComponent<NxNoSystemsComponent>> => setupComponent(NxNoSystemsComponent);

describe('NxNoSystemsComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupNoSystemsComponent();
        expect(component).toBeTruthy();
    });

    it('should have 6 elements with no-data-panel-body class', async () => {
        const { debugElement } = await setupNoSystemsComponent();
        const spans = debugElement.nativeElement.querySelectorAll('.no-data-panel-body');
        expect(spans.length).toBe(6);
    });
});
