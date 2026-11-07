#!/bin/sh
cat > /usr/share/nginx/html/env-config.js << EOF
window.__env__ = {
  VITE_NEON_AUTH_URL: "${VITE_NEON_AUTH_URL}",
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}",
  VITE_DEMO_EMAIL: "${VITE_DEMO_EMAIL}",
  VITE_DEMO_PASSWORD: "${VITE_DEMO_PASSWORD}"
};
EOF
