import { AfterViewInit, Component, ElementRef, forwardRef, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { NxCheckboxComponent } from '../../../checkbox/checkbox.component';
import { BaseSelectV2Item } from '../base-select-item/base-select-item.component';

@Component({
    selector: 'nx-multi-select-item',
    templateUrl: 'multi-select-item.component.html',
    styleUrls: ['multi-select-item.component.scss'],
    providers: [
        {
            provide: BaseSelectV2Item,
            useExisting: forwardRef(() => NxMultiSelectV2ItemComponent),
        },
    ],
    standalone: true,
    imports: [NxCheckboxComponent],
})
export class NxMultiSelectV2ItemComponent<T> extends BaseSelectV2Item<T> implements AfterViewInit {
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
