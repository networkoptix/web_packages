import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NxAPIToolService } from '@pages/api-tool/api-tool.service';
import { WINDOW } from '@services/window-provider';
import { fromEvent } from 'rxjs';

@UntilDestroy()
@Component({
    selector: 'nx-swagger-textarea',
    templateUrl: './swagger-textarea.component.html',
    styleUrls: ['./swagger-textarea.component.scss']
})
export class NxSwaggerTextareaComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('customTextarea') customTextareaRef : ElementRef;
    @Input() textarea: HTMLTextAreaElement;
    isDisabled = true;
    isInvalid = false;
    attributeMutationObserver: MutationObserver;

    constructor(@Inject(WINDOW) private window: any, @Inject(DOCUMENT) private document: Document, private APIToolService: NxAPIToolService) { }

    ngOnInit() {
        this.isDisabled = this.textarea.getAttribute('disabled') === '';
        this.isInvalid = !!this.textarea.getAttribute('title'); // Swagger uses title for errors
    }

    ngAfterViewInit() {
        const element = this.customTextareaRef.nativeElement;
        element.innerText = this.textarea.innerText;
        element.innerHTML = element.innerText.split('\n').map(div => `<div>${div}</div>`).join('\n');
        const setValue = Object.getOwnPropertyDescriptor(this.window.HTMLTextAreaElement?.prototype, 'value')?.set;

        fromEvent(element, 'input').pipe(untilDestroyed(this)).subscribe(event => {
            this.APIToolService.preventNextChangeDetection = true;

            if (!element.textContent.length) {
                if (element.childNodes.length > 0) {
                    for (const child of element.childNodes) {
                        child.remove();
                    }
                }
                // If you type something while the content-editable div is empty, add a line counter
                element.innerHTML = '<div><br></div>';
            }

            // React overrides value setter so you can't simply do: this.textarea.value = 'text''
            // This code properly triggers the onChange handler in swagger's react code
            setValue?.call(this.textarea, element.innerText);
            this.textarea.dispatchEvent(new Event('change', { bubbles: true }));
        });

        fromEvent(element, 'paste').pipe(untilDestroyed(this)).subscribe((event: any) => {
            this.APIToolService.preventNextChangeDetection = true;

            event.preventDefault();
            this.document.execCommand('inserttext', false, event.clipboardData.getData('text/plain'));
        });

        this.isDisabled = this.textarea.getAttribute('disabled') === '';

        this.attributeMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes') {
                    if (mutation.attributeName === 'disabled') {
                        // Listen to the original element's 'disabled' attribute
                        // to see if the custom element should be disabled or not
                        this.isDisabled = mutation.oldValue !== '';
                    }
                }
            });
        });
        this.attributeMutationObserver.observe(this.textarea, {
            attributes: true,
            attributeOldValue: true
        });
    }

    ngOnDestroy() {
        this.attributeMutationObserver.disconnect();
    }
}
