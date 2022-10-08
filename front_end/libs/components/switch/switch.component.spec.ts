import { DebugElement } from '@angular/core';
import {
    ComponentFixture,
    TestBed,
    waitForAsync
} from '@angular/core/testing';

import { NxSwitchComponent } from './switch.component';

describe('NxSwitchComponent', () => {
    let component: NxSwitchComponent;
    let fixture: ComponentFixture<NxSwitchComponent>;
    let el: DebugElement;
    let body: HTMLElement;
    let label: HTMLElement;
    let input: HTMLElement;
    let span: HTMLElement;
    let elemBar: HTMLElement;
    let elemCircle: HTMLElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxSwitchComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(NxSwitchComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement;

        component.id = 'testId';
        component.label = 'Test label';

        fixture.detectChanges();

        body = el.nativeElement.querySelector('div');
        label = el.nativeElement.querySelector('h4.switch-label');
        input = el.nativeElement.querySelector('div.switch .switch-element input');
        span = el.nativeElement.querySelector('div.switch .switch-element span');
        elemBar = el.nativeElement.querySelector('div.switch .bar');
        elemCircle = el.nativeElement.querySelector('div.switch .circle');
    }));

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should init component (DEFAULT)', () => {
        expect(body.id).toBe(component.componentId + '-wrapper');
        expect(label.innerText).toBe('Test label');
        expect(input.getAttribute('type')).toBe('checkbox');
        expect(input.id).toBe(component.componentId);
        expect(span.classList.contains('slider')).toBeTrue();
        expect(elemBar).toBeDefined();
        expect(elemCircle).toBeDefined();
    });

    it('should change value and emit event', () => {
        spyOn(component.onSwitch, 'emit');
        expect(component['value']).toBeFalse();

        body.click();
        expect(component['value']).toBeTrue();
        expect(component.onSwitch.emit).toHaveBeenCalledWith(true);
    });

    it('should not change value if disabled', () => {
        spyOn(component.onSwitch, 'emit');
        component.disabled = true;

        body.click();
        expect(component['value']).toBeFalse();
        expect(component.onSwitch.emit).toHaveBeenCalledWith(undefined);
    });

    it('should change state (NgModel)', () => {
        component.writeValue(true);
        expect(component['value']).toBeTrue();
    });

    it('should not change value if disabled (NgModel)', () => {
        component.disabled = true;
        component.writeValue(true);
        expect(component['value']).toBeFalse();
    });
});
