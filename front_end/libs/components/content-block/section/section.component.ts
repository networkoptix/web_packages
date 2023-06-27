import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';

import { IBool, CoercedBoolInput } from '@decorators/ibool';

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
    styleUrls: ['section.component.scss'],
    imports: [CommonModule],
    standalone: true,
})
export class NxContentBlockSectionComponent implements OnInit {
    @Input() type: string;
    @IBool() @Input() nonPadded: CoercedBoolInput;

    haveSubheader: boolean;

    @ViewChild('subHeaderWrapper', { static: true }) subHeaderWrapper: ElementRef<HTMLDivElement>;

    ngOnInit(): void {
        this.type = this.type || '';
        this.haveSubheader =
            this.subHeaderWrapper.nativeElement.childNodes[0].childNodes.length > 0;
    }
}
