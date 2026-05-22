#!/usr/bin/env node

/**
 * Pixaroid Tool Updater Script
 * 
 * Features:
 * 1. Injects Smart Upload Engine into all tool HTML files
 * 2. Adds proper drop-zone UI elements if missing
 * 3. Configures category-specific restrictions (PDF vs Image)
 * 4. Fixes 404 errors by ensuring proper initialization code
 * 5. Adds Sejda/iLovePDF style professional UI
 */

const fs = require('fs');
const path = require('path');

const TOOLS_DIR = '/workspace/tools';
const SMART_UPLOAD_SCRIPT = '<script src="/js/smart-upload.js" defer></script>';
const INIT_SCRIPT = `
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Auto-detect category from URL path
            const pathParts = window.location.pathname.split('/').filter(p => p);
            const category = pathParts[1] || 'general'; // e.g., 'compression', 'pdf-tools'
            
            // Initialize Smart Upload with category enforcement
            window.initSmartUpload({
                dropZone: document.getElementById('drop-zone'),
                fileInput: document.getElementById('file-input'),
                fileListContainer: document.getElementById('file-list'),
                processBtn: document.getElementById('process-btn'),
                category: category,
                maxFiles: 50,
                maxSize: 100 * 1024 * 1024 // 100MB
            });
            
            console.log('Smart Upload initialized for category:', category);
        });
    </script>
`;

const DROPZONE_HTML = `
        <div id="drop-zone" class="drop-zone">
            <div class="drop-content">
                <svg class="upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <h3>Drag & Drop Files Here</h3>
                <p>or click to browse</p>
                <p class="file-types">Supports: <span class="allowed-types">Auto-detected</span></p>
                <input type="file" id="file-input" multiple style="display:none">
            </div>
        </div>
        <div id="file-list" class="file-list"></div>
        <button id="process-btn" class="process-btn" disabled>Upload Files to Start</button>
`;

const STYLES = `
<style>
    .drop-zone {
        border: 2px dashed #4b5563;
        border-radius: 12px;
        padding: 48px 24px;
        text-align: center;
        background: #1f2937;
        transition: all 0.3s ease;
        cursor: pointer;
        margin-bottom: 24px;
    }
    .drop-zone.drag-over {
        border-color: #3b82f6;
        background: #1e3a8a;
        transform: scale(1.02);
    }
    .drop-zone:hover {
        border-color: #6b7280;
    }
    .upload-icon {
        color: #6b7280;
        margin-bottom: 16px;
    }
    .drop-content h3 {
        margin: 0 0 8px 0;
        color: #f3f4f6;
        font-size: 20px;
    }
    .drop-content p {
        margin: 4px 0;
        color: #9ca3af;
        font-size: 14px;
    }
    .file-types {
        font-size: 12px;
        color: #6b7280;
        margin-top: 12px;
    }
    .file-list {
        margin-bottom: 24px;
    }
    .file-item {
        display: flex;
        align-items: center;
        background: #1f2937;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 8px;
        gap: 12px;
    }
    .file-icon {
        font-size: 24px;
    }
    .file-info {
        flex: 1;
        min-width: 0;
    }
    .file-name {
        color: #f3f4f6;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .file-size {
        color: #9ca3af;
        font-size: 12px;
        margin-top: 2px;
    }
    .remove-file {
        background: none;
        border: none;
        color: #ef4444;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background 0.2s;
    }
    .remove-file:hover {
        background: rgba(239, 68, 68, 0.1);
    }
    .process-btn {
        width: 100%;
        padding: 16px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }
    .process-btn:hover:not(:disabled) {
        background: #2563eb;
        transform: translateY(-1px);
    }
    .process-btn:disabled {
        background: #4b5563;
        cursor: not-allowed;
        opacity: 0.6;
    }
    .allowed-types {
        color: #3b82f6;
        font-weight: 500;
    }
</style>
`;

function getCategoryFromPath(filePath) {
    const parts = filePath.split(path.sep);
    const toolsIndex = parts.indexOf('tools');
    if (toolsIndex >= 0 && parts.length > toolsIndex + 1) {
        return parts[toolsIndex + 1]; // e.g., 'compression', 'pdf-tools'
    }
    return 'general';
}

function updateToolFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const category = getCategoryFromPath(filePath);
    
    let updated = false;
    
    // 1. Add Smart Upload Script if missing
    if (!content.includes('smart-upload.js')) {
        // Insert before closing body tag or after other scripts
        if (content.includes('</body>')) {
            content = content.replace('</body>', `${SMART_UPLOAD_SCRIPT}\n</body>`);
            updated = true;
        } else if (content.includes('</html>')) {
            content = content.replace('</html>', `${SMART_UPLOAD_SCRIPT}\n</html>`);
            updated = true;
        }
    }
    
    // 2. Add Styles if missing
    if (!content.includes('.drop-zone') && !content.includes('class="drop-zone"')) {
        if (content.includes('</head>')) {
            content = content.replace('</head>', `${STYLES}\n</head>`);
            updated = true;
        }
    }
    
    // 3. Add Drop Zone HTML if missing
    if (!content.includes('id="drop-zone"')) {
        // Try to insert into tool-container or main container
        const containerPatterns = [
            /(<div[^>]*id="tool-container"[^>]*>)/,
            /(<div[^>]*class="container"[^>]*>)/,
            /(<main[^>]*>)/,
            /(<div[^>]*id="app"[^>]*>)/
        ];
        
        let inserted = false;
        for (const pattern of containerPatterns) {
            if (pattern.test(content)) {
                content = content.replace(pattern, `$1\n${DROPZONE_HTML}`);
                inserted = true;
                updated = true;
                break;
            }
        }
        
        // Fallback: insert before first </div> after body
        if (!inserted && content.includes('<body>')) {
            const bodyStart = content.indexOf('<body>');
            const firstDivClose = content.indexOf('</div>', bodyStart);
            if (firstDivClose > bodyStart) {
                content = content.slice(0, firstDivClose) + '\n' + DROPZONE_HTML + '\n' + content.slice(firstDivClose);
                updated = true;
            }
        }
    }
    
    // 4. Add Initialization Script if missing
    if (!content.includes('initSmartUpload')) {
        if (content.includes('</body>')) {
            content = content.replace('</body>', `${INIT_SCRIPT}\n</body>`);
            updated = true;
        }
    }
    
    // 5. Update allowed types text based on category
    if (category.includes('pdf')) {
        content = content.replace('Auto-detected', 'PDF files only');
        updated = true;
    } else if (['compression', 'resize', 'convert', 'editor'].includes(category)) {
        content = content.replace('Auto-detected', 'Images (JPG, PNG, WebP, GIF)');
        updated = true;
    }
    
    if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated: ${filePath}`);
        return true;
    }
    
    return false;
}

function getAllToolFiles() {
    const files = [];
    
    function walkDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                walkDir(fullPath);
            } else if (entry.isFile() && entry.name === 'index.html') {
                files.push(fullPath);
            }
        }
    }
    
    walkDir(TOOLS_DIR);
    return files;
}

// Main execution
console.log('🚀 Starting Pixaroid Tool Upgrade...\n');

const toolFiles = getAllToolFiles();
console.log(`Found ${toolFiles.length} tool files to process.\n`);

let updatedCount = 0;
let errorCount = 0;

for (const file of toolFiles) {
    try {
        if (updateToolFile(file)) {
            updatedCount++;
        }
    } catch (error) {
        console.error(`✗ Error updating ${file}:`, error.message);
        errorCount++;
    }
}

console.log('\n✅ Upgrade Complete!');
console.log(`   Total files: ${toolFiles.length}`);
console.log(`   Updated: ${updatedCount}`);
console.log(`   Errors: ${errorCount}`);
console.log(`\nFeatures added:`);
console.log(`   ✓ Smart file type detection (Magic Numbers)`);
console.log(`   ✓ Category enforcement (PDF vs Image)`);
console.log(`   ✓ Professional drag & drop UI`);
console.log(`   ✓ Batch processing support (50 files)`);
console.log(`   ✓ 100MB file size limit`);
console.log(`   ✓ Auto-initialization on page load`);
