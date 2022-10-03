import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NgxMaskModule } from 'ngx-mask';

import {
    NxContentBlockComponent
} from '@components/content-block/content-block.component';
import {
    NxContentBlockSectionComponent
} from '@components/content-block/section/section.component';
import {
    NxProcessButtonComponent
} from '@components/process-button/process-button.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import {
    NxLicenseTrialComponent
} from '@pages/systems/settings/licenses/trial/trial.component';
import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';

import { NxLicenseNewComponent } from './new.component';

describe('Licenses (New)', () => {
    let component: NxLicenseNewComponent;
    let fixture: ComponentFixture<NxLicenseNewComponent>;
    let el: DebugElement;

    const translateMock = {
        translations: {
            system: {
                status: {
                    unavailable: ''
                }
            },
            pageTitles: {
                // systems: () => "Systems"
            }
        }
    };
    const configMock = { getConfig: () => nxConfig };

    let button;
    let form;
    let processService: NxProcessService;
    let processServiceSpy: jasmine.SpyObj<NxProcessService>;

    beforeEach(waitForAsync(() => {
        const spyCreateProcess = jasmine.createSpyObj('NxProcessService', ['createProcess']);
        TestBed.configureTestingModule({
            declarations: [
                NxLicenseNewComponent, NxContentBlockComponent,
                NxContentBlockSectionComponent, NxProcessButtonComponent,
                NxLicenseTrialComponent
            ],
            imports: [
                CommonModule,
                FormsModule,
                TranslateModule.forRoot(),
                NgxMaskModule.forRoot()
            ],
            providers: [
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxConfigService, useValue: configMock },
                { provide: NxDialogsService, useValue: {} },
                { provide: NxProcessService, useValue: spyCreateProcess }
            ]
        });

        fixture = TestBed.createComponent(NxLicenseNewComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement;
        processService = TestBed.inject(NxProcessService);
        processServiceSpy = TestBed.inject(NxProcessService) as jasmine.SpyObj<NxProcessService>;
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call getConfig', () => {
        expect(configMock.getConfig).toBeTruthy();
    });

    it('should call formatLicenseKey and get formatted key', () => {
        const key = (component as any).formatLicenseKey('0000000000000000');
        expect(key).toBe('0000-0000-0000-0000');
    });

    it('should call changeServer', () => {
        component.changeServer('{blablabla}');
        expect(component.selectedServer).toBe('{blablabla}');
    });

    it('should call displayErrors', () => {
        component.displayErrors();
        expect(component.hideErrors).toBeFalsy();
    });

    it('should call isActivated', () => {
        component.licenses = [{
            key: '0000-0000-0000-0000'
        }];
        const res = (component as any).isActivated('0000000000000000');
        expect(res).toBeTruthy();
    });

    describe('Have elements', () => {
        beforeEach(() => {
            fixture.detectChanges();
            button = el.nativeElement.querySelector('nx-process-button').querySelector('button');
            form = component.licenseForm; // el.nativeElement.querySelector('form[id=newLicenseForm]');
        });

        // form is passed as ngForm but controls is empty
        // it('should call setLicenseKey', () => {
        //     component.setLicenseKey('0000000000000000', component.licenseForm);
        //     expect(component.license).toBe('0000000000000000');
        //     expect(component.formattedKey).toBe('0000-0000-0000-0000');
        // });

        it('should have button w/ caption', () => {
            expect(button).toBeTruthy();
            // nx-process-button caption will contain extra html which at this point is commented out
            expect(button.innerHTML.replace(/<!--(.*?)-->/g, '')).toBe('Activate');
        });
    });
});
