import { DebugElement } from '@angular/core';
import {
    ComponentFixture,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MockProvider } from 'ng-mocks';

import { NxTagComponent } from '@components/tag/tag.component';
import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxPasswordTagValidationComponent } from './password-tag-validation.component';

describe('NxPasswordTagValidationComponent', () => {
    let component: NxPasswordTagValidationComponent;
    let fixture: ComponentFixture<NxPasswordTagValidationComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                imports: [NgbModule],
                declarations: [
                    NxPasswordTagValidationComponent,
                    NxTagComponent
                ],
                providers: [
                    MockProvider(NxLanguageProviderService),
                    MockProvider(NxConfigService)
                ]
            })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxPasswordTagValidationComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;

                // component.value = 'test1234';
                component.forElement = {
                    valid: true,
                    touched: true,
                    dirty: true,
                    control: {
                        fairPassword: false
                    },
                    errors: {
                        minlength: false,
                        common: false,
                        weak: false,
                        pattern: false
                    }
                };

                fixture.detectChanges();
            })
            .catch(err => console.error(err));
    }));

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should be "GOOD"', () => {
        const tag = el.nativeElement.querySelectorAll('span#successMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-success-bright static');
        expect(tag[0].innerText).toBe('GOOD');
    });

    it('should be "FAIR"', () => {
        component.forElement.control.fairPassword = true;
        fixture.detectChanges();

        const tag = el.nativeElement.querySelectorAll('span#successMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-warning-bright static');
        expect(tag[0].innerText).toBe('FAIR');
    });

    it('should be "TOO SHORT"', () => {
        component.forElement.valid = false;
        component.forElement.dirty = true;
        component.forElement.errors.minlength = true;

        fixture.detectChanges();

        const tag = el.nativeElement.querySelectorAll('span#failMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-danger-bright static');
        expect(tag[0].innerText).toBe('TOO SHORT');
    });

    it('should be "TOO COMMON"', () => {
        component.forElement.valid = false;
        component.forElement.dirty = true;
        component.forElement.errors.common = true;

        fixture.detectChanges();

        const tag = el.nativeElement.querySelectorAll('span#failMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-danger-bright static');
        expect(tag[0].innerText).toBe('TOO COMMON');
    });

    it('should be "WEAK"', () => {
        component.forElement.valid = false;
        component.forElement.dirty = true;
        component.forElement.errors.weak = true;

        fixture.detectChanges();

        const tag = el.nativeElement.querySelectorAll('span#failMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-danger-bright static');
        expect(tag[0].innerText).toBe('WEAK');
    });

    it('should be "INCORRECT"', () => {
        component.forElement.valid = false;
        component.forElement.dirty = true;
        component.forElement.errors.pattern = true;
        component.forElement.errors.minlength = false;

        fixture.detectChanges();

        const tag = el.nativeElement.querySelectorAll('span#failMessages nx-tag a');
        expect(tag.length).toBe(1);
        expect(tag[0].className).toContain('badge small badge-danger-bright static');
        expect(tag[0].innerText).toBe('INCORRECT');
    });
});
