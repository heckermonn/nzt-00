#!/usr/bin/env bash
# Encode the FIG. 04 loop: with all 168 frames it encodes them straight at 24 fps; with only every 2nd frame of a 24 fps timeline (ad04.py --step 2) are
# motion-interpolated back to 24 fps, then written as WebM (VP9) and MP4 (H.264) plus a poster.
#   ad04_encode.sh FRAMES_DIR OUT_DIR
set -euo pipefail
src=$1; out=$2; tmp=$(mktemp -d)
i=0; for f in $(ls "$src"/f_*.png | sort); do ln -s "$(readlink -f "$f")" "$tmp/s_$(printf %04d $i).png"; i=$((i+1)); done
# loop the first frame onto the end so the interpolation closes the seam, then drop it again
ln -s "$(readlink -f "$(ls "$src"/f_*.png | sort | head -1)")" "$tmp/s_$(printf %04d $i).png"
n=$(( i * 2 )); fr=12
if [ "$i" -ge 168 ]; then fr=24; n=$i; vf="trim=end_frame=$n,format=yuv420p"; else
vf="minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,trim=end_frame=$n,format=yuv420p"; fi
ffmpeg -v error -y -framerate $fr -i "$tmp/s_%04d.png" -vf "$vf" -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -an "$out/ad04.webm"
ffmpeg -v error -y -framerate $fr -i "$tmp/s_%04d.png" -vf "$vf" -c:v libx264 -crf 23 -preset slow -profile:v high -movflags +faststart -an "$out/ad04.mp4"
ffmpeg -v error -y -i "$(ls "$src"/f_*.png | sort | head -1)" -c:v libwebp -quality 84 "$out/ad04_poster.webp"
rm -rf "$tmp"; ls -l "$out"
