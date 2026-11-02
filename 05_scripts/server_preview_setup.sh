#!/usr/bin/env bash
# One-time server setup for preview environments at https://dev-<topic>.huxa.is.
# Creates /var/lib/huxa-preview for huxadev, writes /etc/huxa/preview.env with
# the token and OpenAI key taken from the production unit, installs the systemd
# user unit and the nginx site. Safe to re-run. Run server_dev_setup.sh first.
#
# Run from the Mac:
#   ssh huxa 'sudo bash -s' < 05_scripts/server_preview_setup.sh

set -euo pipefail

DEV_USER=huxadev
REPO=/opt/huxa
PREVIEWS=/var/lib/huxa-preview

if [ "$(id -u)" -ne 0 ]; then
    echo "run as root" >&2
    exit 1
fi

echo "== origin certificate names (must include *.huxa.is)"
openssl x509 -in /etc/ssl/cloudflare/huxa.pem -noout -ext subjectAltName | tr ',' '\n' | grep -i dns || echo "no DNS names found"

echo "== preview data dir"
install -d -m 755 -o "$DEV_USER" -g "$DEV_USER" "$PREVIEWS"

echo "== secrets for preview backends"
{
    echo "# written by server_preview_setup.sh from the huxa.service environment"
    for kv in $(systemctl show huxa -p Environment --value); do
        case "$kv" in
            HUXA_AUTH_TOKEN=*|OPENAI_API_KEY=*) echo "$kv" ;;
        esac
    done
} > /etc/huxa/preview.env
chown root:"$DEV_USER" /etc/huxa/preview.env
chmod 640 /etc/huxa/preview.env
sed -n '2,$p' /etc/huxa/preview.env | sed -E 's/=(.{4}).*/=\1.../'

echo "== systemd user unit"
loginctl enable-linger "$DEV_USER"
dev_uid=$(id -u "$DEV_USER")
systemctl start "user@$dev_uid.service"
install -d -o "$DEV_USER" -g "$DEV_USER" "/home/$DEV_USER/.config/systemd/user"
install -m 644 -o "$DEV_USER" -g "$DEV_USER" "$REPO/04_infrastructure/systemd/huxa-preview@.service" "/home/$DEV_USER/.config/systemd/user/"
sudo -Hu "$DEV_USER" env XDG_RUNTIME_DIR="/run/user/$dev_uid" systemctl --user daemon-reload

echo "== nginx"
install -m 644 "$REPO/04_infrastructure/nginx/huxa-preview.conf" /etc/nginx/sites-available/huxa-preview
ln -sf /etc/nginx/sites-available/huxa-preview /etc/nginx/sites-enabled/huxa-preview
nginx -t
systemctl reload nginx

echo
echo "done. Cloudflare needs a proxied wildcard A record: *.huxa.is -> 54.246.181.20"
