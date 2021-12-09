const brackets = ['{', '}', '[', ']'];

const createSpan = (className: string) => {
    return {
        startingTag: `<span class=${className}>`,
        endingTag: '</span>'
    };
};

/**
 * This function highlights all of the code inside a code-block/swagger-textarea.
 * Runs on code blocks when they get line counters added to them.
 * Runs on swagger-textareas on init and when you paste into them - NOT YET IMPLEMENTED
 */
export const highlightAllCode = (element: HTMLElement) => {
    const lines = element.querySelectorAll('div');
    if (!brackets.includes(lines[0].innerText[0])) return; // not json

    for (const line of lines as any) {
        let i = 0;
        let beforeColon = true;
        let text: Array<string> = line.innerText.split('');
        let loopCounter = 0;
        while (i < text.length && loopCounter < 100) {
            if (brackets.includes(text[i])) {
                const { startingTag, endingTag } = createSpan('bracket');
                text = text.slice(0, i).concat(startingTag, text[i], endingTag,  text.slice(i + 1));
                i = i + 2;
            } else if (text[i] === '"') {
                const addTag = beforeColon;
                const { startingTag, endingTag } = createSpan('key-text');
                let j = i + 1;
                while (j < text.length && text[j] !== '"') {
                    j++;
                }
                if (addTag) {
                    text = text.slice(0, i).concat(startingTag, text.slice(i, j + 1), endingTag, text.slice(j + 1));
                    i = j + 2;
                } else {
                    i = j;
                }
            } else if (text[i] === ':') {
                beforeColon = false;
            } else if (!isNaN(parseInt(text[i]))  && !beforeColon) {
                // Number
                const { startingTag, endingTag } = createSpan('value-number');
                const startInd = i;
                while (i < text.length && text[i] !== ',') {
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
