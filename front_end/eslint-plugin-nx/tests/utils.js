function classWrapper(content, className = undefined, superClass = undefined) {
    className = className || 'MyClass';
    const extension = superClass ? ` extends ${superClass}` : '';
    return `class ${className}${extension} { ${content} }`;
}

function joinLines(...lines) {
    return lines.join('\n');
}

module.exports = {
    classWrapper,
    joinLines,
};
