import { v4 as uuid } from 'uuid';

import staticLang from '@language_static';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { nxConfig } from '@services/nx-config/config';

import { layoutIdChangeSideEffectFactory } from './layout-id-change-side-effect-factory';

describe('layoutIdChangeSideEffectFactory', () => {
    const setParamState = jest.fn();
    const setPageTitle = jest.fn();
    const paramState$$ = {
        set: setParamState,
    } as unknown as LayoutStateService['paramStateHandler']['state$$'];
    const systemName = uuid();

    const layoutIdChangeSideEffect = layoutIdChangeSideEffectFactory(
        paramState$$,
        systemName,
        setPageTitle,
    );

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return value unmodified', () => {
        const layoutId = uuid();
        expect(layoutIdChangeSideEffect(layoutId)).toEqual(layoutId);
    });

    it('should set paramState with layoutId', () => {
        const layoutId = uuid();
        layoutIdChangeSideEffect(layoutId);
        expect(setParamState).toHaveBeenCalledWith({ params: { layoutId } });
    });

    it('should set page title', () => {
        const layoutId = uuid();
        layoutIdChangeSideEffect(layoutId);
        expect(setPageTitle).toHaveBeenCalledWith(
            [staticLang.pageTitles.layouts, systemName, nxConfig.cloudName].join(' - '),
        );
    });
});
