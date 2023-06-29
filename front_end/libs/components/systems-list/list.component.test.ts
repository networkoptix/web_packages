import { describe, expect, it } from '@jest/globals';

import { setupComponent } from '../src/setup';

import { NxSystemsListComponent } from './list.component';

const setupRadioComponent = (): ReturnType<typeof setupComponent<NxSystemsListComponent>> =>
    setupComponent(NxSystemsListComponent);

describe('NxSystemsListComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupRadioComponent();
        expect(component).toBeTruthy();
    });

    // it('should have 6 elements with no-data-panel-body class', () => {
    //     const spans = el.queryAll(By.css('.no-data-panel-body'));
    //     expect(spans.length).toBe(6);
    // })
});
