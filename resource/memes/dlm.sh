#!/bin/sh
yt-dlp -q -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "$1.mp4" "https://www.youtube.com/watch?v=$2" >/dev/null 2>&1 || echo "FAIL $1"
