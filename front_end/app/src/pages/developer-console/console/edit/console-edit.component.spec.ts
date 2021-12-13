import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement, Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { v4 as uuid } from 'uuid';

import { nxConfig } from '@services/nx-config/config';

import { forUnitTest, NxDevConsoleEditComponent } from './console-edit.component';

const {
    NxConfigService,
    NxLanguageProviderService,
    ActivatedRoute,
    Router,
    NxProcessService,
    NxCloudApiService,
    NxHeaderService,
    NxConsoleService
} = forUnitTest;

@Component({
    selector: 'nx-block',
    template: `
        <div>
            <ng-content></ng-content>
        </div>
    `
})
class MockContentBlockComponent {}

@Component({
    selector: 'nx-section',
    template: `
        <div>
            <ng-content></ng-content>
        </div>
    `
})
class MockContentBlockSectionComponent {}

@Component({
    selector: 'nx-process-button',
    template: '<div></div>'
})
class MockProcessButtonComponent {
    @Input() process;
    @Input() actionType;
    @Input() form;
    @Input() clickFn;
    @Input() removeMinWidth;
    @Input() buttonText;
}

@Component({
    selector: 'nx-cancel-button',
    template: '<div></div>'
})
class MockProcessCancelButtonComponent {
    @Input() discardFn;
    @Input() customClass;
}

@Component({
    selector: 'nx-pre-loader',
    template: '<div></div>'
})
class MockPreLoaderComponentComponent {}

describe('NxDevConsoleEditComponent', () => {
    let component: NxDevConsoleEditComponent;
    let fixture: ComponentFixture<NxDevConsoleEditComponent>;
    let el: DebugElement;
    let expectedField;
    let expectedAssetValue;
    let input;
    const configMock = { config: nxConfig, getConfig: () => nxConfig };
    const translateMock = {
        translations: {}
    };

    const routeMock = {
        snapshot: {
            params: {
                section: 'custom-clients',
                id: uuid()
            }
        }
    };
    const processMock = {
        createProcess: () => Promise.resolve()
    };
    const cloudMock = {};
    const headerMock = {
        currentLocation: { parentNode: { nodes: [] } },
        setLocation: () => { }
    };

    const getSection =
        (field) => el.nativeElement.querySelector(`.section-${field.name}`);

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [
                    NxDevConsoleEditComponent,
                    MockContentBlockComponent,
                    MockContentBlockSectionComponent,
                    MockProcessButtonComponent,
                    MockProcessCancelButtonComponent,
                    MockPreLoaderComponentComponent
                ],
                imports: [
                    CommonModule,
                    TranslateModule.forRoot(),
                    HttpClientTestingModule,
                    FormsModule,
                    NgbModule
                ],
                providers: [
                    { provide: NxConfigService, useValue: configMock },
                    { provide: NxHeaderService, useValue: headerMock },
                    { provide: NxLanguageProviderService, useValue: translateMock },
                    { provide: ActivatedRoute, useValue: routeMock },
                    { provide: Router, useValue: {} },
                    { provide: NxConsoleService, useValue: { unsavedAssets: {} } },
                    { provide: NxProcessService, useValue: processMock },
                    { provide: NxCloudApiService, useValue: cloudMock }
                ]
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxDevConsoleEditComponent);
        component = fixture.componentInstance;
        expectedField = {
            name: uuid(),
            type: 'text',
            placeholder: uuid(),
            description: uuid(),
            label: uuid(),
            optional: false
        };
        const context = { name: '', label: '', global: false, fields: [expectedField] };
        component.context = context;
        expectedAssetValue = uuid();
        component.asset = { values: { [expectedField.name]: expectedAssetValue } };

        el = fixture.debugElement;
        fixture.detectChanges();

        input = getSection(expectedField)?.querySelector('input');
    }));

    it('should create NxDevConsoleEditComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should show preloader', () => {
        component.context = null;
        fixture.detectChanges();

        expect(el.nativeElement.querySelector('nx-pre-loader')).toBeTruthy();
    });

    it('should show apply section', () => {
        expect(el.nativeElement.querySelector('.apply-wrapper')).toBeTruthy();
    });

    it('should show error when missing required fields', () => {
        component.hasErrors = true;
        fixture.detectChanges();

        const applyWrapper = el.nativeElement.querySelector('.apply-wrapper');
        expect(applyWrapper.querySelector('.input-error')?.innerText).toEqual(
            'Fill in all required fields');
    });

    it('should display field', () => {
        expect(input).toBeTruthy();
    });

    it('should display correct label when optional', () => {
        component.context.fields[0].optional = true;
        fixture.detectChanges();

        const section = getSection(expectedField);
        expect(section.querySelector('label').innerText).toEqual(
            expectedField.label);
    });

    it('should display correct label when not optional', () => {
        component.context.fields[0].optional = false;

        fixture.detectChanges();

        const section = getSection(expectedField);
        const label = section.querySelector('label');
        const requiredAsterisk = ' *';

        expect(label.innerText).toEqual(
            expectedField.label + requiredAsterisk);
        expect(label.querySelector('.input-error').innerText).toEqual(
            requiredAsterisk.trim());
    });

    it('should display description', () => {
        const section = getSection(expectedField);
        const contextFieldDescription = section.querySelector('.context-field-description');
        expect(contextFieldDescription).toBeTruthy();
        expect(contextFieldDescription.innerText).toEqual(
            expectedField.description);
    });

    it('should display field errors', () => {
        const expectedError = uuid();
        component.errors = {
            [expectedField.name]: [expectedError]
        };
        fixture.detectChanges();

        const section = getSection(expectedField);
        const errorsDiv = section.querySelector('.d-flex.flex-column');
        expect(errorsDiv).toBeTruthy();
        expect(errorsDiv.querySelector('.input-error').innerText).toEqual(
            expectedError);
    });

    it('should render input for field', () => {
        expect(input).toBeTruthy();
    });

    it('should have label with correct type', () => {
        expect(input.type).toEqual(
            expectedField.type);
    });

    it('should have correct placeholder', () => {
        expect(input.placeholder).toEqual(
            expectedField.placeholder);
    });

    it('should be for correct label for field', () => {
        const section = getSection(expectedField);
        expect(section.querySelector('label').htmlFor).toEqual(
            expectedField.name);
    });

    it('should match asset model value and input value', () => {
        expect(input.value).toEqual(
            expectedAssetValue);
    });

    it('should update model when input updates', () => {
        const updatedValue = uuid();
        input.value = updatedValue;
        input.dispatchEvent(new CustomEvent('input'));

        fixture.detectChanges();
        fixture.whenStable().then(() => {
            const assetFieldValue = component.asset.values[expectedField.name];
            expect(assetFieldValue).toEqual(
                updatedValue);
        });
    });
});
