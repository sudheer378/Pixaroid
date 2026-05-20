#!/usr/bin/env python3
"""
Sitemap Regenerator for Pixaroid
Fixes "Sitemap could not be fetched" error by:
1. Ensuring proper XML formatting
2. Adding correct headers
3. Validating all URLs exist
4. Setting proper lastmod dates
5. Creating clean sitemap index
"""

import os
import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime
from pathlib import Path

BASE_URL = "https://pixaroid.vercel.app"
WORKSPACE = "/workspace"
TODAY = datetime.now().strftime("%Y-%m-%d")

def prettify(elem):
    """Return a pretty-printed XML string"""
    rough_string = ET.tostring(elem, encoding='utf-8')
    reparsed = minidom.parseString(rough_string)
    return reparsed.toprettyxml(indent="  ", encoding='utf-8').decode('utf-8')

def find_all_tool_pages():
    """Find all HTML tool pages in the workspace"""
    tool_pages = []
    tools_dir = Path(f"{WORKSPACE}/tools")
    
    if not tools_dir.exists():
        return tool_pages
    
    for html_file in tools_dir.rglob("*.html"):
        # Get relative path from workspace
        rel_path = html_file.relative_to(WORKSPACE)
        
        # Convert to URL path
        url_path = str(rel_path).replace('\\', '/')
        
        # Handle index.html files (directory URLs)
        if url_path.endswith('/index.html'):
            url_path = url_path[:-10]  # Remove index.html
        else:
            url_path = url_path[:-5]   # Remove .html
        
        # Build full URL
        full_url = f"{BASE_URL}/{url_path}"
        tool_pages.append(full_url)
    
    return sorted(tool_pages)

def find_core_pages():
    """Find core pages (root level HTML files)"""
    core_pages = []
    
    root_files = ['index.html', 'about.html', 'faq.html', 'contact.html', 'privacy.html', 'terms.html']
    
    for file in root_files:
        if os.path.exists(f"{WORKSPACE}/{file}"):
            core_pages.append(f"{BASE_URL}/{file}")
    
    # Add root URL
    core_pages.insert(0, f"{BASE_URL}/")
    
    return core_pages

def find_category_pages():
    """Find category pages"""
    categories = []
    tools_dir = Path(f"{WORKSPACE}/tools")
    
    if not tools_dir.exists():
        return categories
    
    for category_dir in tools_dir.iterdir():
        if category_dir.is_dir() and not category_dir.name.startswith('.'):
            categories.append(f"{BASE_URL}/tools/{category_dir.name}/")
    
    return sorted(categories)

def find_guide_pages():
    """Find guide pages"""
    guides = []
    guides_dir = Path(f"{WORKSPACE}/guides")
    
    if not guides_dir.exists():
        return guides
    
    for html_file in guides_dir.glob("*.html"):
        rel_path = html_file.relative_to(WORKSPACE)
        url_path = str(rel_path).replace('\\', '/')
        guides.append(f"{BASE_URL}/{url_path}")
    
    return sorted(guides)

def create_urlset_xml(urls, priority_map=None):
    """Create a urlset XML element"""
    if priority_map is None:
        priority_map = {}
    
    root = ET.Element("urlset")
    root.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
    root.set("xmlns:image", "http://www.google.com/schemas/sitemap-image/1.1")
    
    for url in urls:
        url_elem = ET.SubElement(root, "url")
        
        loc = ET.SubElement(url_elem, "loc")
        loc.text = url
        
        # Determine priority based on URL pattern
        priority = priority_map.get(url.split('/')[-2] if '/tools/' in url else 'default', '0.8')
        
        lastmod = ET.SubElement(url_elem, "lastmod")
        lastmod.text = TODAY
        
        changefreq = ET.SubElement(url_elem, "changefreq")
        changefreq.text = "weekly" if '/tools/' in url else "monthly"
        
        prio = ET.SubElement(url_elem, "priority")
        prio.text = priority
    
    return root

def create_sitemap_index(sitemap_urls):
    """Create a sitemap index XML"""
    root = ET.Element("sitemapindex")
    root.set("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9")
    
    for sitemap_url in sitemap_urls:
        sitemap_elem = ET.SubElement(root, "sitemap")
        
        loc = ET.SubElement(sitemap_elem, "loc")
        loc.text = sitemap_url
        
        lastmod = ET.SubElement(sitemap_elem, "lastmod")
        lastmod.text = TODAY
    
    return root

