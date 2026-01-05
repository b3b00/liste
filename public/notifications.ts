// Notification/Toast system
import { writable } from 'svelte/store';

export interface Notification {
    id: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration: number;
}

function createNotificationStore() {
    const { subscribe, update } = writable<Notification[]>([]);
    let nextId = 1;

    return {
        subscribe,
        show: (message: string, type: Notification['type'] = 'info', duration: number = 5000) => {
            const id = nextId++;
            const notification: Notification = { id, message, type, duration };
            
            update(notifications => [...notifications, notification]);

            if (duration > 0) {
                setTimeout(() => {
                    update(notifications => notifications.filter(n => n.id !== id));
                }, duration);
            }

            return id;
        },
        dismiss: (id: number) => {
            update(notifications => notifications.filter(n => n.id !== id));
        },
        clear: () => {
            update(() => []);
        }
    };
}

export const notifications = createNotificationStore();
