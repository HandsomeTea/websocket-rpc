export const jsonSerialize = (data: unknown) => {
    const errorReplacer = (_key: string, value: unknown) => {
        if (value instanceof Error) {
            const result = {
                name: value.name,
                message: value.message,
                stack: value.stack,
                cause: value.cause
            };

            if (typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'development') {
                delete result.stack;
            }
            return result;
        }
        return value;
    };
    if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development') {
        return JSON.stringify(data, errorReplacer, '   ')
    } else {
        return JSON.stringify(data, errorReplacer);
    }
};