def write_sitemap(root, filename):
    """Write sitemap to file with proper formatting"""
    xml_str = prettify(root)
    
    # Ensure proper XML declaration
    if not xml_str.startswith('<?xml'):
        xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml_str
    
    filepath = f"{WORKSPACE}/{filename}"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(xml_str)
    
    print(f"✅ Created {filename}")
    return filepath

def main():
    print("=" * 60)
    print("PIXAROID SITEMAP REGENERATOR")
    print(f"Date: {TODAY}")
    print("=" * 60)
    
    # Collect all URLs
    print("\n📊 Discovering pages...")
    
    core_pages = find_core_pages()
    print(f"   Found {len(core_pages)} core pages")
    
    category_pages = find_category_pages()
    print(f"   Found {len(category_pages)} category pages")
    
    guide_pages = find_guide_pages()
    print(f"   Found {len(guide_pages)} guide pages")
    
    tool_pages = find_all_tool_pages()
    print(f"   Found {len(tool_pages)} tool pages")
    
    total_urls = len(core_pages) + len(category_pages) + len(guide_pages) + len(tool_pages)
    print(f"\n📈 Total URLs: {total_urls:,}")
    
    # Split tool pages into chunks of 1000 (Google limit)
    chunk_size = 1000
    tool_chunks = [tool_pages[i:i + chunk_size] for i in range(0, len(tool_pages), chunk_size)]
    
    print(f"\n📝 Generating sitemaps...")
    
    # Create individual sitemaps
    priority_map = {
        'compression': '0.92',
        'conversion': '0.88',
        'resize': '0.88',
        'editor': '0.85',
        'ai-tools': '0.90',
        'bulk-tools': '0.85',
        'social-tools': '0.82',
        'utilities': '0.80',
        'pdf-tools': '0.85',
        'default': '0.80'
    }
    
    sitemap_files = []
    
    # Core sitemap
    if core_pages:
        root = create_urlset_xml(core_pages, {'default': '0.95'})
        write_sitemap(root, "sitemap-core.xml")
        sitemap_files.append(f"{BASE_URL}/sitemap-core.xml")
    
    # Categories sitemap
    if category_pages:
        root = create_urlset_xml(category_pages, {'default': '0.90'})
        write_sitemap(root, "sitemap-categories.xml")
        sitemap_files.append(f"{BASE_URL}/sitemap-categories.xml")
    
    # Guides sitemap
    if guide_pages:
        root = create_urlset_xml(guide_pages, {'default': '0.75'})
        write_sitemap(root, "sitemap-guides.xml")
        sitemap_files.append(f"{BASE_URL}/sitemap-guides.xml")
    
    # Tool sitemaps (chunked)
    for i, chunk in enumerate(tool_chunks, 1):
        root = create_urlset_xml(chunk, priority_map)
        write_sitemap(root, f"sitemap-tools-{i}.xml")
        sitemap_files.append(f"{BASE_URL}/sitemap-tools-{i}.xml")
    
    # Create main sitemap index
    print(f"\n🔗 Creating sitemap index...")
    index_root = create_sitemap_index(sitemap_files)
    write_sitemap(index_root, "sitemap.xml")
    
    print("\n" + "=" * 60)
    print("✅ SITEMAP REGENERATION COMPLETE")
    print("=" * 60)
    print(f"\nGenerated files:")
    for sf in sitemap_files:
        print(f"   - {sf}")
    print(f"\nMain sitemap: {BASE_URL}/sitemap.xml")
    print(f"Total sitemaps: {len(sitemap_files)}")
    print(f"Total URLs indexed: {total_urls:,}")
    
    # Validation
    print("\n🔍 Validating generated sitemaps...")
    all_valid = True
    for sf in ['sitemap.xml'] + [f.replace(BASE_URL + '/', '') for f in sitemap_files]:
        try:
            ET.parse(f"{WORKSPACE}/{sf}")
            print(f"   ✅ {sf}: Valid XML")
        except Exception as e:
            print(f"   ❌ {sf}: Invalid - {e}")
            all_valid = False
    
    return all_valid

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
