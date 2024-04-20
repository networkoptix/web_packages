import { CommonModule } from '@angular/common';
import {
    booleanAttribute,
    Component,
    EventEmitter,
    forwardRef,
    Input,
    Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/* Usage
 <nx-tag
     type?="default | danger | info | brand | success | warning" -> default - "badge"
     element?="btn" -> default - "badge"
     size?="large"
     name?="tagName" id?="tagId"
     locked?       -> if true the tag is not selectable
     [value]?="tag.selected"
     (click)?="onClick($event)">
     [clickable]="boolean" | defaults to true
     [TEXT]
 </nx-checkbox>
 */

@Component({
    selector: 'nx-tag',
    templateUrl: 'tag.component.html',
    styleUrls: ['tag.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxTagComponent),
            multi: true,
        },
    ],
    standalone: true,
    imports: [CommonModule],
})
export class NxTagComponent implements ControlValueAccessor {
    @Input() type: string;
    @Input() element: string = 'badge';
    @Input('name') _name: string = '';
    @Input('id') _id: string = '';
    @Input() size: string = 'small';
    @Input() customClass: string = '';
    @Input({ transform: booleanAttribute }) clickable: boolean = true;
    @Input({ transform: booleanAttribute }) locked: boolean;
    @Input('value') selected: boolean;

    @Output() onClick = new EventEmitter<boolean>();

    get badgeType(): string {
        if (this.type) {
            return this.selected ? `badge-${this.type}-selected` : `badge-${this.type}`;
        } else {
            return this.selected ? 'badge-selected' : 'badge';
        }
    }

    clickChange(value: boolean): void {
        if (this.locked || !this.clickable) {
            return;
        }
        this.changeState(value, true);
    }

    // Form control functions
    // The method set in registerOnChange to emit changes back to the form
    private propagateChange = (_value: boolean): void => {};

    writeValue(value: boolean): void {
        // tag should have value!
        if (value === undefined) {
            return;
        }
        this.changeState(value);
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn: (value: boolean) => void): void {
        this.propagateChange = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(_fn: () => void): void {}

    changeState(value: boolean, emitClick: boolean = false): void {
        this.selected = value;
        // Propagate component's value attribute (model)
        this.propagateChange(value);
        if (emitClick) {
            this.onClick.emit(value);
        }
    }
}
