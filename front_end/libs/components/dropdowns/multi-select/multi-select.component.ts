import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { icons } from '@lib/variables/static-variables';
import { Translatable } from '@pipes/nx-translate.types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

import type { MultiSelectItem } from './multi-select.component.types';

/* Usage
 <nx-multi-select
     [id]="select.id"
     [name]="permissions"
     canSelectAll?
     canSearch?
     moreLeftPadding?
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
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxMultiSelectDropdown),
            multi: true,
        },
    ],
})
export class NxMultiSelectDropdown extends BaseDropdown {
    @Input() id: string = 'multiselect';
    @Input('items') itemsOrig: MultiSelectItem[];
    @IBool() @Input() canSelectAll: CoercedBoolInput;
    @IBool() @Input() canSearch: CoercedBoolInput;
    @IBool() @Input() moreLeftPadding: CoercedBoolInput;

    icons = icons;
    public items: MultiSelectItem[] = [];
    public filter: string = '';
    public textSelected: Translatable = '';

    private innerValue: MultiSelectItem['id'][] = [];

    constructor(configService: NxConfigService) {
        super(configService);
    }

    ngOnInit(): void {}

    clearSelected(): void {
        if (this.filter) {
            this.items = this.itemsOrig;
            this.filter = '';
        }
        this.items.forEach(item => {
            item.selected = false;
            const index = this.innerValue.indexOf(item.id);
            if (index > -1) {
                this.innerValue.splice(index, 1);
            }
        });

        // ensure 'change' will be triggered as checkboxes didn't fire click event
        this.items = this.items.map(obj => ({ ...obj }));
        this.updateModel();

        event.preventDefault();
    }

    change(item: MultiSelectItem): void {
        const index = this.innerValue.indexOf(item.id);
        if (index > -1) {
            this.innerValue.splice(index, 1);
        } else {
            this.innerValue.push(item.id);
        }

        item.selected = this.innerValue.includes(item.id);
        this.updateModel();
    }

    applyLocalFilter(value: string): void {
        this.filter = value;

        this.items = this.itemsOrig.filter(item =>
            item.label.toLowerCase().includes(value.toLowerCase()),
        );
        this.updateItems();
    }

    trackItem(_index: number, item: MultiSelectItem): string | undefined {
        return item ? item.id : undefined;
    }

    updateItems(): void {
        this.items.forEach(item => {
            item.selected = this.innerValue.includes(item.id);
        });

        // ensure 'change' will be triggered
        this.items = this.items.map(obj => ({ ...obj }));
    }

    updateLabel(): void {
        switch (this.innerValue.length) {
            case 1: {
                const selectedItem = this.items.find(item => item.id === this.innerValue[0]);
                this.textSelected = selectedItem.label;
                break;
            }
            case 0:
            case this.items.length: {
                this.textSelected =
                    this.id === 'user-groups'
                        ? {
                              value: this.LANG.userGroups.multiple,
                              params: {
                                  count: this.innerValue.length.toString(),
                              },
                          }
                        : this.LANG.search.Any;
                break;
            }
            default: {
                this.textSelected =
                    this.id === 'user-groups'
                        ? {
                              value: this.LANG.userGroups.multiple,
                              params: {
                                  count: this.innerValue.length.toString(),
                              },
                          }
                        : {
                              value: this.LANG.search.selected,
                              params: {
                                  count: this.innerValue.length.toString(),
                              },
                          };
                break;
            }
        }
    }

    updateModel(): void {
        // update the form
        this.updateLabel();
        this.onChangeCallback(this.innerValue);
    }

    ngOnChanges({ itemsOrig }: NgChanges<NxMultiSelectDropdown>): void {
        if (itemsOrig) {
            this.items = itemsOrig.currentValue.map(obj => ({ ...obj }));
            this.updateItems();
        }
    }

    /**
     * Overwrite
     */
    writeValue(value: string[]): void {
        if (value !== null) {
            this.innerValue = value;
            this.updateLabel();
            this.updateItems();
        }
    }
}
