import { AfterViewInit, Component, ElementRef, ViewChild, forwardRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { BaseDropdownItem } from '../baseDropdownItem/dropdown-item.component';

@Component({
    selector: 'nx-simple-dropdown-item',
    templateUrl: 'simple-dropdown-item.component.html',
    styleUrls: ['simple-dropdown-item.component.scss'],
    providers: [
        { provide: BaseDropdownItem, useExisting: forwardRef(() => NxSimpleDropdownItemComponent) },
    ],
    standalone: true,
})
export class NxSimpleDropdownItemComponent<T> extends BaseDropdownItem<T> implements AfterViewInit {
    @ViewChild('option') private option: ElementRef<HTMLDivElement>;

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
