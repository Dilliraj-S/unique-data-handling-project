import fs from 'fs';
import path from 'path';

/**
 * Route Generator Service
 * Automatically adds routes to routes/index.js when sections are created
 */
class RouteGenerator {
  constructor() {
    this.routesFilePath = path.join(process.cwd(), 'src', 'routes', 'index.js');
  }

  /**
   * Generate route for a new section
   * @param {string} system - System name (central, business, user)
   * @param {string} moduleName - Module name (e.g., 'querychain')
   * @param {string} sectionName - Section display name (e.g., 'Workflows')
   * @param {string} sectionUrl - Section URL path (e.g., '/central/querychain/workflows')
   * @param {string} sectionSlug - Section slug (e.g., 'workflows')
   * @returns {object} Generation result
   */
  async generateRoute(system, moduleName, sectionName, sectionUrl, sectionSlug) {
    try {
      console.log(`🛣️ Generating route for: ${sectionUrl}`);

      // Check if routes file exists
      if (!fs.existsSync(this.routesFilePath)) {
        throw new Error(`Routes file not found: ${this.routesFilePath}`);
      }

      // Read the current routes file
      const routesContent = fs.readFileSync(this.routesFilePath, 'utf-8');

      // Check if route already exists
      if (routesContent.includes(`path: '${sectionUrl}'`) || routesContent.includes(`path: "${sectionUrl}"`)) {
        console.log(`⚠️ Route already exists: ${sectionUrl}`);
        return {
          success: true,
          message: 'Route already exists',
          alreadyExists: true
        };
      }

      // Generate component name and import path
      const componentName = this.generateComponentName(sectionSlug);
      const importPath = this.generateImportPath(system, moduleName, sectionSlug);

      // Parse the file to add import and route
      const updatedContent = this.addRouteToFile(
        routesContent,
        componentName,
        importPath,
        sectionUrl,
        sectionName,
        system,
        moduleName
      );

      // Write updated content back to file
      fs.writeFileSync(this.routesFilePath, updatedContent, 'utf-8');
      console.log(`✅ Route added successfully: ${sectionUrl}`);

      return {
        success: true,
        message: 'Route added successfully',
        componentName,
        routePath: sectionUrl,
        filePath: this.routesFilePath
      };

    } catch (error) {
      console.error(`❌ Error generating route:`, error);
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Generate component name from section slug
   * @param {string} sectionSlug - Section slug (e.g., 'workflows')
   * @returns {string} Component name (e.g., 'WorkflowsPage')
   */
  generateComponentName(sectionSlug) {
    return this.kebabToPascalCase(sectionSlug) + 'Page';
  }

  /**
   * Generate import path from system, module, and section
   * @param {string} system - System name
   * @param {string} moduleName - Module name (kebab-case, e.g., 'querychain')
   * @param {string} sectionSlug - Section slug (kebab-case, e.g., 'workflows')
   * @returns {string} Import path
   */
  generateImportPath(system, moduleName, sectionSlug) {
    // Keep module folder name as-is (lowercase, e.g., 'querychain', 'developer')
    // Note: Some modules might be 'Developer Mode' which needs special handling
    const moduleFolder = moduleName.toLowerCase().replace(/\s+/g, '-');
    
    // Use lowercase filename to match URL pattern (e.g., 'workflows' -> 'workflows.js')
    // Component name inside file will be PascalCase, but filename is lowercase
    const sectionFile = sectionSlug.toLowerCase();
    
    return `../resources/views/pages/${system}/${moduleFolder}/${sectionFile}`;
  }

  /**
   * Add route import and entry to routes file
   * @param {string} content - Current file content
   * @param {string} componentName - Component name (e.g., 'WorkflowsPage')
   * @param {string} importPath - Import path
   * @param {string} routePath - Route path (e.g., '/central/querychain/workflows')
   * @param {string} routeName - Route display name (e.g., 'Workflows')
   * @param {string} system - System name
   * @param {string} moduleName - Module name
   * @returns {string} Updated file content
   */
  addRouteToFile(content, componentName, importPath, routePath, routeName, system, moduleName) {
    // 1. Find the insertion point for the import (after last React.lazy import, before Auth Pages)
    const importPattern = /\/\/ Auth Pages/g;
    const importMatch = importPattern.exec(content);
    
    if (!importMatch) {
      throw new Error('Could not find "// Auth Pages" comment to insert import');
    }

    // Generate the import statement
    const systemModuleLabel = this.getSystemModuleLabel(system, moduleName);
    const importStatement = `// ${systemModuleLabel} Pages\nconst ${componentName} = React.lazy(() => {\n  console.log('🔄 Lazy loading ${componentName} component...');\n  return import('${importPath}');\n});\n\n`;

    // Insert import before "// Auth Pages"
    const importInsertionPoint = importMatch.index;
    const beforeImport = content.substring(0, importInsertionPoint);
    const afterImport = content.substring(importInsertionPoint);
    
    // Check if import already exists (different comment section)
    if (beforeImport.includes(componentName)) {
      console.log(`⚠️ Import already exists for ${componentName}`);
    } else {
      content = beforeImport + importStatement + afterImport;
    }

    // 2. Find the insertion point for the route entry (before closing bracket of routes array)
    const routesArrayPattern = /\]\s*$/m;
    const routesMatch = routesArrayPattern.exec(content);
    
    if (!routesMatch) {
      throw new Error('Could not find routes array closing bracket');
    }

    // Generate the route entry
    const routeComment = this.getRouteComment(system, moduleName);
    
    // Check if route already exists
    if (content.includes(`path: '${routePath}'`) || content.includes(`path: "${routePath}"`)) {
      console.log(`⚠️ Route entry already exists for ${routePath}`);
      return content;
    }

    // Check if comment section already exists (e.g., "// Central/QueryChain sections")
    const systemCapitalized = system.charAt(0).toUpperCase() + system.slice(1);
    const moduleCapitalized = this.kebabToTitleCase(moduleName);
    const commentText = `  // ${systemCapitalized}/${moduleCapitalized} sections`;
    const existingCommentIndex = content.indexOf(commentText);
    
    if (existingCommentIndex >= 0) {
      // Insert route after the existing comment
      const insertAfterComment = existingCommentIndex + commentText.length;
      // Find the end of the last route in this section (before next comment or closing bracket)
      const afterComment = content.substring(insertAfterComment);
      // Look for the last route entry before the next comment or closing bracket
      const lines = afterComment.split('\n');
      let insertLineIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Stop at next comment or empty closing bracket line
        if ((line.startsWith('//') && line.includes('sections')) || 
            (line === ']' && i > 0)) {
          insertLineIndex = i;
          break;
        }
        // Stop at closing bracket if no more routes
        if (line === ']' && i === 0) {
          insertLineIndex = 0;
          break;
        }
        insertLineIndex = i + 1;
      }
      
      // Find the actual insert position
      let lineOffset = 0;
      for (let i = 0; i < insertLineIndex; i++) {
        lineOffset += lines[i].length + 1; // +1 for newline
      }
      
      const insertPoint = insertAfterComment + lineOffset;
      const beforeRoute = content.substring(0, insertPoint);
      const afterRoute = content.substring(insertPoint);
      
      // Insert route with proper indentation
      const routeEntry = `  { path: '${routePath}', name: '${routeName}', element: ${componentName} },\n`;
      content = beforeRoute + routeEntry + afterRoute;
    } else {
      // Insert new comment section with route before closing bracket
      const routeEntry = `  ${routeComment}\n  { path: '${routePath}', name: '${routeName}', element: ${componentName} },\n`;

      const routeInsertionPoint = routesMatch.index;
      const beforeRoute = content.substring(0, routeInsertionPoint);
      const afterRoute = content.substring(routeInsertionPoint);

      content = beforeRoute + routeEntry + afterRoute;
    }

    return content;
  }

