import { TestBed, waitForAsync } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';

import { NxAppStateService } from '@services/nx-app-state.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxRibbonService, RibbonActionInput } from './ribbon.service';

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

    it('should be initialized', () => {
        expect(ribbonService.context.visibility).toBeFalsy();
        expect(ribbonService.context.message).toBe('');
        expect(ribbonService.context.actions).toEqual([]);
        expect(ribbonService.context.type).toBe('');
    });

    it('show() should emit data to contextSubject', () => {
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
        const context = {
            visibility: false,
            message: '',
            actions: [],
            type: '',
            updateFunction: ''
        };
        ribbonService.contextSubject = new BehaviorSubject(context);

        ribbonService.hide();

        ribbonService.contextSubject.subscribe(message => {
            expect(message).toEqual(context);
        });
    });
});
