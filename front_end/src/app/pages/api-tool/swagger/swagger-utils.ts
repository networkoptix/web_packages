/* eslint-disable @typescript-eslint/no-use-before-define */
import type { textareaMap } from './swagger-types';

const brackets = ['{', '}', '[', ']'];

/**
 * Unique tag that marks where the cursor was originally focused in the text area
 * Could be any arbitrary value.
 * This is neccessary because when you insert html elements into the swagger-textarea the focus position is lost.
 */
export const focusPositionMarker = '^$@^(';

const createSpan = (className: string) => {
    return {
        startingTag: `<span class=${className}>`,
        endingTag: '</span>'
    };
};

/**
  * Highlight all JSON in a code-block/swagger-textarea
  * Runs on each code-block/swagger-textarea re-render, like when code line counters are added
 */
export const highlightAllCode = (element: HTMLElement) => {
    const lines = element.querySelectorAll('div');
    if (!lines.length || !brackets.includes(lines[0].innerText[0])) return; // not json
    if (lines.length > 1000) { // Don't highlight, override swagger highlighting with css
        element.classList.add('no-highlight');
        return;
    }
    for (const line of lines) {
        highlight(line);
    }
};

/**
  * Find the focusPositionMarker and insert a span with the focus-position class at it's position
  * This span is later used in swagger-textarea to put the cursor's focus in the right place
 */
export const insertFocusPositionElement = (line: HTMLElement) => {
    const html = line.innerHTML;

    const { startingTag, endingTag } = createSpan('focus-position');
    const index = html.indexOf(focusPositionMarker);
    if (index !== -1) {
        line.innerHTML = html.slice(0, index) + startingTag + endingTag + html.slice(index + 5);
    }
};

/**
 * Highlight JSON in invdividual line,
 * Runs on input event in a swagger-textarea
 */
export const highlightLine = (line: HTMLElement) => {
    highlight(line);
    insertFocusPositionElement(line);
};

/**
  * Highlight a line in a code-block/swagger-textarea
 */
const highlight = (line: HTMLElement) => {
    if (!line.textContent.length) { // empty line;
        line.innerHTML = '<br>';
        return;
    }
    let i = 0;
    let beforeColon = true;
    let text: Array<string> = line.innerText?.split('');
    let loopCounter = 0;
    if (text) {
        while (i < text.length && loopCounter < 100) {
            if (brackets.includes(text[i])) {
                const { startingTag, endingTag } = createSpan('bracket');
                text = text.slice(0, i).concat(startingTag, text[i], endingTag, text.slice(i + 1));
                i = i + 2;
            } else if (text[i] === '"') {
                let addTag = beforeColon;
                const { startingTag, endingTag } = createSpan('key-text');
                let j = i + 1;
                while (j < text.length && text[j] !== '"') {
                    j++;
                }
                if (text[j + 1] !== ':') {
                    addTag = false;
                }
                if (addTag) {
                    text = text.slice(0, i).concat(startingTag, text.slice(i, j + 1), endingTag, text.slice(j + 1));
                    i = j + 2;
                } else {
                    i = j;
                }
            } else if (text[i] === ':') {
                beforeColon = false;
            } else if (!isNaN(parseInt(text[i])) && !beforeColon) {
                // Number
                const { startingTag, endingTag } = createSpan('value-number');
                const startInd = i;
                while (i < text.length && !isNaN(parseInt(text[i])) && text[i] !== ',') {
                    i++;
                }
                text = text.slice(0, startInd).concat(startingTag, text.slice(startInd, i), endingTag, text.slice(i));
                i = i + 2;
            }
            loopCounter++;
            i++;
        }
        line.innerHTML = text.join('');
    }
};

/**
  * Find the line the element is contained in in a code-block/swagger-textarea
 */
export const findLine = element => {
    if (element?.classList?.contains('line')) {
        return element;
    }
    if (element.parentElement?.classList?.contains('line')) {
        return element.parentElement;
    }
    return element.parentElement.closest('.line');
};

/**
  * Get the html with white-space from the textareaMap and apply it to the codeblock/swagger-textarea
 */
export const setCodeBlockHTML = (element: HTMLElement, textareaMap: textareaMap, elementType: 'codeblock' | 'textarea') => {
    const uuid = element.closest('[uuid]')?.getAttribute('uuid');
    const html = textareaMap[uuid];
    if (html) {
        let innerHTML = html;
        if (elementType === 'codeblock') {
            innerHTML = html.split('</div>').join('</div>&nbsp;');
        }
        element.innerHTML = innerHTML || element.innerHTML;
        return true;
    }
    return false;
};