  /**
   * Get system/module label for import comment
   * @param {string} system - System name
   * @param {string} moduleName - Module name (kebab-case)
   * @returns {string} Label (e.g., 'Central/QueryChain')
   */
  getSystemModuleLabel(system, moduleName) {
    const systemCapitalized = system.charAt(0).toUpperCase() + system.slice(1);
    // Convert kebab-case to Title Case (e.g., 'querychain' -> 'QueryChain', 'developer-mode' -> 'Developer Mode')
    const moduleCapitalized = this.kebabToTitleCase(moduleName);
    return `${systemCapitalized}/${moduleCapitalized}`;
  }

  /**
   * Get route comment based on system and module
   * @param {string} system - System name
   * @param {string} moduleName - Module name (kebab-case)
   * @returns {string} Comment (e.g., '// Central/QueryChain sections')
   */
  getRouteComment(system, moduleName) {
    const systemCapitalized = system.charAt(0).toUpperCase() + system.slice(1);
    // Convert kebab-case to Title Case for comment
    const moduleCapitalized = this.kebabToTitleCase(moduleName);
    return `// ${systemCapitalized}/${moduleCapitalized} sections`;
  }

  /**
   * Convert kebab-case to PascalCase
   * @param {string} str - kebab-case string
   * @returns {string} PascalCase string
   */
  kebabToPascalCase(str) {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Convert kebab-case to Title Case
   * @param {string} str - kebab-case string
   * @returns {string} Title Case string
   */
  kebabToTitleCase(str) {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Remove route for a section
   * @param {string} routePath - Route path to remove
   * @returns {object} Removal result
   */
  async removeRoute(routePath) {
    try {
      if (!fs.existsSync(this.routesFilePath)) {
        throw new Error(`Routes file not found: ${this.routesFilePath}`);
      }

      const routesContent = fs.readFileSync(this.routesFilePath, 'utf-8');

      // Remove route entry
      const routePattern = new RegExp(`  // [^\\n]+\\n  \\{ path: ['"]${routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"], [^}]+\\},\\n`, 'g');
      let updatedContent = routesContent.replace(routePattern, '');

      // Try to remove component import if it's no longer used
      // (This is a simple check - might need more sophisticated detection)
      const componentPattern = new RegExp(`const \\w+Page = React\\.lazy\\([^)]+\\);\\n`, 'g');
      const components = routesContent.match(componentPattern) || [];
      
      // Check if component is still referenced
      for (const component of components) {
        const componentName = component.match(/const (\w+) =/)?.[1];
        if (componentName && !updatedContent.includes(componentName)) {
          // Remove import if not used
          const importPattern = new RegExp(`// [^\\n]+\\nconst ${componentName} = React\\.lazy\\([^)]+\\);\\n\\n`, 'g');
          updatedContent = updatedContent.replace(importPattern, '');
        }
      }

      fs.writeFileSync(this.routesFilePath, updatedContent, 'utf-8');
      console.log(`🗑️ Route removed: ${routePath}`);

      return {
        success: true,
        message: 'Route removed successfully'
      };

    } catch (error) {
      console.error(`❌ Error removing route:`, error);
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }
}

export default RouteGenerator;

