import { HttpClient } from '@angular/common/http';
import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { NxAppStateService } from '@services/nx-app-state.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxRibbonService, RibbonActionInput } from './ribbon.service';

describe('NxRibbonService', () => {
    const translateMock = {
        translations: {}
    };

    beforeEach(waitForAsync(() => {
        const spyHeader = jasmine.createSpyObj(
            'NxHeaderService',
            ['currentLocation']
        );
        const spyAppState = jasmine.createSpyObj(
            'NxDialogsService',
            ['ribbonVisibility']
        );

        TestBed.configureTestingModule({
            imports: [],
            providers: [
                NxRibbonService,
                { provide: HttpClient, useValue: {} },
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxHeaderService, useValue: spyHeader },
                { provide: NxAppStateService, useValue: spyAppState }
            ]
        });
    }));

    it('should be created', inject([NxRibbonService], (service: NxRibbonService) => {
        expect(service).toBeTruthy();
    }));

    it('should be initialized', inject([NxRibbonService], (service: NxRibbonService) => {
        expect(service.context.visibility).toBeFalsy();
        expect(service.context.message).toBe('');
        expect(service.context.actions).toEqual([]);
        expect(service.context.type).toBe('');
    }));

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

            const actions: RibbonActionInput[] = [{
                type: 'link',
                text: 'Go back',
                value: '/admin/cms/asset'
            }];
            const context = {
                visibility: true,
                message: 'Alcohol! Because no great story started with someone eating a salad.',
                actions,
                type: '',
                updateFunction: ''
            };
            service.contextSubject = new BehaviorSubject(context);

            service.show(context.message, context.actions, context.type, context.updateFunction);

            service.contextSubject.subscribe((serviceContext) => {
                expect(serviceContext).toEqual(context);
            });
        })
    );

    it('hide() should emit data to contextSubject',
        inject([NxRibbonService], (service: NxRibbonService) => {
            const context = {
                visibility: false,
                message: '',
                actions: [],
                type: '',
                updateFunction: ''
            };
            service.contextSubject = new BehaviorSubject(context);

            service.hide();

            service.contextSubject.subscribe((message) => {
                expect(message).toEqual(context);
            });
        })
    );
});
