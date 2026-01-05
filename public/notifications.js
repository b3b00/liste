// Notification/Toast system
import { writable } from 'svelte/store';
function createNotificationStore() {
    const { subscribe, update } = writable([]);
    let nextId = 1;
    return {
        subscribe,
        show: (message, type = 'info', duration = 5000) => {
            const id = nextId++;
            const notification = { id, message, type, duration };
            update(notifications => [...notifications, notification]);
            if (duration > 0) {
                setTimeout(() => {
                    update(notifications => notifications.filter(n => n.id !== id));
                }, duration);
            }
            return id;
        },
        dismiss: (id) => {
            update(notifications => notifications.filter(n => n.id !== id));
        },
        clear: () => {
            update(() => []);
        }
    };
}
export const notifications = createNotificationStore();
