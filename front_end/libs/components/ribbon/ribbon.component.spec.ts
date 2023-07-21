import { setupComponent } from '../src/setup';

import { NxRibbonComponent } from './ribbon.component';
import { NxRibbonService } from './ribbon.service';
import type { RibbonAction, RibbonContext } from './ribbon.types';

const setupRibbonComponent = (): ReturnType<typeof setupComponent<NxRibbonComponent>> =>
    setupComponent(NxRibbonComponent);

describe('NxRibbonComponent', () => {
    it('should create NxRibbonComponent', async () => {
        const { component } = await setupRibbonComponent();
        expect(component).toBeTruthy();
    });

    it('should be initialized', async () => {
        const { component } = await setupRibbonComponent();
        component.ngOnInit();

        expect(component.visibility).toBeFalsy();
        expect(component.type).toBeUndefined();
        expect(component.updateFunction).toBeUndefined();
        expect(component.message).toBeFalsy();
        expect(component.actions).toEqual([]);
    });

    it('should use NxRibbonService to get data', async () => {
        const { component, fixture, inject } = await setupRibbonComponent();
        const service = inject(NxRibbonService);
        const actions: RibbonAction[] = [
            {
                type: 'link',
                text: 'Go back',
                value: '/admin/cms/asset',
            },
        ];
        const context: RibbonContext = {
            visibility: true,
            message: 'Alcohol! Because no great story started with someone eating a salad.',
            actions,
            type: undefined,
            updateFunction: undefined,
        };

        service.show(context.message, context.actions, context.type, context.updateFunction);
        fixture.detectChanges();

        expect(service.contextSubject.value).toEqual(context);

        expect(component.visibility).toBeTruthy();
        expect(component.message).toBe(context.message);
        expect(component.actions).toEqual(context.actions);
    });

    it('should use NxRibbonService to hide and reset data', async () => {
        const { component, fixture, inject } = await setupRibbonComponent();
        const service = inject(NxRibbonService);
        const context: RibbonContext = {
            visibility: false,
            message: '',
            actions: [],
            type: undefined,
            updateFunction: undefined,
        };

        service.hide();
        fixture.detectChanges();

        expect(service.contextSubject.value).toEqual(context);

        expect(component.visibility).toBeFalsy();
        expect(component.message).toBe('');
        expect(component.actions).toEqual([]);
    });
});
