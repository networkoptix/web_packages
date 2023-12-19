export const extractSystemAndResourceId = (
    resourcePath: string,
): { systemId: string; resourceId: string } => ({
    systemId: resourcePath.split('://').pop()?.split('.')[0] || '',
    resourceId: resourcePath.split('.').pop() || '',
});
