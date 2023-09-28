export function classWrapper(content: string, className?: string, superClass?: string): string {
    className = className || 'MyClass';
    const extension = superClass ? ` extends ${superClass}` : '';
    return `class ${className}${extension} { ${content} }`;
}

export function joinLines(...lines: string[]): string {
    return lines.join('\n');
}

export function successfulCodeObjects(successCases: string[]): { code: string }[] {
    return successCases.map(success => ({ code: success }));
}
