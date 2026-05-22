#!/usr/bin/env python3
"""
Pixaroid Asset Health Checker
Validates all critical assets exist and are properly configured
"""

import os
import json
from pathlib import Path

def check_assets():
    workspace = Path('/workspace')
    issues = []
    warnings = []
    
    # Critical files that must exist
    critical_files = [
        'css/output.css',
        'css/animations.css',
        'js/app.js',
        'js/engine.js',
        'js/enhanced-engine.js',
        'js/enhanced-worker.js',
        'js/enhanced-workers.js',
        'js/tool-controller.js',
        'sw.js',
        'manifest.json',
        'vercel.json',
        'index.html',
    ]
    
    # Asset directories
    asset_dirs = [
        'assets/images',
        'assets/svg',
        'workers',
        'config',
        'templates',
    ]
    
    print("🔍 Pixaroid Asset Health Check\n")
    print("=" * 50)
    
    # Check critical files
    print("\n📄 Critical Files:")
    for f in critical_files:
        path = workspace / f
        if path.exists():
            size = path.stat().st_size
            print(f"  ✅ {f} ({size:,} bytes)")
        else:
            print(f"  ❌ {f} - MISSING")
            issues.append(f"Missing critical file: {f}")
    
    # Check asset directories
    print("\n📁 Asset Directories:")
    for d in asset_dirs:
        path = workspace / d
        if path.exists() and path.is_dir():
            files = list(path.glob('*'))
            print(f"  ✅ {d}/ ({len(files)} files)")
        else:
            print(f"  ❌ {d}/ - MISSING")
            issues.append(f"Missing directory: {d}")
    
    # Check specific assets
    print("\n🖼️ Image Assets:")
    images = [
        'assets/images/icon-192.png',
        'assets/images/og-default.svg',
        'assets/svg/favicon.svg',
        'assets/svg/logo.svg',
    ]
    for img in images:
        path = workspace / img
        if path.exists():
            size = path.stat().st_size
            print(f"  ✅ {img} ({size:,} bytes)")
        else:
            print(f"  ⚠️ {img} - Missing (non-critical)")
            warnings.append(f"Missing asset: {img}")
    
    # Check workers
    print("\n⚙️ Web Workers:")
    workers = [
        'workers/compress.worker.js',
        'workers/convert.worker.js',
        'workers/resize.worker.js',
        'workers/filter.worker.js',
        'workers/bulk.worker.js',
        'workers/ai.worker.js',
        'workers/pdf.worker.js',
    ]
    for w in workers:
        path = workspace / w
        if path.exists():
            size = path.stat().st_size
            print(f"  ✅ {w} ({size:,} bytes)")
        else:
            print(f"  ❌ {w} - MISSING")
            issues.append(f"Missing worker: {w}")
    
    # Check manifest.json
    print("\n📱 PWA Manifest:")
    manifest_path = workspace / 'manifest.json'
    if manifest_path.exists():
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
            print(f"  ✅ Valid JSON")
            print(f"  Name: {manifest.get('name', 'N/A')}")
            print(f"  Icons: {len(manifest.get('icons', []))} defined")
            if 'shortcuts' in manifest:
                print(f"  Shortcuts: {len(manifest['shortcuts'])} defined")
        except json.JSONDecodeError as e:
            print(f"  ❌ Invalid JSON: {e}")
            issues.append("manifest.json is not valid JSON")
    
    # Summary
    print("\n" + "=" * 50)
    print(f"\n📊 Summary:")
    print(f"  Issues: {len(issues)}")
    print(f"  Warnings: {len(warnings)}")
    
    if issues:
        print("\n❌ Critical Issues:")
        for issue in issues:
            print(f"  - {issue}")
    
    if warnings:
        print("\n⚠️ Warnings:")
        for warning in warnings:
            print(f"  - {warning}")
    
    if not issues and not warnings:
        print("\n✅ All assets are healthy!")
        return 0
    elif not issues:
        print("\n⚠️ Some non-critical assets missing")
        return 1
    else:
        print("\n❌ Critical issues found!")
        return 2

if __name__ == '__main__':
    exit(check_assets())
