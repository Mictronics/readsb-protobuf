# Updates performance graphs.
#

PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/usr/share/readsb/graphs

1-59/4 * * * * readsb bash graphs.sh 1h >/dev/null 2>&1
2-59/4 * * * * readsb bash graphs.sh 6h >/dev/null 2>&1
3-59/4 * * * * readsb bash graphs.sh 12h >/dev/null 2>&1
4-59/4 * * * * readsb bash graphs.sh 24h >/dev/null 2>&1
16,48 * * * * readsb bash graphs.sh 7d >/dev/null 2>&1
32 * * * * readsb bash graphs.sh 30d >/dev/null 2>&1
56 * * * * readsb bash graphs.sh 180d >/dev/null 2>&1
0 1-23/6 * * * readsb bash graphs.sh 1y >/dev/null 2>&1

@reboot readsb bash boot.sh >/dev/null 2>&1

