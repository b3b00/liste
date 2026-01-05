// Durable Object for managing WebSocket connections for list synchronization
export class ListSync {
    sessions;
    state;
    env;
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = new Set();
    }
    async fetch(request) {
        const url = new URL(request.url);
        console.log('[DURABLE] Fetch called, URL:', url.toString());
        // Handle WebSocket upgrade
        if (request.headers.get('Upgrade') === 'websocket') {
            const listId = url.searchParams.get('listId') || 'default';
            console.log('[DURABLE] WebSocket upgrade request - listId:', listId);
            try {
                // @ts-ignore - WebSocketPair is available in Cloudflare Workers runtime
                const pair = new WebSocketPair();
                const [client, server] = Object.values(pair);
                console.log('[DURABLE] WebSocketPair created');
                await this.handleSession(server, listId);
                console.log('[DURABLE] Returning 101 response with WebSocket');
                return new Response(null, {
                    status: 101,
                    // @ts-ignore - webSocket is valid in Cloudflare Workers Response
                    webSocket: client,
                });
            }
            catch (error) {
                console.error('[DURABLE] Error creating WebSocket:', error);
                return new Response('Error: ' + error, { status: 500 });
            }
        }
        console.error('[DURABLE] Not a WebSocket upgrade request');
        return new Response('Expected WebSocket upgrade', { status: 400 });
    }
    async handleSession(webSocket, listId) {
        console.log('[DURABLE] handleSession called - listId:', listId);
        // @ts-ignore - accept() is available on Cloudflare Workers WebSocket
        webSocket.accept();
        console.log('[DURABLE] WebSocket accepted');
        const session = {
            webSocket,
            listId
        };
        this.sessions.add(session);
        console.log('[DURABLE] Session added, total sessions:', this.sessions.size);
        webSocket.addEventListener('message', (event) => {
            console.log('[DURABLE] Received message:', event.data);
            try {
                const data = JSON.parse(event.data);
                // Broadcast list updates to all other sessions for this list
                if (data.type === 'list_update') {
                    console.log('[DURABLE] Broadcasting list update');
                    this.broadcast(session, {
                        type: 'list_update',
                        listId: data.listId,
                        list: data.list,
                        timestamp: Date.now()
                    });
                }
                // Broadcast categories updates to all other sessions for this list
                if (data.type === 'categories_update') {
                    console.log('[DURABLE] Broadcasting categories update');
                    this.broadcast(session, {
                        type: 'categories_update',
                        listId: data.listId,
                        categories: data.categories,
                        timestamp: Date.now()
                    });
                }
            }
            catch (error) {
                console.error('[DURABLE] Error handling message:', error);
            }
        });
        webSocket.addEventListener('close', () => {
            console.log('[DURABLE] WebSocket closed for listId:', listId);
            this.sessions.delete(session);
            console.log('[DURABLE] Session removed, total sessions:', this.sessions.size);
        });
        webSocket.addEventListener('error', (error) => {
            console.error('[DURABLE] WebSocket error for listId:', listId, error);
            this.sessions.delete(session);
        });
        // Send initial connection confirmation
        const confirmMsg = JSON.stringify({
            type: 'connected',
            listId,
            timestamp: Date.now()
        });
        console.log('[DURABLE] Sending connection confirmation:', confirmMsg);
        webSocket.send(confirmMsg);
    }
    broadcast(sender, message) {
        const messageStr = JSON.stringify(message);
        console.log('[DURABLE] Broadcasting to', this.sessions.size, 'sessions');
        let broadcastCount = 0;
        for (const session of this.sessions) {
            // Only send to other users' sessions or same user's other browser tabs
            if (session !== sender && session.listId === sender.listId) {
                try {
                    session.webSocket.send(messageStr);
                    broadcastCount++;
                    console.log('[DURABLE] Sent to session for listId:', session.listId);
                }
                catch (error) {
                    console.error('[DURABLE] Error broadcasting to session:', error);
                    this.sessions.delete(session);
                }
            }
        }
        console.log('[DURABLE] Broadcast complete, sent to', broadcastCount, 'sessions');
    }
}
