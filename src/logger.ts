import log4js, { Configuration } from 'log4js';

/**
 * 定义日志配置
 */
export const createLogInstance = (): void => {
    log4js.configure({
        disableClustering: true,
        appenders: {
            _system: {
                type: 'stdout',
                layout: {
                    type: 'pattern',
                    pattern: '%[[%d{ISO8601_WITH_TZ_OFFSET}] [%p] [%X{Module}]%] %m%n'
                }
            }
            // [2021-09-23 16:59:33.762] %d{yyyy-MM-dd hh:mm:ss.SSS}
            // [2021-08-05T18:17:00.549] %d
            // [2021-08-05T18:17:39.235+0800] %d{ISO8601_WITH_TZ_OFFSET}
            // [18:18:21.475] %d{ABSOLUTE}
            // [05 08 2021 18:19:20.196] %d{DATE}
            // [2021-08-05T18:19:44.804] %d{ISO8601}
        },
        categories: {
            default: {
                appenders: ['_system'],
                level: 'OFF',
                enableCallStack: true
            },
            systemLog: {
                appenders: ['_system'],
                level: 'ALL'
            }
        }
    } as Configuration);
};

createLogInstance();

/**
 * 系统日志使用
 * @param {string} module
 */
export const log = (module?: string): log4js.Logger => {
    const _systemLogger = log4js.getLogger('systemLog');

    _systemLogger.addContext('Module', module || 'websocket');

    return _systemLogger;
};
