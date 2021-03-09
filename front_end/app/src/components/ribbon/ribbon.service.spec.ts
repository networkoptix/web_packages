import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { NxRibbonService, RibbonActionInput }              from './ribbon.service';
import { BehaviorSubject }                                 from 'rxjs';
import { NgModule }                          from '@angular/core';
import { TranslateModule }                                 from '@ngx-translate/core';
import { NxAppStateService }                               from '@services/nx-app-state.service';
import { NxHeaderService }                                 from '@services/nx-header.service';
import { NxDialogsService }                                from '@dialogs/dialogs.service';

@NgModule({
    imports: [TranslateModule.forRoot()],
    exports: [TranslateModule]
})
class TranslateTestingModule {
}

describe('NxRibbonService', () => {
    beforeEach(() => {
        const spyHeader = jasmine.createSpyObj('NxHeaderService', ['currentLocation']);
        const spyAppState = jasmine.createSpyObj('NxDialogsService', ['ribbonVisibility']);

        TestBed.configureTestingModule({
            imports   : [],
            providers : [
                NxRibbonService,
                { provide: NxHeaderService, useValue: spyHeader },
                { provide: NxAppStateService, useValue: spyAppState }
            ]
        });
    });

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
            const actions: RibbonActionInput[] = [{
                type  : 'link',
                text  : 'Go back',
                value : '/admin/cms/asset'
            }];
            const context = {
                visibility     : true,
                message        : 'Alcohol! Because no great story started with someone eating a salad.',
                actions,
                type           : '',
                updateFunction : ''
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
                visibility     : false,
                message        : '',
                actions        : [],
                type           : '',
                updateFunction : ''
            };
            service.contextSubject = new BehaviorSubject(context);

            service.hide();

            service.contextSubject.subscribe((message) => {
                expect(message).toEqual(context);
            });
        })
    );
});
