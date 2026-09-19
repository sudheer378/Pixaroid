/**
 * Pixaroid — Tools Grid Renderer
 * Dynamically populates the homepage tools grid with available tools
 */

import TOOLS_CONFIG from '/config/tools-config.js';

const CATEGORY_NAMES = {
  'compression': 'Compress',
  'conversion': 'Convert',
  'resize': 'Resize',
  'ai-tools': 'AI Tools',
  'editor': 'Editor',
  'social-tools': 'Social Tools',
  'utilities': 'Utilities',
  'pdf-tools': 'PDF',
  'international': 'International'
};

const CATEGORY_ICONS = {
  'compression': '🗜️',
  'conversion': '🔄',
  'resize': '📐',
  'ai-tools': '🤖',
  'editor': '✏️',
  'social-tools': '📱',
  'utilities': '🛠️',
  'pdf-tools': '📄',
  'international': '🌍'
};

export function renderToolsGrid() {
  const grid = document.getElementById('tools-grid');
  if (!grid) return;

  const toolsByCategory = groupToolsByCategory();
  grid.innerHTML = '';

  for (const [category, tools] of Object.entries(toolsByCategory)) {
    const section = createCategorySection(category, tools);
    grid.appendChild(section);
  }
}

function groupToolsByCategory() {
  const grouped = {};
  
  TOOLS_CONFIG.forEach(tool => {
    const cat = tool.category || 'utilities';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(tool);
  });
  
  return grouped;
}

function createCategorySection(category, tools) {
  const section = document.createElement('div');
  section.className = 'tools-category';
  
  const categoryName = CATEGORY_NAMES[category] || category;
  const categoryIcon = CATEGORY_ICONS[category] || '🔧';
  
  section.innerHTML = `
    <div class="category-header">
      <h3><span class="category-icon">${categoryIcon}</span> ${categoryName}</h3>
    </div>
    <div class="category-tools">
      ${tools.map(tool => createToolCard(tool)).join('')}
    </div>
  `;
  
  return section;
}

function createToolCard(tool) {
  const slug = tool.slug || '';
  const title = tool.title || 'Unknown Tool';
  const category = tool.category || 'utilities';
  
  return `
    <a href="/tools/${category}/${slug}/" class="tool-card" data-slug="${slug}">
      <div class="tool-card-content">
        <h4 class="tool-title">${title}</h4>
        <p class="tool-description">Process images directly in your browser</p>
      </div>
    </a>
  `;
}

export function initToolsGrid() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderToolsGrid);
  } else {
    renderToolsGrid();
  }
}
