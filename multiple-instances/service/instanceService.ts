import { instanceSetting } from '../lib';
import { Instances, Sessions } from '../model';

export default new class InstanceService {
    constructor() {
        //
    }

    async healthCheck() {
        /**当前instance保活维护 */
        await Instances.upsertInstance();
        setInterval(() => Instances.upsertInstance(), instanceSetting.KeepInstanceAliveInterval * 1000);

        /** 删除无效的instance, 及无效instance下的session */
        setInterval(async () => {
            await Instances.deleteUnusedInstance();
            const aliveInstanceIds = await Instances.getAliveInstance();

            await Sessions.deleteUnusedSession(aliveInstanceIds);
        }, instanceSetting.CleanInstanceInterval * 1000);
    }

    // ... 其它instance业务

};
