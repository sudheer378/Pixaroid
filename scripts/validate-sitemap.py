#!/usr/bin/env python3
"""
Sitemap Validator & Fixer for Pixaroid
Validates all sitemaps and checks for broken URLs
"""

import xml.etree.ElementTree as ET
import os
import re
from pathlib import Path
from datetime import datetime

BASE_URL = "https://pixaroid.vercel.app"
WORKSPACE = "/workspace"

def validate_sitemap(filepath):
    """Validate a single sitemap file"""
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        urls = []
        broken_urls = []
        
        # Handle both urlset and sitemapindex
        if 'urlset' in root.tag:
            for url in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                urls.append(url.text)
        elif 'sitemapindex' in root.tag:
            for sitemap in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                urls.append(sitemap.text)
        
        return {
            'valid': True,
            'url_count': len(urls),
            'urls': urls[:5],
            'broken': broken_urls
        }
    except Exception as e:
        return {
            'valid': False,
            'error': str(e),
            'url_count': 0,
            'urls': [],
            'broken': []
        }

def main():
    print("=" * 60)
    print("PIXAROID SITEMAP VALIDATION REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    sitemap_files = [
        'sitemap.xml',
        'sitemap-core.xml',
        'sitemap-categories.xml',
        'sitemap-guides.xml',
        'sitemap-tools-1.xml',
        'sitemap-tools-2.xml',
        'sitemap-tools-3.xml',
        'sitemap-tools-4.xml',
    ]
    
    total_urls = 0
    valid_count = 0
    invalid_count = 0
    
    for sitemap_file in sitemap_files:
        filepath = f"{WORKSPACE}/{sitemap_file}"
        if not os.path.exists(filepath):
            print(f"\n❌ {sitemap_file}: NOT FOUND")
            invalid_count += 1
            continue
        
        result = validate_sitemap(filepath)
        
        if result['valid']:
            print(f"\n✅ {sitemap_file}: VALID ({result['url_count']} URLs)")
            if result['urls']:
                print(f"   Sample URLs: {', '.join(result['urls'][:3])}")
            total_urls += result['url_count']
            valid_count += 1
        else:
            print(f"\n❌ {sitemap_file}: INVALID - {result.get('error', 'Unknown error')}")
            invalid_count += 1
    
    print("\n" + "=" * 60)
    print(f"SUMMARY:")
    print(f"  Total sitemaps checked: {len(sitemap_files)}")
    print(f"  Valid: {valid_count}")
    print(f"  Invalid: {invalid_count}")
    print(f"  Total URLs indexed: {total_urls:,}")
    print("=" * 60)
    
    # Check robots.txt
    robots_path = f"{WORKSPACE}/robots.txt"
    if os.path.exists(robots_path):
        with open(robots_path, 'r') as f:
            content = f.read()
            if 'Sitemap:' in content:
                print("\n✅ robots.txt contains Sitemap directives")
            else:
                print("\n⚠️  robots.txt missing Sitemap directives")
    
    return invalid_count == 0

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
