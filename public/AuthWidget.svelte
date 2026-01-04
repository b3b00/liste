<script lang="ts">
    import { onMount } from 'svelte';
    import { isAuthenticated, getCurrentUser, login, logout } from './client';
    
    let authenticated = false;
    let user: { id: string; email: string; name: string; picture: string } | null = null;
    let isOnline = true;
    
    onMount(() => {
        authenticated = isAuthenticated();
        if (authenticated) {
            user = getCurrentUser();
        }
        
        // Monitor online/offline status
        isOnline = navigator.onLine;
        window.addEventListener('online', () => { isOnline = true; });
        window.addEventListener('offline', () => { isOnline = false; });
    });
</script>

<div class="auth-widget">
    {#if authenticated && user}
        <div class="user-info">
            <img src={user.picture} alt={user.name} class="user-avatar" />
            <div class="user-details">
                <span class="user-name">{user.name}</span>
                <span class="user-email">{user.email}</span>
                {#if !isOnline}
                    <span class="offline-badge">📴 Offline Mode</span>
                {/if}
            </div>
            {#if isOnline}
                <button on:click={logout} class="logout-btn">Logout</button>
            {/if}
        </div>
    {:else}
        <div class="login-prompt">
            {#if !isOnline}
                <p class="offline-message">📴 You're offline. You can still use the app with cached data.</p>
                <p class="offline-hint">Sign in when you're back online to sync your changes.</p>
            {:else}
                <p>Please sign in to sync your lists across devices</p>
                <button on:click={login} class="login-btn">Sign in with Google</button>
            {/if}
        </div>
    {/if}
</div>

<style>
    .auth-widget {
        padding: 1rem;
        background: #f5f5f5;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .user-info {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .user-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
    }
    
    .user-details {
        display: flex;
        flex-direction: column;
        flex: 1;
    }
    
    .user-name {
        font-weight: 600;
        font-size: 1rem;
    }
    
    .user-email {
        font-size: 0.875rem;
        color: #666;
    }
    
    .login-btn, .logout-btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
    }
    
    .login-btn {
        background: #4285f4;
        color: white;
        font-size: 1rem;
    }
    
    .login-btn:hover {
        background: #357ae8;
    }
    
    .logout-btn {
        background: #dc3545;
        color: white;
    }
    
    .logout-btn:hover {
        background: #c82333;
    }
    
    .login-prompt {
        text-align: center;
    }
    
    .login-prompt p {
        margin-bottom: 1rem;
        color: #666;
    }
    
    .offline-badge {
        font-size: 0.75rem;
        color: #ff9800;
        font-weight: 600;
        background: #fff3e0;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        margin-top: 0.25rem;
        display: inline-block;
    }
    
    .offline-message {
        color: #ff9800;
        font-weight: 500;
    }
    
    .offline-hint {
        font-size: 0.875rem;
        color: #999;
    }
</style>
