import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { booleanAttribute, Component, forwardRef, Input } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { Translatable } from '@pipes/nx-translate.types';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdown } from '../injDropdown';

import { DATA_TYPE, MultiSelectItem } from './multi-select.component.types';

/* Usage
 <nx-multi-select
     [componentId]="select.id"
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
            useExisting: forwardRef(() => NxMultiSelectDropdown),
            multi: true,
        },
    ],
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        NxCheckboxComponent,
        PipesModule,
        NxAddSvgSrcDirective,
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxTooltipDirective,
        ScrollingModule,
    ],
    standalone: true,
})
export class NxMultiSelectDropdown extends BaseDropdown {
    @Input({ required: true }) componentId: string;
    @Input('items') itemsOrig: MultiSelectItem[];
    @Input({ transform: booleanAttribute }) canSelectAll: boolean;
    @Input({ transform: booleanAttribute }) canSearch: boolean;
    @Input({ transform: booleanAttribute }) moreLeftPadding: boolean;
    @Input() tooltipAlternateSecondary: boolean;
    @Input() tooltipHorizontal: boolean;
    @Input() dataType: DATA_TYPE = DATA_TYPE.ANY;

    icons = icons;
    public items: MultiSelectItem[] = [];
    public filter: string = '';
    public textSelected: Translatable = '';

    private innerValue: MultiSelectItem['id'][] = [];
    // Weird UX request ... gotta keep them happy --TT
    private autoClose: boolean = true;

    constructor() {
        super();
    }

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

        event?.preventDefault();
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

        if (this.autoClose) {
            this.show = false;
        }
    }

    applyLocalFilter(value: string): void {
        this.filter = value;

        this.items = this.itemsOrig.filter(item =>
            item.label.toLowerCase().includes(value.toLowerCase()),
        );
        this.updateItems();
    }

    override trackItem(_index: number, item: MultiSelectItem): string | undefined {
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
                this.textSelected = selectedItem?.label;
                break;
            }
            case 0:
                switch (this.dataType) {
                    case DATA_TYPE.GROUPS:
                        this.textSelected = this.LANG.search.selectOptions;
                        break;
                    case DATA_TYPE.PERMISSIONS:
                        this.textSelected = this.LANG.search.userPermissions;
                        break;
                    default:
                        this.textSelected = this.LANG.search.Any;
                        break;
                }
                break;
            case this.items.length: {
                if (this.dataType !== DATA_TYPE.ANY) {
                    this.textSelected = {
                        value: this.LANG.userGroups.multiple,
                        params: {
                            number: this.innerValue.length.toString(),
                        },
                    };
                } else {
                    this.textSelected = this.LANG.search.Any;
                }
                break;
            }
            default: {
                if (this.dataType !== DATA_TYPE.ANY) {
                    this.textSelected = {
                        value: this.LANG.userGroups.multiple,
                        params: {
                            number: this.innerValue.length.toString(),
                        },
                    };
                } else {
                    this.textSelected = {
                        value: this.LANG.search.selected,
                        params: {
                            count: this.innerValue.length.toString(),
                        },
                    };
                }
            }
        }
    }

    updateModel(): void {
        // update the form
        this.updateLabel();
        this.onChangeCallback(this.innerValue);
    }

    ngOnChanges({ itemsOrig }: NgChanges<NxMultiSelectDropdown>): void {
        if (itemsOrig?.currentValue) {
            this.items = itemsOrig.currentValue.map(obj => ({ ...obj }));
            this.updateItems();
        }
    }

    /**
     * Overwrite
     */
    override(value: string[]): void {
        if (value !== null && value !== undefined) {
            this.innerValue = value;
            this.updateLabel();
            this.updateItems();
        } else {
            this.innerValue = [];
        }
    }
}
