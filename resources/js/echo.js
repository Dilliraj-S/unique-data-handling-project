import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        }
    }
});

window.Echo.private('table-channel')
    .listen('.table.action', (e) => {
        console.log('Data', e);
        sendSkeletonKey(e.token);
    });

function sendSkeletonKey(key) {
    axios.post('/get-token/skeleton-key', {
        key: key
    }, {
        headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        }
    }).then(response => {
        console.log('Key sent successfully:', response.data);
        if (response.data.token) {
            window.skeleton.reloadTable(response.data.token + "_f");
        }
    }).catch(error => {
        console.error('Error sending key:', error);
    });
}
