import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NxRadioComponent } from './radio.component';

describe('NxRadioComponent', () => {
    let component: NxRadioComponent;
    let fixture: ComponentFixture<NxRadioComponent>;

    beforeEach(async(() => {
        TestBed
            .configureTestingModule({
                declarations: [NxRadioComponent]
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxRadioComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should handle @Input(disabled)', () => {
        expect(component.disabled).toBeFalse();
    });

    it('should have defined states', () => {
        expect(component['_rbxStates']).toEqual({
            rbFalse: 'unchecked',
            rbTrue: 'checked',
            rbDisabled: 'disabled',
            rbOrElse: 'tristate'
        });
    });

    it('should initialize default state', () => {
        expect(component.state).toBe(component['_rbxStates'].rbFalse);
    });

    it('should set state on @Input(change) change to true', () => {
        let emitValue: string;

        component.value = 'Beer!';
        component.onClick.subscribe((value: string) => {
            emitValue = value;
        });

        component.changeState();
        fixture.detectChanges();
        expect(emitValue).toBe('Beer!');
        expect(component.state).toBe(component['_rbxStates'].rbTrue);
    });
});
