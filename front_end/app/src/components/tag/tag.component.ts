import {
    Component,
    EventEmitter,
    forwardRef,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { Params } from '@angular/router';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { NgChanges } from '@utils/ng-changes';

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
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        useExisting: forwardRef(() => NxTagComponent),
        multi: true
    }]
})
export class NxTagComponent implements OnInit, ControlValueAccessor {
    @Input() type: string;
    @Input() element: string = 'badge';
    @Input() name: string;
    @Input() size: string = 'small';
    @IBool() @Input() clickable: CoercedBoolInput = true;
    @IBool() @Input() locked: CoercedBoolInput;
    @Input() link: string;
    @Input() linkParam: Params = {};
    @IBool() @Input('value') selected: CoercedBoolInput;

    @Output() onClick = new EventEmitter<boolean>();

    public tagHref: string;
    public badgeType: string;
    private badgeTypes: {
        selected: string;
        unselected: string;
    };

    constructor() {}

    ngOnInit(): void {
        this.badgeTypes = this.type !== undefined
            ? {
                selected: `badge-${this.type}-selected`,
                unselected: `badge-${this.type}`,
            } : {
                selected: 'badge-selected',
                unselected: 'badge',
            };
        this.badgeType = this.selected
            ? this.badgeTypes.selected
            : this.badgeTypes.unselected;

        const params = Object.entries<string>(this.linkParam);
        if (this.link && params.length) {
            const queryParams = params
                .map(([key, value]) => `${key}=${value}`)
                .join('&');
            this.tagHref = `${this.link}?${queryParams}`;
        }
    }

    ngOnChanges(changes: NgChanges<NxTagComponent>): void {
        if (changes.selected?.currentValue) {
            setTimeout(() => {
                if (!changes.selected?.currentValue) {
                    this.deselectTag();
                } else {
                    this.selectTag();
                }
            });
        }
    }

    deselectTag(): void {
        if (this.locked) {
            return;
        }
        this.selected = false;
        this.badgeType = this.badgeTypes.unselected;
        this.changeState(false);
    }

    selectTag(): void {
        if (this.locked) {
            return;
        }
        this.selected = true;
        this.badgeType = this.badgeTypes.selected;
        this.changeState(true);
    }

    // Form control functions
    // The method set in registerOnChange to emit changes back to the form
    private propagateChange = (_value: boolean): void => {};

    writeValue(value: boolean): void {
        // tag should have value!
        if (value === undefined) {
            return;
        }
        // this.selected = value;
        if (!value) {
            this.deselectTag();
        } else {
            this.selectTag();
        }
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

    changeState(value: boolean): void {
        // Propagate component's value attribute (model)
        this.propagateChange(value);
        this.onClick.emit(value);
    }
}
