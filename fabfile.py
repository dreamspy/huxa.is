import os
import subprocess

from fabric import task, Connection
from paramiko.config import SSHConfig

HOST = "huxa"


def _conn():
    ssh_config = SSHConfig.from_path(os.path.expanduser("~/.ssh/config"))
    host_config = ssh_config.lookup(HOST)
    return Connection(
        host=host_config["hostname"],
        user=host_config.get("user"),
        connect_kwargs={"key_filename": host_config.get("identityfile")},
    )


@task
def deploy(c):
    """Build web, push to main, pull on server, restart huxa."""
    app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "08_app")
    subprocess.run(["npx", "expo", "export", "--platform", "web"], cwd=app_dir, check=True)
    subprocess.run(["git", "add", os.path.join(app_dir, "dist")], check=True)
    # Commit dist if there are changes
    result = subprocess.run(["git", "diff", "--cached", "--quiet", "--", os.path.join(app_dir, "dist")])
    if result.returncode != 0:
        subprocess.run(["git", "commit", "-m", "Build web dist"], check=True)
    subprocess.run(["git", "push", "origin", "main"], check=True)
    with _conn() as srv:
        srv.run("cd /opt/huxa && sudo git pull origin main")
        srv.run("sudo /opt/huxa/02_backend/venv/bin/pip install -r /opt/huxa/02_backend/requirements.txt --quiet")
        srv.run("sudo mkdir -p /var/lib/huxa/attachments && sudo chown huxa:huxa /var/lib/huxa/attachments")
        srv.run("sudo cp /opt/huxa/04_infrastructure/nginx/huxa.conf /etc/nginx/sites-available/huxa")
        srv.run("sudo nginx -t")
        srv.run("sudo systemctl reload nginx")
        srv.run("sudo systemctl restart huxa")
        srv.run("sudo systemctl status huxa --no-pager")


@task
def status(c):
    """Show huxa service status."""
    with _conn() as srv:
        srv.run("sudo systemctl status huxa --no-pager")


@task
def logs(c, lines=50):
    """Tail huxa logs."""
    with _conn() as srv:
        srv.run(f"journalctl -u huxa -n {int(lines)} --no-pager")


@task
def restart(c):
    """Restart huxa service."""
    with _conn() as srv:
        srv.run("sudo systemctl restart huxa")
        srv.run("sudo systemctl status huxa --no-pager")
