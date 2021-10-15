import { ComponentFixture, inject, TestBed, waitForAsync } from '@angular/core/testing';
import { DebugElement, NgModule }             from '@angular/core';
import { NxRibbonComponent, RibbonAction }    from './ribbon.component';
import { NxRibbonService, RibbonActionInput } from './ribbon.service';
import { nxConfig }                           from '@services/nx-config/config';
import { NxConfigService }                    from '@services/nx-config';
import { NxHeaderService }                    from '@services/nx-header.service';
import { RouterLinkDirectiveStub }            from '@src/_testing';
import { TranslateModule }                    from '@ngx-translate/core';
import { NxLanguageProviderService }          from '@services/nx-language-provider';
import { setupConfig }                        from '@src/_mocks/config.test';
import { CommonModule } from '@angular/common';

@NgModule({
    imports: [TranslateModule.forRoot()],
    exports: [TranslateModule]
})
class TranslateTestingModule {
}

describe('NxRibbonComponent', () => {
    let component: NxRibbonComponent;
    let fixture: ComponentFixture<NxRibbonComponent>;
    let el: DebugElement;

    const translateMock = {
        translations: {}
    };
    const configMock = { getConfig: () => nxConfig };

    beforeEach(waitForAsync(() => {
        const spyHeader = jasmine.createSpyObj('NxHeaderService', ['currentLocation']);

        TestBed.configureTestingModule({
            declarations: [NxRibbonComponent, RouterLinkDirectiveStub],
            imports: [
                CommonModule,
                TranslateTestingModule
            ],
            providers: [
                NxRibbonService,
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxHeaderService, useValue: spyHeader },
                { provide: NxConfigService, useValue: configMock }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxRibbonComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;

                fixture.detectChanges();
            });
    }));

    it('should create NxRibbonComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should be initialized', () => {
        component.ngOnInit();

        spyOnProperty(component, 'showRibbon').and.returnValue(component.visibility && true);
        expect(component.showRibbon).toBeFalsy();
        expect(component.visibility).toBe(false);
        expect(component.type).toBe('');
        expect(component.updateFunction).toBe('');
        expect(component.message).toBe('');
        expect(component.actions).toEqual([]);
    });

    it('should use NxRibbonService to get data', inject(
        [NxRibbonService],
        (service: NxRibbonService) => {
            service.CONFIG = setupConfig();
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
                systemOffline: () => 'System is offline. Some settings may not be available.',
                systemsMerging: () => 'This system is currently involved in a merge operation.'
            };

            const actions: RibbonAction[] = [{
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

            service.show(context.message, context.actions, context.type, context.updateFunction);
            fixture.detectChanges();

            service.contextSubject.subscribe((serviceContext) => {
                expect(serviceContext).toEqual(context);
            });

            spyOnProperty(component, 'showRibbon').and.returnValue(component.visibility && true);
            expect(component.showRibbon).toBeTruthy();
            expect(component.message).toBe(context.message);
            expect(component.actions).toEqual(context.actions);
        }
    ));

    it('should use NxRibbonService to hide and reset data', inject(
        [NxRibbonService],
        (service: NxRibbonService) => {
            const context = {
                visibility: false,
                message: '',
                actions: [],
                type: '',
                updateFunction: ''
            };

            service.hide();
            fixture.detectChanges();

            service.contextSubject.subscribe((serviceContext) => {
                expect(serviceContext).toEqual(context);
            });

            spyOnProperty(component, 'showRibbon').and.returnValue(component.visibility && true);
            expect(component.showRibbon).toBeFalsy();
            expect(component.message).toBe('');
            expect(component.actions).toEqual([]);
        }
    ));
});
