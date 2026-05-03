import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
// import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
    // server: {
    //     host: '127.0.0.1',
    //     port: 5173,
    //     watch: {
    //         // Use polling: false and ignored paths to reduce watching
    //         usePolling: false,
    //         ignored: ['**/*']
    //     },
    //     hmr: false, // Disable HMR entirely
    // },
    plugins: [
        laravel({
            input: [
                // Un-Authenticated (lander)
                'resources/css/lander.css',
                'resources/js/lander.js',
                // Authenticated (system)
                'resources/css/system.css',
                'resources/js/system.js',
            ],
            refresh: true,
        }),
        tailwindcss(),
    ],
});
