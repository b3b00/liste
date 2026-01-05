<script lang="ts">
    import { notifications } from './notifications';
    
    let notificationList: any[] = [];
    
    notifications.subscribe(value => {
        notificationList = value;
    });
    
    function dismiss(id: number) {
        notifications.dismiss(id);
    }
</script>

<div class="notification-container">
    {#each notificationList as notification (notification.id)}
        <div class="notification notification-{notification.type}" on:click={() => dismiss(notification.id)}>
            <span class="notification-message">{notification.message}</span>
            <button class="notification-close" on:click|stopPropagation={() => dismiss(notification.id)}>×</button>
        </div>
    {/each}
</div>

<style>
    .notification-container {
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
    }

    .notification {
        background: #323232;
        color: white;
        padding: 14px 16px;
        border-radius: 4px;
        box-shadow: 0 3px 5px -1px rgba(0,0,0,.2), 0 6px 10px 0 rgba(0,0,0,.14), 0 1px 18px 0 rgba(0,0,0,.12);
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: slideIn 0.3s ease-out;
        cursor: pointer;
        font-size: 14px;
        line-height: 20px;
    }

    .notification-info {
        background: #2196F3;
    }

    .notification-success {
        background: #4CAF50;
    }

    .notification-warning {
        background: #FF9800;
    }

    .notification-error {
        background: #F44336;
    }

    .notification-message {
        flex: 1;
        margin-right: 8px;
    }

    .notification-close {
        background: transparent;
        border: none;
        color: white;
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .notification-close:hover {
        opacity: 1;
    }

    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
</style>
