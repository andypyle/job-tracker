#!/bin/sh
cat > /usr/share/nginx/html/env-config.js << EOF
window.__env__ = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}",
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}"
};
EOF
exec nginx -g "daemon off;"
