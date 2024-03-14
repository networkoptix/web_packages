import { AfterViewInit, Component, ElementRef, ViewChild, forwardRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { NxCheckboxComponent } from '../../../checkbox/checkbox.component';
import { BaseDropdownItem } from '../baseDropdownItem/dropdown-item.component';

@Component({
    selector: 'nx-multi-select-dropdown-item',
    templateUrl: 'multi-select-dropdown-item.component.html',
    styleUrls: ['multi-select-dropdown-item.component.scss'],
    providers: [
        {
            provide: BaseDropdownItem,
            useExisting: forwardRef(() => NxMultiSelectDropdownItemComponent),
        },
    ],
    standalone: true,
    imports: [NxCheckboxComponent],
})
export class NxMultiSelectDropdownItemComponent<T>
    extends BaseDropdownItem<T>
    implements AfterViewInit
{
    @ViewChild('ngContentWrapper') private option: ElementRef<HTMLDivElement>;

    innerHtml = new BehaviorSubject('');

    ngAfterViewInit(): void {
        this.innerHtml.next(this.option.nativeElement.innerHTML);

        // Subscribe to changes in the innerHTML of the option element
        const observer = new MutationObserver(() => {
            this.innerHtml.next(this.option.nativeElement.innerHTML);
        });
        observer.observe(this.option.nativeElement, {
            characterData: true,
            subtree: true,
        });
    }

    getOptionHtml(): Observable<string> {
        return this.innerHtml;
    }
}
