#!/usr/bin/env python3
"""Generate category landing pages for all tool categories."""

import json
import re
from pathlib import Path

# Read the tools array from index.html
with open('/workspace/index.html', 'r') as f:
    content = f.read()

# Find the TOOLS array section - note no space after TOOLS
start_marker = 'var TOOLS=['
start = content.find(start_marker)
if start == -1:
    print("Could not find TOOLS array")
    exit(1)

# Extract just the array content
content = content[start + len(start_marker):]

# Parse objects manually
objects = []
depth = 0
current = ""
for char in content:
    if char == '{':
        depth += 1
        current += char
    elif char == '}':
        depth -= 1
        current += char
        if depth == 0:
            # Process this object
            obj_str = current.strip().rstrip(',')
            # Replace single quotes with double quotes (but not inside SVG)
            # First protect SVG content
            svg_placeholder = "___SVG_PLACEHOLDER___"
            svgs = []
            def save_svg(m):
                svgs.append(m.group(0))
                return svg_placeholder + str(len(svgs)-1) + "___"
            obj_str = re.sub(r"<svg[^>]*>.*?</svg>", save_svg, obj_str, flags=re.DOTALL)
            
            # Now replace single quotes
            obj_str = obj_str.replace("'", '"')
            
            # Add quotes to keys
            obj_str = re.sub(r'([{,]\s*)(\w+):', r'\1"\2":', obj_str)
            
            # Restore SVGs
            for i, svg in enumerate(svgs):
                obj_str = obj_str.replace(f'{svg_placeholder}{i}___', svg)
            
            try:
                obj = json.loads(obj_str)
                objects.append(obj)
            except Exception as e:
                pass
            current = ""
    elif depth > 0:
        current += char
    
    # Stop after finding enough tools
    if len(objects) > 200:
        break

print(f"Found {len(objects)} tools")

# Category configurations
CATS = {
    'pdf-tools': {'name': 'PDF', 'h1': 'PDF Tools', 'desc': 'Free online PDF tools. Compress, merge, split, rotate, edit, and convert PDF files.', 'hero_desc': 'Complete suite of PDF tools for editing, converting, and optimizing your documents.', 'icon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'},
    'compression': {'name': 'Compression', 'h1': 'Image Compression Tools', 'desc': 'Compress images online free. Reduce JPEG, PNG, WebP file sizes without quality loss.', 'hero_desc': 'Reduce image file sizes by up to 90% while maintaining visual quality.', 'icon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'},
    'conversion': {'name': 'Conversion', 'h1': 'Image Format Converter', 'desc': 'Convert images between formats online free. JPG to PNG, PNG to WebP, HEIC to JPG, and more.', 'hero_desc': 'Transform images between any format instantly.', 'icon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>'},
    'resize': {'name': 'Resize', 'h1': 'Image Resize Tools', 'desc': 'Resize images online free. Change dimensions, crop, scale for social media.', 'hero_desc': 'Resize images to exact pixels or percentages.', 'icon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'},
    'ai-tools': {'name': 'AI Tools', 'h1': 'AI Image Tools', 'desc': 'AI-powered image tools. Remove backgrounds, enhance photos, upscale images, extract text with OCR.', 'hero_desc': 'Harness AI to transform your images.', 'icon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75z"/></svg>'},
    'editor': {'name': 'Editor', 'h1': 'Image Editor Tools', 'desc': 'Free online image editor. Crop, rotate, flip, add text, watermarks, filters and effects.', 'hero_desc': 'Edit images with professional tools.', 'icon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'},
    'social-tools': {'name': 'Social Media', 'h1': 'Social Media Image Tools', 'desc': 'Resize and optimize images for social media. Instagram, Facebook, Twitter, LinkedIn, TikTok presets.', 'hero_desc': 'One-click resize for all social platforms.', 'icon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>'},
    'utilities': {'name': 'Utilities', 'h1': 'Image Utilities', 'desc': 'Essential image utilities. View metadata, extract colors, check dimensions, convert to Base64.', 'hero_desc': 'Quick utilities for image analysis and conversion.', 'icon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'},
    'bulk-tools': {'name': 'Bulk Processing', 'h1': 'Bulk Image Tools', 'desc': 'Process hundreds of images at once. Bulk compress, resize, convert, watermark, rotate, and flip.', 'hero_desc': 'Batch process up to 100 images simultaneously.', 'icon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>'}
}

# Read template
with open('/workspace/templates/category-template.html', 'r') as f:
    template = f.read()

# Generate pages
for cat_id, cat_info in CATS.items():
    cat_tools = [t for t in objects if t.get('c') == cat_id]
    
    if not cat_tools:
        print(f"No tools found for category: {cat_id}")
        continue
    
    # Create directory
    dir_path = Path(f'/workspace/tools/{cat_id}')
    dir_path.mkdir(exist_ok=True)
    
    # Prepare tools JSON
    tools_json = json.dumps(cat_tools)
    
    # Replace placeholders
    html = template
    html = html.replace('{{DESC}}', cat_info['desc'])
    html = html.replace('{{KEYWORDS}}', f"{cat_info['name'].lower()} tools, image tools, free online tools, pixaroid")
    html = html.replace('{{CANONICAL}}', f'https://pixaroid.vercel.app/tools/{cat_id}/')
    html = html.replace('{{OG_TITLE}}', f'{cat_info["h1"]} | Pixaroid')
    html = html.replace('{{OG_DESC}}', cat_info['desc'])
    html = html.replace('{{TITLE}}', f'{cat_info["h1"]} | Pixaroid')
    html = html.replace('{{H1}}', cat_info['h1'])
    html = html.replace('{{HERO_DESC}}', cat_info['hero_desc'])
    html = html.replace('{{ICON}}', cat_info['icon'])
    html = html.replace('{{CATEGORY_NAME}}', cat_info['name'])
    html = html.replace('{{COUNT}}', str(len(cat_tools)))
    html = html.replace('{{TOOLS_JSON}}', tools_json)
    
    # Write file
    output_path = dir_path / 'index.html'
    with open(output_path, 'w') as f:
        f.write(html)
    
    print(f"Created: {output_path} ({len(cat_tools)} tools)")

print("\nDone! Category pages generated.")
