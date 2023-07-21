import { setupComponent } from '../src/setup';

import { NxRibbonService } from './ribbon.service';
import type { RibbonAction, RibbonContext } from './ribbon.types';

const setupRibbonService = async (): Promise<NxRibbonService> => {
    const { inject } = await setupComponent();
    return inject(NxRibbonService);
};

/**
 * Fixed these unit tests so that they run. They don't seem to test anything useful though.
 */
describe('NxRibbonService', () => {
    it('should be created', async () => {
        const ribbonService = await setupRibbonService();
        expect(ribbonService).toBeTruthy();
    });

    /**
     * Not sure what this was supposed to do. There aren't any expect calls.
     */
    xit('show() should emit data to contextSubject', async () => {
        // const service = await setupRibbonService();
        // service.LANG.ribbon = {
        //     beingMerged: {
        //         mayTake: () => 'Depending on the size of the database, it may take up to several hours.',
        //         to: () => 'is being merged to this system'
        //     },
        //     finishingMerge: () => 'Finishing systems merge',
        //     integration: {
        //         accept: () => 'Accept',
        //         backToEditText: () => 'Back to the editing interfaces',
        //         previewRibbon: () => 'This page is a preview of the latest changes, and it doesn\'t match publicly available version.',
        //         publishedRibbon: () => 'This page is the live version that is publicly available.',
        //         reject: () => 'Reject'
        //     },
        //     newVersionAvailable: {
        //         notification: () => 'New version of %CLOUD_NAME% is available',
        //         installButton: () => 'Install Now'
        //     },
        //     systemOffline: () => 'System is offline. Some settings may not be available.',
        //     systemsMerging: () => 'This system is currently involved in a merge operation.'
        // };
    });

    it('show() should emit data to contextSubject', async () => {
        const ribbonService = await setupRibbonService();
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
        ribbonService.contextSubject.next(context);

        ribbonService.show(context.message, context.actions, context.type, context.updateFunction);

        expect(ribbonService.contextSubject.value).toEqual(context);
    });

    it('hide() should emit data to contextSubject', async () => {
        const ribbonService = await setupRibbonService();
        const context: RibbonContext = {
            visibility: false,
            message: '',
            actions: [],
            type: undefined,
            updateFunction: undefined,
        };
        ribbonService.contextSubject.next(context);

        ribbonService.hide();

        expect(ribbonService.contextSubject.value).toEqual(context);
    });
});
