#!/bin/bash
# Pixaroid Enhanced Engine Upgrade Script
# Replaces enhanced-workers.js with enhanced-engine.js and enhanced-worker.js

echo "Starting Pixaroid Enhanced Engine upgrade..."

# Find all HTML files in tools directory
find /workspace/tools -name "*.html" -type f | while read file; do
    # Replace enhanced-workers.js with enhanced-engine.js and enhanced-worker.js
    sed -i 's|<script src="/js/enhanced-workers.js"|<script src="/js/enhanced-engine.js"|g' "$file"
    sed -i 's|<script src="/js/tool-controller.js"|<script src="/js/enhanced-worker.js"\n<script src="/js/tool-controller.js"|g' "$file"
done

echo "Upgrade complete!"
