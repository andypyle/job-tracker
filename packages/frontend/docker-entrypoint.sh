#!/bin/sh

# Generate runtime env config for the frontend app
cat > /usr/share/nginx/html/env-config.js << EOF
window.__env__ = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}",
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}"
};
EOF

# Process nginx config template (substitutes ${PORT})
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
