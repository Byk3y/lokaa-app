#!/usr/bin/env node

/**
 * Remove URL Cleanup Script
 * 
 * This script removes the temporary URL cleanup script after it has fixed the refresh loop
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function removeUrlCleanupScript() {
  console.log('🧹 [UrlCleanup] Removing temporary URL cleanup script...');
  
  // Remove the script file
  const scriptPath = path.join(__dirname, '../public/url-cleanup.js');
  if (fs.existsSync(scriptPath)) {
    fs.unlinkSync(scriptPath);
    console.log('✅ Deleted url-cleanup.js');
  }
  
  // Remove the script tag from index.html
  const indexPath = path.join(__dirname, '../index.html');
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    if (content.includes('url-cleanup.js')) {
      content = content.replace('    <script src="/url-cleanup.js"></script>\n', '');
      fs.writeFileSync(indexPath, content);
      console.log('✅ Removed script tag from index.html');
    }
  }
  
  console.log('✅ [UrlCleanup] Cleanup complete - app should be back to normal');
}

// Execute
try {
  removeUrlCleanupScript();
} catch (error) {
  console.error('❌ [UrlCleanup] Failed:', error);
  process.exit(1);
} 