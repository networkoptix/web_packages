import {
    Component,
    ViewEncapsulation,
    Input,
    forwardRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

import type { MultiSelectItem } from './multi-select.component.types';

/* Usage
 <nx-multi-select
     [id]="select.id"
     [name]="permissions"
     canSelectAll?
     canSearch?
     description="Roles"
     [items]="[{label: 'a', id: 1}, {label: 'b', id:3}]"
     [ngModel]="[1, 3]"       <- selected items id's
     (ngModelChange)="onChange(result)">
 </nx-multi-select>
 */

@Component({
    selector: 'nx-multi-select',
    templateUrl: 'multi-select.component.html',
    styleUrls: ['multi-select.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxMultiSelectDropdown),
            multi: true
        }
    ]
})

export class NxMultiSelectDropdown extends BaseDropdown {
    @Input() id: string;
    @Input('items') itemsOrig: MultiSelectItem[];
    @IBool() @Input() canSelectAll: CoercedBoolInput;
    @IBool() @Input() canSearch: CoercedBoolInput;

    public items: MultiSelectItem[] = [];
    public filter: string;
    public textSelected: any = {};

    private innerValue;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        super(languageService, configService);
        this.filter = '';
    }

    ngOnInit(): void {
        this.id = this.id || 'multiSelect';
    }

    clearSelected() {
        this.items.forEach((item: any) => {
            item.selected = false;
            const index = this.innerValue.indexOf(item.id);
            if (index > -1) {
                this.innerValue.splice(index, 1);
            }
        });

        // ensure 'change' will be triggered as checkboxes didn't fire click event
        this.items = this.items.map((obj: any) => ({ ...obj }));
        this.updateModel();

        // break anchor nav event
        return false;
    }

    change(evt, item: any) {
        const index = this.innerValue.indexOf(item.id);
        if (index > -1) {
            this.innerValue.splice(index, 1);
        } else {
            this.innerValue.push(item.id);
        }

        item.selected = this.innerValue.includes(item.id);
        this.updateModel();

        // break anchor nav event
        return false;
    }

    applyLocalFilter(value) {
        this.filter = value;

        this.items = this.itemsOrig.filter((item: any) => {
            return item.id.toLowerCase().includes(value.toLowerCase());
        });
    }

    trackItem(index, item: any) {
        return item ? item.id : undefined;
    }

    updateItems() {
        this.items.forEach((item: any) => {
            item.selected = (this.innerValue !== undefined)
                ? this.innerValue.includes(item.id)
                : false;
        });

        // ensure 'change' will be triggered
        this.items = this.items.map((obj: any) => ({ ...obj }));
    }

    updateLabel() {
        switch (this.innerValue && this.innerValue.length) {
            case 1: {
                this.textSelected = this.items.find((item: any) => {
                    return (item.label?.name || item.id) === this.innerValue[0];
                });
                // Aggregated MSelect items vs. simple list
                this.textSelected =
                    this.textSelected.label.name || this.textSelected.label;
                break;
            }
            case 0:
            case this.items.length: {
                this.textSelected = this.LANG.search.Any();
                break;
            }
            default: {
                this.textSelected = this.LANG.search.selected({
                    count: this.innerValue.length
                });
                break;
            }
        }
    }

    updateModel() {
        // update the form
        this.updateLabel();
        this.onChangeCallback(this.innerValue);
    }

    ngOnChanges(changes: NgChanges<NxMultiSelectDropdown>): void {
        if (changes.itemsOrig) {
            this.items = changes.itemsOrig.currentValue.map(obj => ({ ...obj }));
            this.updateItems();
        }
    }

    /**
     * Overwrite
     */
    writeValue(value: any) {
        if (value !== null) {
            this.innerValue = value;
            this.updateLabel();
            this.updateItems();
        }
    }
}
