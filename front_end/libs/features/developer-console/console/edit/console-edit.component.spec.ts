import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement, Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MockDirective } from 'ng-mocks';
import { v4 as uuid } from 'uuid';

import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxConsoleService } from '@pages/developer-console/console/console.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxHeaderService } from '@services/nx-header.service';
import { NxProcessService } from '@services/process.service';

import { NxDevConsoleEditComponent } from './console-edit.component';

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
    let debugElement: DebugElement;
    let expectedField;
    let expectedAssetValue;
    let input;
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
        setLocation: () => {}
    };

    const getSection =
        field => debugElement.nativeElement.querySelector(`.section-${field.name}`);

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [
                    NxDevConsoleEditComponent,
                    MockContentBlockComponent,
                    MockContentBlockSectionComponent,
                    MockProcessButtonComponent,
                    MockProcessCancelButtonComponent,
                    MockPreLoaderComponentComponent,
                    MockDirective(NxTooltipDirective),
                ],
                imports: [
                    CommonModule,
                    TranslateModule.forRoot(),
                    HttpClientTestingModule,
                    FormsModule,
                ],
                providers: [
                    { provide: NxHeaderService, useValue: headerMock },
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

        debugElement = fixture.debugElement;
        fixture.detectChanges();

        input = getSection(expectedField)?.querySelector('input');
    }));

    it('should create NxDevConsoleEditComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should show preloader', () => {
        component.context = null;
        fixture.detectChanges();

        expect(debugElement.nativeElement.querySelector('nx-pre-loader')).toBeTruthy();
    });

    it('should show apply section', () => {
        expect(debugElement.nativeElement.querySelector('.apply-wrapper')).toBeTruthy();
    });

    it('should show error when missing required fields', () => {
        component.hasErrors = true;
        fixture.detectChanges();

        const applyWrapper = debugElement.nativeElement.querySelector('.apply-wrapper');
        expect(applyWrapper.querySelector('.input-error')?.textContent.trim()).toEqual(
            'Fill in all required fields');
    });

    it('should display field', () => {
        expect(input).toBeTruthy();
    });

    it('should display correct label when optional', () => {
        component.context.fields[0].optional = true;
        fixture.detectChanges();

        const section = getSection(expectedField);
        expect(section.querySelector('label').textContent.trim()).toEqual(
            expectedField.label);
    });

    it('should display correct label when not optional', () => {
        component.context.fields[0].optional = false;

        fixture.detectChanges();

        const section = getSection(expectedField);
        const label = section.querySelector('label');
        const requiredAsterisk = ' *';

        expect(label.textContent.trim()).toEqual(
            expectedField.label + requiredAsterisk);
        expect(label.querySelector('.input-error').textContent.trim()).toEqual(
            requiredAsterisk.trim());
    });

    it('should display description', () => {
        const section = getSection(expectedField);
        const contextFieldDescription = section.querySelector('.context-field-description');
        expect(contextFieldDescription).toBeTruthy();
        expect(contextFieldDescription.textContent.trim()).toEqual(
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
        expect(errorsDiv.querySelector('.input-error').textContent.trim()).toEqual(
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
