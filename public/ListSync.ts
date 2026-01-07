// Durable Object for managing WebSocket connections for list synchronization

import type { DurableObjectState, DurableObjectNamespace } from '@cloudflare/workers-types';
import { getList, saveList } from './logic';

interface Session {
    webSocket: WebSocket;
    listId: string;
}

export class ListSync {
    private sessions: Set<Session>;
    private env: Env;
    
    constructor(state: DurableObjectState, env: Env) {
        this.env = env;
        this.sessions = new Set();
        console.log('[DURABLE] ListSync constructor called for state:', state?.id?.toString ? state.id.toString() : '(no id)');
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        
        console.log('[DURABLE] Fetch called, URL:', url.toString());
        
        // Handle WebSocket upgrade
        if (request.headers.get('Upgrade') === 'websocket') {
            const listId = url.searchParams.get('listId') || 'default';
            
            console.log('[DURABLE] WebSocket upgrade request - listId:', listId);

            try {
                // @ts-ignore - WebSocketPair is available in Cloudflare Workers runtime
                const pair = new WebSocketPair();
                const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

                console.log('[DURABLE] WebSocketPair created');

                await this.handleSession(server, listId);

                console.log('[DURABLE] Returning 101 response with WebSocket');
                return new Response(null, {
                    status: 101,
                    // @ts-ignore - webSocket is valid in Cloudflare Workers Response
                    webSocket: client,
                });
            } catch (error) {
                console.error('[DURABLE] Error creating WebSocket:', error);
                return new Response('Error: ' + error, { status: 500 });
            }
        }

        console.error('[DURABLE] Not a WebSocket upgrade request');
        console.log('[DURABLE] Request headers:', Array.from(request.headers.entries()));
        return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    async handleSession(webSocket: WebSocket, listId: string) {
        console.log('[DURABLE] handleSession called - listId:', listId);
        
        // @ts-ignore - accept() is available on Cloudflare Workers WebSocket
        webSocket.accept();
        console.log('[DURABLE] WebSocket accepted');

        const session: Session = {
            webSocket,
            listId
        };

        this.sessions.add(session);
        console.log('[DURABLE] Session added, total sessions:', this.sessions.size);

        webSocket.addEventListener('message', async (event: any) => {
            console.log('[DURABLE] Received message:', event.data);
            try {
                const raw = event.data as string;
                if (!raw || raw.trim() === '') {
                    console.warn('[DURABLE] Ignoring empty WebSocket message');
                    return;
                }
                let data: any;
                try {
                    data = JSON.parse(raw as string);
                } catch (err) {
                    console.error('[DURABLE] Invalid JSON in WebSocket message', err);
                    return;
                }
                
                // Broadcast list updates to all other sessions for this list
                if (data.type === 'list_update') {
                    console.log('[DURABLE] Broadcasting list update');
                    
                    // Persist to D1
                    try {
                        const currentList = await getList(this.env, data.listId);
                        await saveList(this.env, data.listId, {
                            list: data.list,
                            categories: currentList?.categories || [],
                            version: (currentList?.version || 0) + 1
                        });
                        console.log('[DURABLE] List persisted to D1');
                    } catch (err) {
                        console.error('[DURABLE] Error persisting list:', err);
                    }
                    
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
                    
                    // Persist to D1
                    try {
                        const currentList = await getList(this.env, data.listId);
                        await saveList(this.env, data.listId, {
                            list: currentList?.list || [],
                            categories: data.categories,
                            version: (currentList?.version || 0) + 1
                        });
                        console.log('[DURABLE] Categories persisted to D1');
                    } catch (err) {
                        console.error('[DURABLE] Error persisting categories:', err);
                    }
                    
                    this.broadcast(session, {
                        type: 'categories_update',
                        listId: data.listId,
                        categories: data.categories,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error('[DURABLE] Error handling message:', error);
            }
        });

        webSocket.addEventListener('close', () => {
            console.log('[DURABLE] WebSocket closed for listId:', listId);
            this.sessions.delete(session);
            console.log('[DURABLE] Session removed, total sessions:', this.sessions.size);
        });

        webSocket.addEventListener('error', (error: any) => {
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

    broadcast(sender: Session, message: any) {
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
                } catch (error) {
                    console.error('[DURABLE] Error broadcasting to session:', error);
                    this.sessions.delete(session);
                }
            }
        }
        console.log('[DURABLE] Broadcast complete, sent to', broadcastCount, 'sessions');
    }
}
