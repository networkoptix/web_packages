import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    Inject,
    TemplateRef,
    ViewChild,
    computed,
    input,
} from '@angular/core';

import { environment } from '@environments/environment';

import { NxAutocompleteInjectionToken } from '../autocomplete-injection-token';
import { NxAutocompleteComponent } from '../autocomplete.component';

@Component({
    selector: 'nx-autocomplete-item',
    templateUrl: 'autocomplete-item.component.html',
    styleUrls: ['autocomplete-item.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class NxAutoCompleteItemComponent<T> {
    value = input.required<T>();
    /** Text to be displayed in autocomplete trigger */
    name = input<string>();
    /** Value to use for search filtering
     *
     * - `undefined`: Name if provided, value otherwise
     * - `string`: Custom value. This is for cases like `"MainText | Subtext"`
     * where you want both sides but not the vertical bar
     */
    searchBy = input<string>();

    disabled = input<boolean>(false);

    @ViewChild('content') content: TemplateRef<unknown>;
    @ViewChild('listElem') listElem: ElementRef<HTMLLIElement>;

    displayText = computed<string>(() => {
        const [name, value] = [this.name(), this.value()];
        if (name) {
            return name;
        } else if (typeof value === 'string') {
            return value;
        } else {
            if (!environment.production) {
                console.warn('Implicit string convertion used');
            }
            return String(value);
        }
    });
    searchString = computed<string>(() => this.searchBy() ?? this.displayText());
    highlighted = computed<boolean>(() => this.autocomplete.highlighted() === this);
    selected = computed<boolean>(
        () => this.autocomplete.requireSelection() && this.autocomplete.selected() === this,
    );

    onClick(): void {
        if (!this.disabled()) {
            this.autocomplete.selectItem(this);
        }
    }

    constructor(
        @Inject(NxAutocompleteInjectionToken) private autocomplete: NxAutocompleteComponent<T>,
    ) {}
}
