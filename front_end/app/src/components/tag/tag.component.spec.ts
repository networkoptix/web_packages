import { DebugElement } from '@angular/core';
import {
    ComponentFixture,
    TestBed,
    waitForAsync
} from '@angular/core/testing';

import { NxTagComponent } from './tag.component';

describe('NxTagComponent', () => {
    let component: NxTagComponent;
    let fixture: ComponentFixture<NxTagComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxTagComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(NxTagComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement;
    }));

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should init component (DEFAULT)', () => {
        fixture.detectChanges();
        expect(component.static).toBeFalse();
        expect(component.size).toBe('small');
        expect(component.element).toBe('badge');
        expect(component.badgeType).toBe('badge');
    });

    it('should init component (w/ OPTIONS)', () => {
        component.static = ''; // not undefined
        component.element = 'btn';
        component.type = 'success';
        fixture.detectChanges();

        expect(component.static).toBeTrue();
        expect(component.element).toBe('btn');
        expect(component.badgeType).toBe('badge-success');
    });

    it('should change state when clicked', () => {
        spyOn(component.onClick, 'emit');
        component.type = 'success';
        fixture.detectChanges();

        const tag = el.nativeElement.querySelector('a');
        tag.click();

        expect(component.selected).toBeTrue();
        expect(component.badgeType).toBe('badge-success-selected');
        expect(component.onClick.emit).toHaveBeenCalledWith(true);
    });

    it('should not change state when clicked if static', () => {
        component.type = 'success';
        component.static = ''; // not undefined
        fixture.detectChanges();

        const tag = el.nativeElement.querySelector('a');
        tag.click();

        expect(component.selected).toBeUndefined();
        expect(component.badgeType).toBe('badge-success');
    });
});
