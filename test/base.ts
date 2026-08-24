import { WebSocketServer, WebSocketClient, Attribute, ServerOptions } from '../src';

export default async <Attr extends Attribute>(serverOptions?: ServerOptions, clientStart = true) => {
	const server = new WebSocketServer<Attr>({ port: 0 }, serverOptions);

	await server.start();
	const port = server.port;
	const client = new WebSocketClient(`ws://localhost:${port}`);

	if (clientStart) {
		await client.open();
	}

	return {
		server,
		client
	};
};
