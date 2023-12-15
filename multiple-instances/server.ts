import mongoose from 'mongoose';
import { sessionService, instanceService } from './service';
import { WebsocketServer } from '../src';
import cluster from 'cluster';

const start = async () => {
    await mongoose.connect('mongodb://localhost:27017/test');
    const server = new WebsocketServer<{ userId: string }>({ port: 3801 });

    server.start(() => {
        instanceService.healthCheck();

        if (cluster.isWorker) {
            // eslint-disable-next-line no-console
            console.log(`server ${process.pid} start`);
        }
    });

    server.register('login', async (params, socket) => {
        const { user } = params as { user: string };

        await sessionService.insertSession(user, socket.id);
        return {
            userId: user,
            token: 'xxxxxx',
            role: 'admin'
        };
    });

    server.offline(async (_attr, id: string) => {
        await sessionService.deleteSession(id);
    });
};

/** 3分钟后会少两个进程，注意观察instance数据 */
if (cluster.isPrimary) {
    for (let i = 0; i < 4; i++) {
        const worker = cluster.fork();

        if (i > 1) {
            setTimeout(() => {
                worker.process.kill();
            }, 3 * 60 * 1000);
        }
    }

    cluster.on('exit', (worker) => {
        // eslint-disable-next-line no-console
        console.log(`server ${worker.process.pid} died, attention!`);
    });
} else {
    start();
}
