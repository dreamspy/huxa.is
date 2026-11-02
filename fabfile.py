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
    """Push main, build and activate on the server, pull the dist commit back."""
    subprocess.run(["git", "push", "origin", "main"], check=True)
    with _conn() as srv:
        srv.run("sudo -Hiu huxadev bash -c 'cd /opt/huxa && git pull --ff-only && 05_scripts/deploy.sh'")
    subprocess.run(["git", "pull", "--ff-only"], check=True)


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
