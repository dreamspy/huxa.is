#!/usr/bin/env bash
# One-time server setup for preview environments at https://dev-<topic>.<DOMAIN>.
# Creates the preview data dir for the dev user, writes the secrets file for
# preview backends, installs the systemd user unit and the nginx site. Safe to
# re-run. Needs the checkout on the server (server_dev_setup.sh first):
#   ssh <host> 'sudo bash <REPO>/<SCRIPTS_DIR>/server_preview_setup.sh'

set -euo pipefail
. "$(dirname "$(readlink -f "$0")")/lib.sh"
need_root

# Checked before anything is installed: a site that names a missing or wrong
# certificate makes nginx refuse its whole configuration.
echo "== certificate (must cover $DOMAIN and *.$DOMAIN)"
cert_help="Do step 3 of the setup (certificate and DNS) in $DOCS_DIR/phone-workflow.md, then run this again."
[ -f "$SSL_CERT" ] || die "no certificate at $SSL_CERT. $cert_help"
[ -f "$SSL_KEY" ] || die "no private key at $SSL_KEY. $cert_help"
openssl x509 -in "$SSL_CERT" -noout -ext subjectAltName | tr ',' '\n' | grep -i dns || true
openssl x509 -in "$SSL_CERT" -noout -ext subjectAltName | grep -q "\*\.$DOMAIN" \
    || die "$SSL_CERT does not cover *.$DOMAIN, so no preview name would be trusted. $cert_help"

if [ -n "$CATCH_ALL" ]; then
    echo "== default server on 443"
    other=$(grep -RlsE '^[[:space:]]*listen[[:space:]][^;#]*443[^;#]*default_server' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | grep -v "/$PROJECT-preview\$" || true)
    if [ -n "$other" ]; then
        echo "$other" >&2
        die "another site already declares the default server on 443, and nginx allows one. Set CATCH_ALL= (empty) in $SCRIPTS_DIR/workflow.conf, run init.sh, commit, pull here, run this again."
    fi
    echo "none besides the preview site"
fi

echo "== preview data dir"
install -d -m 755 -o "$DEV_USER" -g "$DEV_USER" "$PREVIEWS"

if has_backend; then
    echo "== secrets for preview backends"
    install -d -m 755 "$(dirname "$SECRETS_FILE")"
    {
        echo "# written by server_preview_setup.sh; secrets copied from production ($SECRET_SOURCE)"
        for name in $SECRET_VARS; do
            if [ "$SECRET_SOURCE" = unit ]; then
                [ -n "$SERVICE" ] || die "SECRET_SOURCE=unit needs SERVICE in workflow.conf"
                for kv in $(systemctl show "$SERVICE" -p Environment --value); do
                    case "$kv" in "$name"=*) echo "$kv" ;; esac
                done
            else
                grep "^$name=" "$SECRET_SOURCE" || echo "WARNING: $name not in $SECRET_SOURCE" >&2
            fi
        done
    } > "$SECRETS_FILE"
    chown root:"$DEV_USER" "$SECRETS_FILE"
    chmod 640 "$SECRETS_FILE"
    sed -n '2,$p' "$SECRETS_FILE" | sed -E 's/=(.{4}).*/=\1.../'

fi

# Lingering starts the dev user's systemd manager at boot, with nobody logged
# in, and with it the preview backends and Remote Control.
echo "== systemd user manager"
loginctl enable-linger "$DEV_USER"
dev_uid=$(id -u "$DEV_USER")
systemctl start "user@$dev_uid.service"
install -d -o "$DEV_USER" -g "$DEV_USER" "/home/$DEV_USER/.config" "/home/$DEV_USER/.config/systemd" "/home/$DEV_USER/.config/systemd/user"
if has_backend; then
    install -m 644 -o "$DEV_USER" -g "$DEV_USER" "$REPO/$INFRA_DIR/systemd/$UNIT@.service" "/home/$DEV_USER/.config/systemd/user/"
    sudo -Hu "$DEV_USER" env XDG_RUNTIME_DIR="/run/user/$dev_uid" systemctl --user daemon-reload
fi

echo "== nginx"
install -m 644 "$REPO/$INFRA_DIR/nginx/$PROJECT-preview.conf" "/etc/nginx/sites-available/$PROJECT-preview"
ln -sf "/etc/nginx/sites-available/$PROJECT-preview" "/etc/nginx/sites-enabled/$PROJECT-preview"
if ! nginx -t; then
    # Leave nginx able to reload for everyone else on the box.
    rm -f "/etc/nginx/sites-enabled/${PROJECT:?}-preview"
    die "nginx rejects the configuration with the preview site in it; the site is disabled again. Fix what nginx -t reports above and run this again."
fi
systemctl reload nginx

echo
echo "done. DNS needs a proxied wildcard A record: *.$DOMAIN -> $SERVER_IP"
