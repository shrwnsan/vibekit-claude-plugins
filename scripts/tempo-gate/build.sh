#!/usr/bin/env bash
# Builds the tempo-gate arm image from the local agent-browser binary.
set -eu
cd "$(dirname "$0")"
cp ~/.local/bin/agent-browser ./agent-browser
docker build -t tempo-gate -f Dockerfile .
rm -f ./agent-browser
