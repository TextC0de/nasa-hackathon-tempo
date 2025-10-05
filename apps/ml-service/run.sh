#!/bin/bash
# Quick run script for ML Service

cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run: pnpm ml:setup"
    exit 1
fi

# Activate venv and run
echo "🚀 Starting ML Service on http://localhost:8000"
echo ""
source venv/bin/activate
python main.py
