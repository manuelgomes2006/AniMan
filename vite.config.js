import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createClient } from '@supabase/supabase-js';

function deleteAccountApiPlugin() {
  return {
    name: 'delete-account-api',
    configureServer(server) {
      server.middlewares.use('/api/delete-account', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const { userId, token } = parsed;

            if (!userId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'userId is required' }));
              return;
            }

            const env = loadEnv('development', process.cwd(), '');
            const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://gxcflibgvgvnwhngxygl.supabase.co';

            if (!serviceRoleKey) {
              res.statusCode = 501;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'SERVICE_ROLE_KEY_NOT_CONFIGURED', message: 'SUPABASE_SERVICE_ROLE_KEY is not configured in .env' }));
              return;
            }

            const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
              auth: { autoRefreshToken: false, persistSession: false }
            });

            // Verify caller identity via JWT if provided
            if (token) {
              const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
              if (authErr || !user || user.id !== userId) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Unauthorized: Invalid token' }));
                return;
              }
            }

            // Wipe application tables
            await Promise.allSettled([
              supabaseAdmin.from('watch_history').delete().eq('user_id', userId),
              supabaseAdmin.from('watchlist').delete().eq('user_id', userId),
              supabaseAdmin.from('favorites').delete().eq('user_id', userId),
              supabaseAdmin.from('user_preferences').delete().eq('user_id', userId),
              supabaseAdmin.from('search_history').delete().eq('user_id', userId),
              supabaseAdmin.from('profiles').delete().eq('id', userId),
            ]);

            // Permanently delete user from auth.users
            const { error: deleteUserErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (deleteUserErr) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: deleteUserErr.message }));
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'User permanently deleted from auth.users' }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    deleteAccountApiPlugin()
  ],
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('hls.js')) {
              return 'vendor-player';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
