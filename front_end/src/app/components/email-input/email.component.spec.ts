import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MockProvider } from 'ng-mocks';

import { NxFocusMeDirective } from '@directives/nx-focus-me';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxEmailComponent } from './email.component';

describe('NxEmailComponent email input Unit Test', () => {
    let component: NxEmailComponent;
    let fixture: ComponentFixture<NxEmailComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxEmailComponent, NxFocusMeDirective],
            imports: [CommonModule, FormsModule],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService)
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NxEmailComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement;
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should show normal email input', () => {
        fixture.detectChanges();
        const input = el.nativeElement.querySelector('input');
        expect(input.attributes.getNamedItem('ng-reflect-name')).toBeNull();
        component.componentId = 'exampleId';
        component.lockEmail = false;
        fixture.detectChanges();
        expect(input.attributes.getNamedItem('ng-reflect-name')?.value).toBe('exampleId');
        expect(input.className).toContain('form-control');
        expect(input.type).toBe('email');
        expect(el.nativeElement.querySelectorAll('.hide-errors').length).toBe(0);
    });

    it('should show email input with hide-errors class', () => {
        component.componentId = 'exampleId';
        component.hideErrors = true;
        fixture.detectChanges();
        const input = el.nativeElement.querySelector('input');
        expect(input.className).toContain('hide-errors form-control');
    });

    it('should show non-authorize email input', () => {
        component.componentId = 'exampleId';
        component.hideErrors = false;
        component.authorize = true;
        fixture.detectChanges();
        const input = el.nativeElement.querySelector('input');
        expect(input.className).not.toContain('form-control');
    });

    it('should show locked email input', () => {
        component.lockEmail = true;
        component.authorize = false;
        fixture.detectChanges();
        const input = el.nativeElement.querySelector('input');
        expect(input.attributes.getNamedItem('ng-reflect-name')?.value)
            .toBe('registerEmailLocked');
        expect(input.type).toBe('text');
        expect(input.className).toContain('form-control');
    });
});
