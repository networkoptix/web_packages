import { CommonModule } from '@angular/common';
// import { DebugElement } from '@angular/core';
import {
    ComponentFixture,
    inject,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { RouterLink } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MockProvider, MockDirective, MockModule } from 'ng-mocks';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxRibbonComponent } from './ribbon.component';
import { NxRibbonService } from './ribbon.service';
import type { RibbonAction, RibbonContext } from './ribbon.types';

describe('NxRibbonComponent', () => {
    let component: NxRibbonComponent;
    let fixture: ComponentFixture<NxRibbonComponent>;
    // let el: DebugElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxRibbonComponent, MockDirective(RouterLink)],
            imports: [
                MockModule(CommonModule),
                MockModule(TranslateModule),
                RouterTestingModule,
            ],
            providers: [
                NxRibbonService,
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
                MockProvider(NxHeaderService),
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxRibbonComponent);
                component = fixture.componentInstance;
                // el = fixture.debugElement;

                fixture.detectChanges();
            });
    }));

    it('should create NxRibbonComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should be initialized', () => {
        component.ngOnInit();

        expect(component.visibility).toBeFalse();
        expect(component.type).toBeUndefined();
        expect(component.updateFunction).toBeUndefined();
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
            const context: RibbonContext = {
                visibility: true,
                message: 'Alcohol! Because no great story started with someone eating a salad.',
                actions,
                type: undefined,
                updateFunction: undefined
            };

            service.show(
                context.message,
                context.actions,
                context.type,
                context.updateFunction
            );
            fixture.detectChanges();

            service.contextSubject.subscribe(serviceContext => {
                expect(serviceContext).toEqual(context);
            });

            expect(component.visibility).toBeTrue();
            expect(component.message).toBe(context.message);
            expect(component.actions).toEqual(context.actions);
        }
    ));

    it('should use NxRibbonService to hide and reset data', inject(
        [NxRibbonService],
        (service: NxRibbonService) => {
            const context: RibbonContext = {
                visibility: false,
                message: '',
                actions: [],
                type: undefined,
                updateFunction: undefined
            };

            service.hide();
            fixture.detectChanges();

            service.contextSubject.subscribe(serviceContext => {
                expect(serviceContext).toEqual(context);
            });

            expect(component.visibility).toBeFalse();
            expect(component.message).toBe('');
            expect(component.actions).toEqual([]);
        }
    ));
});
