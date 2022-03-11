import {
    Component,
    EventEmitter,
    forwardRef,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
    @Input() element: string;
    @Input() name: string;
    @Input() size: string = 'small';
    @IBool() @Input() clickable: CoercedBoolInput = true;
    @IBool() @Input() locked: CoercedBoolInput;
    @Input() link;
    @Input() linkParam;
    @IBool() @Input('value') selected: CoercedBoolInput;

    @Output() onClick = new EventEmitter<any>();

    public badgeType: string;
    public tagHref: string;

    constructor() {
        this.linkParam = {};
    }

    ngOnInit() {
        this.element = this.element || 'badge';
        this.badgeType = this.type !== undefined ? `badge-${this.type}` : 'badge';
        if (this.selected) {
            this.badgeType = `badge-${this.badgeType}-selected`;
        }

        const params = Object.keys(this.linkParam);
        if (this.link && params.length) {
            const queryParams = params.map(key => key + '=' + this.linkParam[key]).join('&');
            this.tagHref = `${this.link}?${queryParams}`;
        }
    }

    ngOnChanges(changes: NgChanges<NxTagComponent>) {
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

    deselectTag() {
        if (this.locked) {
            return;
        }
        this.selected = false;
        this.badgeType = this.type ? `badge-${this.type}` : 'badge';
        this.changeState(false);
    }

    selectTag() {
        if (this.locked) {
            return;
        }
        this.selected = true;
        this.badgeType = this.type ? `badge-${this.type}-selected` : 'badge-selected';
        this.changeState(true);
    }

    // Form control functions
    // The method set in registerOnChange to emit changes back to the form
    private propagateChange = (_: any) => {
    };

    writeValue(value: any) {
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
    registerOnChange(fn) {
        this.propagateChange = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: () => void): void {
    }

    changeState(value) {
        // Propagate component's value attribute (model)
        this.propagateChange(value);
        this.onClick.emit(value);
    }
}
