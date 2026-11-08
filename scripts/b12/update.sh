#!/bin/bash
# recompute exact odds from current ESPN finals
cd "$(dirname "$0")" && node gen.js >/dev/null && gcc -O3 -march=native -fopenmp -o bf bf.c && ./bf > result.json && node mkodds.js
