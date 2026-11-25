#!/bin/sh
# Genera un JWT_SECRET nuevo y sus ANON_KEY / SERVICE_ROLE_KEY.
# Uso (en tu Mac o Linux):  sh supabase/generar-claves.sh
# Copia la salida a EasyPanel -> Supabase de licmanene -> Environment.
# No la pegues en chats ni la subas al repositorio.
set -e
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
SECRET=$(openssl rand -hex 32)
IAT=$(date +%s); EXP=$((IAT + 5*365*24*3600))
HDR=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
jwt() {
  P=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$1" "$IAT" "$EXP" | b64url)
  S=$(printf '%s' "$HDR.$P" | openssl dgst -sha256 -hmac "$SECRET" -binary | b64url)
  printf '%s.%s.%s' "$HDR" "$P" "$S"
}
echo "JWT_SECRET=$SECRET"
echo "ANON_KEY=$(jwt anon)"
echo "SERVICE_ROLE_KEY=$(jwt service_role)"
echo "DASHBOARD_PASSWORD=$(openssl rand -hex 12)"
