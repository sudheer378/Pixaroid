#!/usr/bin/env python3
"""
Sitemap Health Check for Google Search Console
Diagnoses and fixes common sitemap fetching errors
"""

import os
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

BASE_URL = "https://pixaroid.vercel.app"
WORKSPACE = "/workspace"

def check_sitemap_accessibility():
    """Check if sitemaps are accessible and properly formatted"""
    print("=" * 70)
    print("GOOGLE SEARCH CONSOLE SITEMAP HEALTH CHECK")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    issues = []
    warnings = []
    passed = []
    
    # Check 1: robots.txt exists and is accessible
    print("\n📋 CHECK 1: robots.txt")
    robots_path = f"{WORKSPACE}/robots.txt"
    if os.path.exists(robots_path):
        with open(robots_path, 'r') as f:
            content = f.read()
            if 'Sitemap:' in content:
                passed.append("✅ robots.txt contains Sitemap directives")
                print("   ✅ Contains Sitemap directives")
            else:
                issues.append("❌ robots.txt missing Sitemap directives")
                print("   ❌ Missing Sitemap directives")
            
            if 'Allow: /*.js$' in content or 'Allow: /*.css$' in content:
                passed.append("✅ robots.txt allows CSS/JS fetching")
                print("   ✅ Allows CSS/JS fetching (critical for rendering)")
            else:
                issues.append("❌ robots.txt may block CSS/JS (causes rendering issues)")
                print("   ⚠️  Consider allowing CSS/JS explicitly")
    else:
        issues.append("❌ robots.txt not found")
        print("   ❌ robots.txt not found")
    
    # Check 2: Main sitemap exists and is valid XML
    print("\n📋 CHECK 2: Main sitemap.xml")
    sitemap_path = f"{WORKSPACE}/sitemap.xml"
    if os.path.exists(sitemap_path):
        try:
            tree = ET.parse(sitemap_path)
            root = tree.getroot()
            
            if 'sitemapindex' in root.tag:
                sitemaps = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap')
                passed.append(f"✅ sitemap.xml is valid with {len(sitemaps)} child sitemaps")
                print(f"   ✅ Valid sitemap index with {len(sitemaps)} child sitemaps")
                
                # Check each child sitemap URL
                for sm in sitemaps:
                    loc = sm.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                    if loc is not None:
                        # Verify the referenced file exists
                        sm_filename = loc.text.replace(BASE_URL + '/', '')
                        sm_filepath = f"{WORKSPACE}/{sm_filename}"
                        if not os.path.exists(sm_filepath):
                            issues.append(f"❌ Referenced sitemap not found: {sm_filename}")
                            print(f"   ❌ Referenced file not found: {sm_filename}")
                        else:
                            # Validate the child sitemap
                            try:
                                child_tree = ET.parse(sm_filepath)
                                child_root = child_tree.getroot()
                                url_count = len(child_root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url'))
                                passed.append(f"✅ {sm_filename}: {url_count} URLs")
                                print(f"   ✅ {sm_filename}: {url_count} URLs")
                            except Exception as e:
                                issues.append(f"❌ {sm_filename}: Invalid XML - {e}")
                                print(f"   ❌ Invalid XML: {e}")
            else:
                urls = root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
                passed.append(f"✅ sitemap.xml is valid with {len(urls)} URLs")
                print(f"   ✅ Valid with {len(urls)} URLs")
                
        except ET.ParseError as e:
            issues.append(f"❌ sitemap.xml has invalid XML: {e}")
            print(f"   ❌ Invalid XML: {e}")
    else:
        issues.append("❌ sitemap.xml not found")
        print("   ❌ Not found")
    
    # Check 3: URL count validation
    print("\n📋 CHECK 3: URL Count Analysis")
    total_urls = 0
    tool_pages = list(Path(f"{WORKSPACE}/tools").rglob("*.html"))
    total_urls = len(tool_pages)
    
    print(f"   📊 Found {total_urls} tool HTML files")
    
    # Count URLs in sitemaps
    sitemap_url_count = 0
    for sm_file in ['sitemap-core.xml', 'sitemap-categories.xml', 'sitemap-guides.xml', 'sitemap-tools-1.xml']:
        sm_path = f"{WORKSPACE}/{sm_file}"
        if os.path.exists(sm_path):
            try:
                tree = ET.parse(sm_path)
                urls = tree.getroot().findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url')
                sitemap_url_count += len(urls)
            except:
                pass
    
    print(f"   📊 Total URLs in sitemaps: {sitemap_url_count}")
    
    if sitemap_url_count > 0:
        passed.append(f"✅ Sitemaps contain {sitemap_url_count} URLs")
    else:
        warnings.append("⚠️  No URLs found in sitemaps")
        print("   ⚠️  Warning: No URLs found")
    
    # Check 4: Common Google Search Console errors
    print("\n📋 CHECK 4: Common GSC Error Prevention")
    
    # Check for proper XML declaration
    with open(sitemap_path, 'r', encoding='utf-8') as f:
        first_line = f.readline().strip()
        if first_line.startswith('<?xml'):
            passed.append("✅ Proper XML declaration")
            print("   ✅ Proper XML declaration found")
        else:
            issues.append("❌ Missing XML declaration")
            print("   ❌ Missing XML declaration")
    
    # Check for UTF-8 encoding
    if 'encoding="UTF-8"' in first_line or "encoding='UTF-8'" in first_line or 'encoding="utf-8"' in first_line:
        passed.append("✅ UTF-8 encoding declared")
        print("   ✅ UTF-8 encoding declared")
    else:
        warnings.append("⚠️  UTF-8 encoding not explicitly declared")
        print("   ⚠️  UTF-8 encoding not explicit")
    
    # Check namespace
    with open(sitemap_path, 'r') as f:
        content = f.read()
        if 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' in content:
            passed.append("✅ Correct sitemap namespace")
            print("   ✅ Correct sitemap namespace")
        else:
            issues.append("❌ Missing or incorrect namespace")
            print("   ❌ Missing/incorrect namespace")
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"\n✅ Passed: {len(passed)}")
    print(f"⚠️  Warnings: {len(warnings)}")
    print(f"❌ Issues: {len(issues)}")
    
    if issues:
        print("\n🔴 CRITICAL ISSUES TO FIX:")
        for issue in issues:
            print(f"   {issue}")
    
    if warnings:
        print("\n🟡 WARNINGS:")
        for warning in warnings:
            print(f"   {warning}")
    
    if not issues and not warnings:
        print("\n🎉 ALL CHECKS PASSED! Your sitemaps are ready for Google Search Console.")
        print("\n📝 NEXT STEPS:")
        print(f"   1. Upload all files to: {BASE_URL}/")
        print(f"   2. Submit to GSC: {BASE_URL}/sitemap.xml")
        print("   3. Wait 24-48 hours for indexing")
        print("   4. Monitor Coverage report in GSC")
    
    return len(issues) == 0

if __name__ == '__main__':
    success = check_sitemap_accessibility()
    exit(0 if success else 1)
