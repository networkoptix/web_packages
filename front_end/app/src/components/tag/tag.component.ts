import {
    Component,
    EventEmitter,
    forwardRef,
    Input,
    OnInit,
    Output,
    SimpleChanges
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/* Usage
 <nx-tag
     type?="default | danger | info | brand | success | warning" -> default - "badge"
     element?="btn" -> default - "badge"
     size?="large"
     name?="tagName" id?="tagId"
     static?       -> if true the tag is not selectable
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
        useExisting: forwardRef(() => NxTagComponent),
        multi: true
    }]
})
export class NxTagComponent implements OnInit, ControlValueAccessor {
    @Input() type: string;
    @Input() element: string;
    @Input() size: string = 'small';
    @Input() clickable: boolean = true;
    @Input() static;
    @Input() link;
    @Input() linkParam;
    @Input('value') selected: boolean;

    @Output() onClick = new EventEmitter<boolean>();

    public badgeType: string;
    public tagHref: string;

    constructor() {
        this.linkParam = {};
    }

    ngOnInit() {
        this.static = (this.static !== undefined);
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

    ngOnChanges(changes: SimpleChanges) {
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
        if (this.static) {
            return;
        }
        this.selected = false;
        this.badgeType = this.type ? `badge-${this.type}` : 'badge';
        this.changeState(false);
    }

    selectTag() {
        if (this.static) {
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
        this.selected = value;
        if (!this.selected) {
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
