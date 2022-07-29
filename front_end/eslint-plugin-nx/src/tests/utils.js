/* This file is staying as JS due to TS/module/Jasmine interoperability */

/**
 * Wraps text content in a class.
 * @param {string} content
 * @param {string} className
 * @param {string} superClass
 * @returns Content wrapped in class
 */
function classWrapper(content, className = undefined, superClass = undefined) {
    className = className || 'MyClass';
    const extension = superClass ? ` extends ${superClass}` : '';
    return `class ${className}${extension} { ${content} }`;
}

/**
 * Join lines with newline.
 * @param  {...string} lines
 * @returns Joined lines
 */
function joinLines(...lines) {
    return lines.join('\n');
}

module.exports = {
    classWrapper,
    joinLines,
};
