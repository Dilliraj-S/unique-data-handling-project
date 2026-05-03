import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
  transports: ['ws', 'wss'],
  auth: {
    headers: {
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
    },
  },
});

export function listenCount(processId) {
    if (!window.userId || !processId) {
        console.error('Missing userId or processId for Echo subscription');
        return;
    }

    console.log('Listening for CountEvent...');

    window.Echo.private(`progress.user.${window.userId}.${processId}`)
        .listen('.CountEvent', (e) => {
            console.log('Received CountEvent:', e);
            console.log(e.type);
            if (e.type === 'total_companies') {
                const btn = document.getElementById('btnTotalCompanies');
                const display = document.getElementById('totalCompanies');

                if (btn) btn.classList.add('d-none');
                if (display) {
                    display.textContent = e.count;
                    display.classList.remove('d-none');
                }

            } else if (e.type === 'filtered_companies') {
                const btn = document.getElementById('btnFilteredCompanies');
                const display = document.getElementById('filterCompanies');

                if (btn) btn.classList.add('d-none');
                if (display) {
                    display.textContent = e.count;
                    display.classList.remove('d-none');
                }
            } else {
                console.warn('Unknown count type:', e.type);
            }
        });
}


