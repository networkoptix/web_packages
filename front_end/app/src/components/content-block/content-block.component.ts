import {
    Component,
    ElementRef,
    Input,
    OnInit,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';

/* Usage
 <nx-block type?="gray | simple-alert ...more to come" fixed-height? hoverable? header-style="extended | slim"?>
     <header>
        TITLE
     </header>
     <nx-section>
        BODY
     </nx-section>

     <!-- ngFor -->
     <nx-section>
         <header>
            Section title
         </header>
        Section body
     </nx-section>

     <nx-section>
        SECTION without header
     </nx-section>
     <!-- ngFor -->

     <footer>
        footer content
     </footer>
 </nx-block>
 */

@Component({
    selector: 'nx-block',
    templateUrl: 'content-block.component.html',
    styleUrls: ['content-block.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxContentBlockComponent implements OnInit {
    @Input('type') type: string;
    @Input('fixed-height') fixedHeight;
    @Input('hoverable') hoverable;
    @Input('header-style') headerStyle;
    @Input('header-class') headerClass;

    haveHeader: boolean;
    haveFooter: boolean;
    headerClasses: string;

    @ViewChild('headerWrapper', { static: true }) headerWrapper: ElementRef<HTMLDivElement>;
    @ViewChild('footerWrapper', { static: true }) footerWrapper: ElementRef<HTMLDivElement>;

    constructor() {
        this.haveHeader = true;
        this.haveFooter = true;
    }

    ngOnInit(): void {
        this.haveHeader = (this.headerWrapper.nativeElement.childNodes[0]?.childNodes.length > 0);
        this.haveFooter = (this.footerWrapper.nativeElement.childNodes?.length > 0);

        this.fixedHeight = (this.fixedHeight !== undefined);
        this.hoverable = (this.hoverable !== undefined);

        this.headerStyle = (this.headerStyle) ? this.headerStyle + '-header' : '';
        this.headerClass = (this.headerClass) ? this.headerClass : '';

        this.headerClasses = this.headerStyle + this.headerClass;
    }
}
