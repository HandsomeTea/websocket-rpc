import crypto from 'crypto';

export const instanceId = () => {
    if (!process.env.INSTANCEID) {
        process.env.INSTANCEID = crypto.randomBytes(24).toString('hex').substring(0, 17);
    }

    return process.env.INSTANCEID;
};

export const instanceSetting = {
    /** 清空无效的instance间隔, 30秒 */
    CleanInstanceInterval: 30,
    /** instance保活间隔, 10秒 */
    KeepInstanceAliveInterval: 10
};
