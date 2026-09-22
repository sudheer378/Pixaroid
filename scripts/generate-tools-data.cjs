const fs = require('fs');
const path = require('path');

const toolsDir = '/workspace/tools';
const categories = ['compression', 'conversion', 'resize', 'ai-tools', 'editor', 'social-tools', 'utilities', 'pdf-tools', 'international'];

let allTools = [];
let categoryCounts = {};

categories.forEach(category => {
  const categoryDir = path.join(toolsDir, category);
  if (!fs.existsSync(categoryDir)) {
    categoryCounts[category] = 0;
    return;
  }
  
  // Get all subdirectories (each tool is in its own folder)
  const toolDirs = fs.readdirSync(categoryDir).filter(item => {
    const itemPath = path.join(categoryDir, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  categoryCounts[category] = toolDirs.length;
  
  toolDirs.forEach(toolDir => {
    const toolPath = path.join(categoryDir, toolDir);
    const indexPath = path.join(toolPath, 'index.html');
    
    if (!fs.existsSync(indexPath)) return;
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Extract title
    const titleMatch = content.match(/<title>([^<]+)<\/title>/);
    let name = titleMatch ? titleMatch[1].replace(/\s*—\s*Free Online.*$/i, '').replace(/\s*\|.*$/i, '').trim() : toolDir;
    
    // Extract description
    const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    let desc = descMatch ? descMatch[1].substring(0, 120) : '';
    
    // Extract tags from keywords
    const keywordsMatch = content.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i);
    let tags = [];
    if (keywordsMatch) {
      tags = keywordsMatch[1].split(',').slice(0, 3).map(t => t.trim());
    } else {
      tags = name.toLowerCase().split(' ').slice(0, 3);
    }
    
    allTools.push({
      name: name,
      category: category,
      desc: desc,
      path: `/tools/${category}/${toolDir}/`,
      tags: tags
    });
  });
});

// Sort by category then name
allTools.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.name.localeCompare(b.name);
});

console.log(JSON.stringify(allTools, null, 2));
