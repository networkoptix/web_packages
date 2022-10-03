import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import {
    ComponentFixture,
    inject,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MockProvider } from 'ng-mocks';

import { NxConfigService } from '@services/nx-config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { RouterLinkDirectiveStub } from '@src/_testing';

import { NxRibbonComponent, RibbonAction } from './ribbon.component';
import { NxRibbonService } from './ribbon.service';

describe('NxRibbonComponent', () => {
    let component: NxRibbonComponent;
    let fixture: ComponentFixture<NxRibbonComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        const spyHeader = jasmine.createSpyObj('NxHeaderService', ['currentLocation']);

        TestBed.configureTestingModule({
            declarations: [NxRibbonComponent, RouterLinkDirectiveStub],
            imports: [
                CommonModule,
                TranslateModule.forRoot()
            ],
            providers: [
                NxRibbonService,
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
                { provide: NxHeaderService, useValue: spyHeader }
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

        spyOnProperty(component, 'showRibbon')
            .and.returnValue(component.visibility && true);
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

            service.show(
                context.message,
                context.actions,
                context.type,
                context.updateFunction
            );
            fixture.detectChanges();

            service.contextSubject.subscribe((serviceContext) => {
                expect(serviceContext).toEqual(context);
            });

            spyOnProperty(component, 'showRibbon')
                .and.returnValue(component.visibility && true);
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

            spyOnProperty(component, 'showRibbon')
                .and.returnValue(component.visibility && true);
            expect(component.showRibbon).toBeFalsy();
            expect(component.message).toBe('');
            expect(component.actions).toEqual([]);
        }
    ));
});
