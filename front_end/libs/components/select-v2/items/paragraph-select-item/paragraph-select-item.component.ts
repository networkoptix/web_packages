import { AfterViewInit, Component, ElementRef, ViewChild, forwardRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';

import { BaseSelectV2Item } from '../base-select-item/base-select-item.component';

/*
    This is based off of select-item.component.ts and should be used inside of <nx-select-v2>

    Example:
    <nx-paragraph-select-item [value]="id">
        <div title>Select Title</div>
        <p body>Select Description</p>
    </nx-paragraph-select-item>

    "Select Title" will be displayed when selected AND as a Dropdown Option
    "Select Description" will display ONLY in the dropdown under their respective Option
    What tags we use here is arbitrary, we can use <div>, <p>, <span>, <nx-component-name>, etc
    The main thing here is that we specify the elements with the "title" and "body" attribute
*/

@Component({
    selector: 'nx-paragraph-select-item',
    templateUrl: 'paragraph-select-item.component.html',
    styleUrls: ['paragraph-select-item.component.scss'],
    providers: [
        {
            provide: BaseSelectV2Item,
            useExisting: forwardRef(() => NxParagraphSelectItemComponent),
        },
    ],
    standalone: true,
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxParagraphSelectItemComponent<T>
    extends BaseSelectV2Item<T>
    implements AfterViewInit
{
    @ViewChild('title') private title: ElementRef<HTMLDivElement>;

    innerHtml = new BehaviorSubject('');

    ngAfterViewInit(): void {
        this.innerHtml.next(this.title.nativeElement.innerHTML);

        const observer = new MutationObserver(() => {
            this.innerHtml.next(this.title.nativeElement.innerHTML);
        });
        observer.observe(this.title.nativeElement, {
            characterData: true,
            subtree: true,
        });
    }

    getOptionHtml(): Observable<string> {
        return this.innerHtml;
    }
}
