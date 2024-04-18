import { AfterViewInit, Component, ElementRef, ViewChild, forwardRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { BaseSelectV2Item } from '../base-select-item/base-select-item.component';

@Component({
    selector: 'nx-select-item',
    templateUrl: 'select-item.component.html',
    styleUrls: ['select-item.component.scss'],
    providers: [
        { provide: BaseSelectV2Item, useExisting: forwardRef(() => NxSelectV2ItemComponent) },
    ],
    standalone: true,
})
export class NxSelectV2ItemComponent<T> extends BaseSelectV2Item<T> implements AfterViewInit {
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
