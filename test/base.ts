import { WebSocketServer, WebSocketClient, Attribute, ServerOptions, ClientOptions } from '../src';

export default async <Attr extends Attribute>(options?: { server?: ServerOptions, client?: ClientOptions }, clientStart = true) => {
	const server = new WebSocketServer<Attr>({ port: 0 }, options?.server);

	await server.start();
	const port = server.port;
	const client = new WebSocketClient(`ws://localhost:${port}`, undefined, options?.client);

	if (clientStart) {
		await client.open();
	}

	return {
		server,
		client
	};
};
