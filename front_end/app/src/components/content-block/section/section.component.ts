import {
    Component,
    ElementRef,
    Input,
    OnInit,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';

/* Usage
<nx-section>
    <header>
        Section title
    </header>
    Section body
</nx-section>

<nx-section>
    SECTION without header
</nx-section>
*/

@Component({
    selector: 'nx-section',
    templateUrl: 'section.component.html',
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['section.component.scss']
})
export class NxContentBlockSectionComponent implements OnInit {
    @Input() type: string;
    @Input() nonPadded;

    haveSubheader: boolean;

    @ViewChild('subHeaderWrapper', { static: true }) subHeaderWrapper: ElementRef<HTMLDivElement>;

    constructor() {
        // this.haveSubheader = true;
    }

    ngOnInit() {
        this.type = this.type || '';
        this.nonPadded = (this.nonPadded !== undefined);
        this.haveSubheader =
            (this.subHeaderWrapper.nativeElement.childNodes[0].childNodes.length > 0);
    }
}
