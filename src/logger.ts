import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';
const caller = () => {
    const stack = new Error().stack?.split('\n') || [];
    const line = stack.find(l => l.includes('.ts:') && !l.includes('logger.ts'));
    const match = line?.match(/\((.+\.ts):(\d+):(\d+)\)/);
    return (match ? `${match[1]}:${match[2]}` : '').trim().replace(`${process.cwd()}/`, '');
};
const terminalLogger = pino(
    {
        level: 'trace',
        timestamp: pino.stdTimeFunctions.isoTime,
        base: {
            pid: undefined,
            hostname: undefined
        },
        ...(isDev && { mixin() { return { location: caller() }; } })
    },
    isDev ? pino.transport({
        targets: [
            {
                target: 'pino-pretty',
                level: 'trace',
                options: {
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o',
                    ignore: 'pid, hostname'
                }
            }
        ]
    }) : undefined
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const log = (module = 'websocket', option?: { [key: string]: any }) => terminalLogger.child({ module, ...option });
