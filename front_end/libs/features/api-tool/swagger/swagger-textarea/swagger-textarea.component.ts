import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    Input,
    OnInit,
    ViewChild,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { fromEvent } from 'rxjs';

import { NxAPIToolSystemService } from '@pages/api-tool/services/api-tool-system.service';
import { WINDOW } from '@services/window-provider';

import {
    findLine,
    focusPositionMarker,
    highlightAllCode,
    highlightLine,
    setCodeBlockHTML,
} from '../swagger-utils';

@UntilDestroy()
@Component({
    selector: 'nx-swagger-textarea',
    templateUrl: './swagger-textarea.component.html',
    styleUrls: ['./swagger-textarea.component.scss'],
})
export class NxSwaggerTextareaComponent implements OnInit, AfterViewInit {
    @ViewChild('customTextarea') customTextareaRef: ElementRef;
    @Input() textarea: HTMLTextAreaElement;
    @Input() textareaMap;
    isDisabled = true;
    isInvalid = false;
    attributeMutationObserver: MutationObserver;

    constructor(
        @Inject(WINDOW) private window: any,
        @Inject(DOCUMENT) private document: Document,
        private APIToolService: NxAPIToolSystemService,
        private elementRef: ElementRef,
    ) {}

    ngOnInit(): void {
        this.isDisabled = this.textarea.getAttribute('disabled') === '';
        this.isInvalid = !!this.textarea.getAttribute('title'); // Swagger uses title for errors
    }

    ngAfterViewInit(): void {
        const element = this.customTextareaRef.nativeElement;
        const elementExistsInTextareaMap = setCodeBlockHTML(element, this.textareaMap, 'textarea');
        if (!elementExistsInTextareaMap) {
            const text = this.textarea.innerText.split(' ').join('&nbsp;');
            element.innerText = text;
            if (element.textContent.length) {
                element.innerHTML = element.innerText
                    .split('\n')
                    .map(div => `<div class='line'>${div}</div>`)
                    .join('\n');
            } else {
                element.innerHTML = '<div class="line"><br></div>';
            }
        }
        highlightAllCode(element);

        fromEvent<InputEvent>(element, 'input')
            .pipe(untilDestroyed(this))
            .subscribe(event => {
                this.APIToolService.preventNextChangeDetection = true;
                const textareaEmpty = !element.textContent.length;
                if (textareaEmpty) {
                    if (element.childNodes.length > 0) {
                        for (const child of element.childNodes) {
                            child.remove();
                        }
                    }
                    // If you type something while the content-editable div is empty, add a line counter
                    element.innerHTML = '<div class="line"><br></div>';
                } else {
                    const node = this.document.createElement('span');
                    node.innerText = focusPositionMarker;
                    const originalSelection = this.document.getSelection();
                    // Insert a marker to focus on after highlight
                    originalSelection.getRangeAt(0).insertNode(node);
                    const line = findLine(originalSelection.anchorNode);
                    if (line) {
                        // always exists unless the textarea is empty
                        highlightLine(line);
                    }
                    if (event.inputType !== 'insertParagraph') {
                        // not enter key
                        this.setTextareaFocusPosition(element);
                    }
                    this.insertLineBreaks();
                }
                this.setTextareaText();
            });

        fromEvent<ClipboardEvent>(element, 'paste')
            .pipe(untilDestroyed(this))
            .subscribe(event => {
                this.APIToolService.preventNextChangeDetection = true;

                event.preventDefault();
                this.document.execCommand(
                    'inserttext',
                    false,
                    event.clipboardData.getData('text/plain'),
                );
                const element = this.customTextareaRef.nativeElement;

                for (const child of element.childNodes) {
                    if (!child.textContent.length) {
                        child.remove();
                    }
                }

                this.setTextareaText();
                highlightAllCode(element);
            });

        this.attributeMutationObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
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
            attributeOldValue: true,
        });
    }

    insertLineBreaks = (): void => {
        const lines = this.customTextareaRef.nativeElement.querySelectorAll('div.line');
        for (const line of lines) {
            if (!line.innerText && !line.innerHTML.includes('<br>')) {
                line.innerHTML = '<br>';
            }
        }
    };

    /**
     * Focus the swagger-textarea's focus position to the right position
     * This is neccessary because the position is lost after styling elements are inserted by highlightLine
     */
    setTextareaFocusPosition = (element: HTMLElement): void => {
        const selection = this.document.getSelection();
        const range = this.document.createRange();
        const focusPositionElement = this.document.querySelector('.focus-position');
        range.selectNode(focusPositionElement);
        range.setStart(focusPositionElement, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        element.focus();
        focusPositionElement.remove();
    };

    setTextareaText = (): void => {
        const element = this.customTextareaRef.nativeElement;
        let textContent = element.textContent;
        textContent = this.removeSpacesNotInQuotes(textContent);

        // store HTML with whitespace in textareaMap
        this.textareaMap[this.elementRef.nativeElement.getAttribute('uuid')] = element.innerHTML;

        // React overrides value setter so you can't simply do: this.textarea.value = 'text''
        // This code properly triggers the onChange handler in swagger's react code
        const setValue = Object.getOwnPropertyDescriptor(
            this.window.HTMLTextAreaElement?.prototype,
            'value',
        )?.set;
        textContent = textContent.replace(/\u00A0/g, ' '); // Replace non-breaking spaces to make JSON parse properly
        setValue?.call(this.textarea, textContent);
        this.textarea.dispatchEvent(new Event('change', { bubbles: true }));
    };

    removeSpacesNotInQuotes = (textContent: string): string => {
        return textContent.replace(/([^"]+)|("[^"]+")/g, function (_, notInQuotes, wholeString) {
            if (notInQuotes) {
                return notInQuotes.replace(/\s/g, '');
            } else {
                return wholeString;
            }
        });
    };

    ngOnDestroy(): void {
        this.attributeMutationObserver.disconnect();
        this.textareaMap = null;
        this.textarea = null;
    }
}
