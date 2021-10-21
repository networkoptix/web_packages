import { Component, DebugElement } from '@angular/core';
import {
    async,
    ComponentFixture, fakeAsync, TestBed,
    tick,
    waitForAsync
}                              from '@angular/core/testing';
import { NxTextEditableComponent } from './editable.component';

@Component({
    template: `<div nx-text-editable
                   required
                   [disabled]="!enableEdit"
                   (onEditModeChanged)="editMode = $event"
                   [ngClass]="{'has-edit-icon': !editMode}"
                   [(ngModel)]="modelVar">{{modelVar}}</div>`
})
class TestNxTextEditableComponent {
    enableEdit: boolean = true;
    editMode: boolean = false;
    modelVar: string = 'blah';
}

describe('NxTextEditableComponent', () => {
    let component: TestNxTextEditableComponent;
    let fixture: ComponentFixture<TestNxTextEditableComponent>;
    let el: HTMLElement;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [TestNxTextEditableComponent, NxTextEditableComponent],
                providers: []
            })
            .compileComponents();

        fixture = TestBed.createComponent(TestNxTextEditableComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement.nativeElement;
        // component.enableEdit = false;

        fixture.detectChanges();
    }));

    it('should create NxTextEditableComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize component', fakeAsync(() => {
        component.modelVar = 'test';
        fixture.detectChanges();

        // expect(el.classList.contains('editable-directive-initial')).toBeTrue();
        expect(el.getAttribute('contenteditable')).toBeTruthy();
    }));

    it('should set valid value', fakeAsync(() => {
        tick();
        expect(el.innerHTML).toBe('test');
    }));

    // describe('should set state on @Input(change) change', () => {
    //     it('to false', () => {
    //         component.ngOnChanges({
    //             checked: new SimpleChange(undefined, false, true)
    //         });
    //         fixture.detectChanges();
    //         component.value = false;
    //         expect(component.state).toBe(component['cbxStates'].false);
    //     });
    //
    //     it('to true', () => {
    //         component.ngOnChanges({
    //             checked: new SimpleChange(undefined, true, false)
    //         });
    //         fixture.detectChanges();
    //         expect(component.value).toBeTrue();
    //         expect(component.state).toBe(component['cbxStates'].true);
    //     });
    //
    //     it('on toggle', () => {
    //         let emitValue: boolean;
    //
    //         component.value = true;
    //         component.onClick.subscribe(value => {
    //             emitValue = value;
    //         });
    //
    //         component.changeState(null);
    //         fixture.detectChanges();
    //         expect(emitValue).toBeFalse();
    //         expect(component.value).toBeFalse();
    //         expect(component.state).toBe(component['cbxStates'].false);
    //     });
    // });
});
