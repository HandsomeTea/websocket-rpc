import WS from 'ws';

const client = new WS('ws://localhost:3303');

client.on('error', console.error);

export default client;
