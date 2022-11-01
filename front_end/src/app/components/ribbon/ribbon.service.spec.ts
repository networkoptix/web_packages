import { inject, TestBed, waitForAsync } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';

import { NxAppStateService } from '@services/nx-app-state.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxRibbonService } from './ribbon.service';
import type { RibbonAction, RibbonContext } from './ribbon.types';

describe('NxRibbonService', () => {
    let ribbonService: NxRibbonService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [
                NxRibbonService,
                MockProvider(NxLanguageProviderService),
                MockProvider(NxHeaderService),
                MockProvider(NxAppStateService),
            ]
        });
        ribbonService = TestBed.inject(NxRibbonService);
    }));

    it('should be created', () => {
        expect(ribbonService).toBeTruthy();
    });

    it('show() should emit data to contextSubject',
        inject([NxRibbonService], (service: NxRibbonService) => {
            service.LANG.ribbon = {
                beingMerged: {
                    mayTake: () => 'Depending on the size of the database, it may take up to several hours.',
                    to: () => 'is being merged to this system'
                },
                finishingMerge: () => 'Finishing systems merge',
                integration: {
                    accept: () => 'Accept',
                    backToEditText: () => 'Back to the editing interfaces',
                    previewRibbon: () => 'This page is a preview of the latest changes, and it doesn\'t match publicly available version.',
                    publishedRibbon: () => 'This page is the live version that is publicly available.',
                    reject: () => 'Reject'
                },
                newVersionAvailable: {
                    notification: () => 'New version of %CLOUD_NAME% is available',
                    installButton: () => 'Install Now'
                },
                systemOffline: () => 'System is offline. Some settings may not be available.',
                systemsMerging: () => 'This system is currently involved in a merge operation.'
            };
        }));

    it('show() should emit data to contextSubject', () => {
        const actions: RibbonAction[] = [{
            type: 'link',
            text: 'Go back',
            value: '/admin/cms/asset'
        }];
        const context: RibbonContext = {
            visibility: true,
            message: 'Alcohol! Because no great story started with someone eating a salad.',
            actions,
            type: undefined,
            updateFunction: undefined
        };
        ribbonService.contextSubject = new BehaviorSubject(context);

        ribbonService.show(
            context.message,
            context.actions,
            context.type,
            context.updateFunction
        );

        ribbonService.contextSubject.subscribe(serviceContext => {
            expect(serviceContext).toEqual(context);
        });
    });

    it('hide() should emit data to contextSubject', () => {
        const context: RibbonContext = {
            visibility: false,
            message: '',
            actions: [],
            type: undefined,
            updateFunction: undefined
        };
        ribbonService.contextSubject = new BehaviorSubject(context);

        ribbonService.hide();

        ribbonService.contextSubject.subscribe(message => {
            expect(message).toEqual(context);
        });
    });
});
