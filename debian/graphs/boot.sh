#!/bin/bash

source /etc/default/readsb

if [[ $1 == "nographs" ]]; then
	exit 0
fi

for i in 1h 6h 12h 24h 7d 30d 180d 1y
do
	/usr/share/readsb/graphs/graphs.sh $i $1
done
