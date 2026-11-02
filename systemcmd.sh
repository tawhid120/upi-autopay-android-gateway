#!/usr/bin/env bash
# PayVerify BD 24/7 Service Controller (systemcmd helper)

ACTION=${1:-status}

case "$ACTION" in
    start)
        echo "Starting PayVerify 24/7 service..."
        systemctl start payverify.service
        ;;
    stop)
        echo "Stopping PayVerify service..."
        systemctl stop payverify.service
        ;;
    restart)
        echo "Restarting PayVerify service..."
        systemctl restart payverify.service
        ;;
    status)
        systemctl status payverify.service --no-pager
        ;;
    logs)
        journalctl -u payverify.service -f
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
