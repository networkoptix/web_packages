import { waitForAsync, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DebugElement, NgModule }                                   from '@angular/core';
import { describe, expect, jest, beforeEach, it }                   from '@jest/globals';

import { NxLicenseTrialComponent }        from './trial.component';
import { NxConfigService }                from '@services/nx-config';
import { nxConfig }                       from '@services/nx-config/config';
import { NxLanguageProviderService }      from '@services/nx-language-provider';
import { NxProcessService }               from '@services/process.service';
import { NxDialogsService }               from '@dialogs/dialogs.service';
import { NxContentBlockComponent }        from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { FormsModule }                    from '@angular/forms';
import { NxProcessButtonComponent }       from '@components/process-button/process-button.component';
import { TranslateModule }                from '@ngx-translate/core';

@NgModule({
    imports : [TranslateModule.forRoot()],
    exports : [TranslateModule]
})
class TranslateTestingModule {
}

describe('Licenses (Trial)', () => {
    let component: NxLicenseTrialComponent;
    let fixture: ComponentFixture<NxLicenseTrialComponent>;
    let el: DebugElement;

    const translateMock = {
        translations: {}
    };
    const configMock = { getConfig: () => nxConfig };
    const processMock = {
        run: jest.fn(() => {
            return {};
        })
    };
    const potentialMock = {
        getConfig     : jest.fn(),
        createProcess : jest.fn()
    };

    let form;
    let button;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxLicenseTrialComponent, NxContentBlockComponent,
                NxContentBlockSectionComponent, NxProcessButtonComponent
            ],
            imports   : [FormsModule, TranslateTestingModule],
            providers : [
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxConfigService, useValue: configMock },
                { provide: NxProcessService, useValue: potentialMock },
                { provide: NxDialogsService, useValue: {} }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxLicenseTrialComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call getConfig', () => {
        expect(configMock.getConfig).toBeTruthy();
    });

    describe('Have registered trial key', () => {
        beforeEach(() => {
            component.trialLicense = '';
            component.haveTrialLicense = true;
            fixture.detectChanges();
        });

        it('should hide if no trial license provided', () => {
            expect(fixture).toMatchSnapshot();
        });
    });

    describe('Have non-registered trial key', () => {
        beforeEach(() => {
            component.trialLicense = '0000-0000-0000-0000';
            component.haveTrialLicense = false;
            fixture.detectChanges();
        });

        it('should render if trial license provided', () => {
            expect(fixture).toMatchSnapshot();
        });

        describe('Have elements', () => {
            beforeEach(() => {
                form = fixture.debugElement.nativeElement.querySelector('form[id=trialLicenseForm]');
                button = fixture.debugElement.nativeElement.querySelector('nx-process-button').querySelector('button');
            });

            it('should have button w/ caption', () => {
                expect(button).toBeTruthy();
                // nx-process-button caption will contain extra html which at this point is commented out
                expect(button.innerHTML.replace(/<!--(.*?)-->/g, '')).toBe('Activate Trial License');
            });

            it('should have form and description', () => {
                expect(form).toBeTruthy();
                const line1 = form.querySelector('#trial_license_line1');
                const line2 = form.querySelector('#trial_license_line2');

                expect(line1.innerHTML).toBe('You have an unused trial license.');
                expect(line2.innerHTML).toBe('Once activated, it will allow you to record up to 4 cameras for 30 days.');
            });
        });
        // TODO: Figure out how to mock NxProcessService
        // it.skip('should register trial license', fakeAsync(() => {
        //     jest.mock('Process');
        //     const button = fixture.debugElement.nativeElement.querySelector('nx-process-button').querySelector('button');
        //     button.click();
        //     tick();
        //     expect(processMock.run.mock.calls.length).toBe(1);
        // }));
    });
});
