#!/bin/bash
# sheet.sh <video> <out.png> t1 t2 t3 t4  -> 2x2 contact sheet of frames at those times
v=$1; o=$2; shift 2; i=0; args=(); tmp="${o%.png}"
for t in "$@"; do ffmpeg -v error -y -ss $t -i "$v" -frames:v 1 -vf scale=960:-1 "${tmp}_f$i.png"; args+=(-i "${tmp}_f$i.png"); i=$((i+1)); done
ffmpeg -v error -y "${args[@]}" -filter_complex "[0][1]hstack[a];[2][3]hstack[b];[a][b]vstack" "$o"
rm -f "${tmp}"_f*.png
