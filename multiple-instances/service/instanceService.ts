import mongoose from 'mongoose';
import { instanceSetting } from '../lib';
import { Instances, Sessions } from '../model';

export default new class InstanceService {
    async healthCheck() {
        /**当前instance保活维护 */
        await Instances.upsertInstance();
        setInterval(() => Instances.upsertInstance(), instanceSetting.KeepInstanceAliveInterval * 1000);

        /** 删除无效的instance, 及无效instance下的session */
        setInterval(async () => {
            const session = await mongoose.startSession();

            session.startTransaction();
            try {
                await Instances.deleteUnusedInstance(session);
                const aliveInstanceIds = await Instances.getAliveInstance(session);

                await Sessions.deleteUnusedSession(aliveInstanceIds, session);
                await session.commitTransaction();
            } catch (err) {
                console.log(err);
                await session.abortTransaction();
            } finally {
                await session.endSession();
            }
        }, instanceSetting.CleanInstanceInterval * 1000);
    }

    // ... 其它instance业务

};
