import mongoose, { Model } from 'mongoose';
import { instanceId, instanceSetting } from '../lib';

interface InstanceModel {
    _id: string
    createdAt: Date
    updatedAt: Date
}

export default new class Instance {
    private server: Model<InstanceModel>;

    constructor() {
        const schema = new mongoose.Schema({
            _id: { type: String, required: true, trim: true } // 你也可以使用mongodb默认生成的_id，只不过在当前业务场景下，instanceId便可以当做_id
        }, { timestamps: { _id: false, versionKey: false, createdAt: true, updatedAt: true } });
        const collectionName = 'instances';

        this.server = mongoose.connection.model<InstanceModel>(collectionName, schema, collectionName);
    }

    async upsertInstance() {
        // 注意数据库时区和后端服务器时区是否相同
        return await this.server.updateOne({ _id: instanceId() }, { $set: { createdAt: new Date() } }, { upsert: true });
    }

    async deleteUnusedInstance() {
        return await this.server.deleteMany({ updatedAt: { $lt: new Date(new Date().getTime() - instanceSetting.CleanInstanceInterval * 1000 - 2 * 1000) } });
    }

    async getAliveInstance() {
        const list = await this.server.find({ updatedAt: { $gte: new Date(new Date().getTime() - instanceSetting.CleanInstanceInterval * 1000 - 2 * 1000) } });

        return list.map(a => a._id);
    }

    // ... 其它instance操作

};
