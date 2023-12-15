import { Sessions } from '../model';

export default new class SessionService {
    constructor() {
        //
    }

    async deleteSession(sessionId: string) {
        // ...其他业务逻辑
        await Sessions.removeSessionById(sessionId);
    }

    async insertSession(userId: string, sessionId: string) {
        // ...其他业务逻辑
        await Sessions.insertSession({ _id: sessionId, userId, info: { type: 'test-user' } });
    }

    // ... 其它session业务

};
