import type { SharedList } from './model';
import * as crypto from 'crypto';

/**
 * Broadcasts list updates to all connected clients via Pusher
 */
export async function broadcastUpdate(env: Env, listId: string, list: SharedList): Promise<void> {
    const appId = env.PUSHER_APP_ID;
    const key = env.PUSHER_KEY;
    const secret = env.PUSHER_SECRET;
    const cluster = env.PUSHER_CLUSTER;

    if (!appId || !key || !secret || !cluster) {
        console.error('Pusher credentials not configured');
        return;
    }

    const channel = `list-${listId}`;
    const event = 'list-updated';
    const data = JSON.stringify({
        categories: list.categories,
        list: list.list,
        timestamp: Date.now()
    });

    // Pusher HTTP API endpoint
    const path = `/apps/${appId}/events`;
    const url = `https://api-${cluster}.pusher.com${path}`;

    // Create authentication signature
    const body = JSON.stringify({
        name: event,
        channels: [channel],
        data: data
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'POST';
    const bodyMd5 = await md5(body);
    
    const queryString = `auth_key=${key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
    const authString = [method, path, queryString].join('\n');
    const authSignature = await hmacSha256(secret, authString);

    // Send to Pusher
    const fullUrl = `${url}?${queryString}&auth_signature=${authSignature}`;
    const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: body
    });

    if (!response.ok) {
        console.error('Failed to broadcast update:', await response.text());
    } else {
        console.log(`Broadcasted update for list ${listId} to channel ${channel}`);
    }
}

async function md5(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('MD5', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function hmacSha256(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
    
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
