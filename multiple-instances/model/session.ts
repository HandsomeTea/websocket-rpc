import mongoose, { Model } from 'mongoose';
import { instanceId } from '../lib';
interface SessionModel {
    _id: string
    instanceId: string
    userId: string
    info: Record<string, unknown>
    createdAt: Date
    updatedAt: Date
}

export default new class Session {
    private server: Model<SessionModel>;

    constructor() {
        const schema = new mongoose.Schema({
            _id: { type: String, required: true, trim: true }, // 使用sessionId当做_id，根据业务情况而定
            instanceId: { type: String, required: true, trim: true },
            userId: { type: String, required: true, trim: true },
            info: { type: Object }
        }, { timestamps: { _id: false, createdAt: true, updatedAt: true } });
        const collectionName = 'sessions';

        this.server = mongoose.connection.model<SessionModel>(collectionName, schema, collectionName);
    }

    /**
     * 删除已经宕机的instance下的session
     */
    async deleteUnusedSession(aliveInstances: Array<string>) {
        await this.server.deleteMany({ instanceId: { $nin: aliveInstances } });
    }

    /** 添加session，一般为用户登录成功之后添加(视业务场景而定) */
    async insertSession(session: Omit<SessionModel, 'instanceId' | 'createdAt' | 'updatedAt'>) {
        return await this.server.create({
            ...session,
            instanceId: instanceId()
        });
    }

    async removeSessionById(_id: string) {
        await this.server.deleteOne({ _id });
    }

    // ... 其它session操作

};
