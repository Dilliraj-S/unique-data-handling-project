import fs from 'fs';
import path from 'path';

/**
 * Section Generator Service
 * Automatically creates page files when a section is added
 * Similar to Laravel Hello Kuppam's placeholder page system
 */
class SectionGenerator {
  constructor() {
    this.baseFrontendPath = path.join(process.cwd(), 'src', 'resources', 'views', 'pages');
  }

  /**
   * Generate a placeholder page for a new section
   * @param {string} system - System name (central, business, user)
   * @param {string} moduleName - Module name (e.g., 'developer-mode')
   * @param {string} sectionName - Section name (e.g., 'Token Management')
   * @param {string} sectionUrl - Section URL (e.g., '/central/developer-mode/token-management')
   * @param {string} sectionIcon - Icon name (e.g., 'cil-shield-alt')
   * @returns {object} Generation result
   */
  async generateSectionPage(system, moduleName, sectionName, sectionUrl, sectionIcon = 'cilFile') {
    try {
      console.log(`🎨 Generating section page: ${system}/${moduleName}/${sectionName}`);

      // 1. Parse module name from URL
      // URL format: /central/developer-mode/token-management
      const urlParts = sectionUrl.split('/').filter(Boolean);
      
      if (urlParts.length < 3) {
        console.warn(`⚠️ Invalid URL format: ${sectionUrl}`);
        return { success: false, message: 'Invalid URL format' };
      }

      const systemFromUrl = urlParts[0]; // 'central'
      const moduleFromUrl = urlParts[1]; // 'developer-mode'
      const sectionFromUrl = urlParts[2]; // 'token-management'

   
      const moduleFolder = moduleFromUrl.toLowerCase();
      const sectionPath = path.join(
        this.baseFrontendPath,
        systemFromUrl,
        moduleFolder
      );

      if (!fs.existsSync(sectionPath)) {
        fs.mkdirSync(sectionPath, { recursive: true });
        console.log(`📁 Created directory: src/resources/views/pages/${systemFromUrl}/${moduleFolder}`);
      }

      // 3. Generate the page file
      // Use lowercase filename to match URL pattern (e.g., workflows.js, token-management.js)
      const sectionFileName = sectionFromUrl.toLowerCase() + '.js';
      const pagePath = path.join(sectionPath, sectionFileName);

      // Check if file already exists
      if (fs.existsSync(pagePath)) {
        console.log(`⚠️ Page already exists: ${sectionFileName}`);
        return {
          success: true,
          message: 'Page already exists',
          path: pagePath,
          alreadyExists: true
        };
      }

      // 4. Generate the placeholder page content
      const pageContent = this.getPlaceholderPageTemplate(
        sectionName,
        sectionFromUrl,
        sectionIcon,
        systemFromUrl,
        moduleFromUrl
      );

      // 5. Write the file
      fs.writeFileSync(pagePath, pageContent, 'utf-8');
      console.log(`✅ Created page: ${sectionFileName}`);

      // 6. Auto-generate route for this section
      let routeResult = null;
      try {
        console.log(`🛣️ Auto-generating route for: ${sectionUrl}`);
        const RouteGeneratorModule = await import('./RouteGenerator.js');
        const RouteGenerator = RouteGeneratorModule.default;
        const routeGenerator = new RouteGenerator();
        
        routeResult = await routeGenerator.generateRoute(
          systemFromUrl,
          moduleFromUrl,
          sectionName,
          sectionUrl,
          sectionFromUrl
        );

        if (routeResult && routeResult.success) {
          console.log(`✅ Route generated: ${sectionUrl}`);
        } else {
          console.warn(`⚠️ Route generation failed: ${routeResult?.message || 'Unknown error'}`);
        }
      } catch (routeError) {
        // Don't fail page generation if route generation fails
        console.error(`❌ Route generation error (page still created):`, routeError);
        routeResult = {
          success: false,
          message: routeError.message
        };
      }

      return {
        success: true,
        message: 'Section page created successfully',
        path: pagePath,
        fileName: sectionFileName,
        fullPath: `src/resources/views/pages/${systemFromUrl}/${moduleFolder}/${sectionFileName}`,
        routeGenerated: routeResult?.success || false,
        routeResult: routeResult
      };

    } catch (error) {
      console.error(`❌ Error generating section page:`, error);
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Convert kebab-case to Title Case
   * @param {string} str - kebab-case string
   * @returns {string} Title Case string
   * @example kebabToTitleCase('token-management') => 'Token Management'
   */
  kebabToTitleCase(str) {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Convert kebab-case to PascalCase (for component names)
   * @param {string} str - kebab-case string
   * @returns {string} PascalCase string
   * @example kebabToPascalCase('token-management') => 'TokenManagement'
   */
  kebabToPascalCase(str) {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Get the default placeholder page template
   * Similar to Hello Kuppam's "Just a Display Page" - no table, just placeholder content
   */
  getPlaceholderPageTemplate(sectionName, sectionSlug, sectionIcon, system, module) {
    // Component name should be PascalCase for React (internal)
    const componentName = this.kebabToPascalCase(sectionSlug);
    const displayName = sectionName || this.kebabToTitleCase(sectionSlug);
    // Filename will be lowercase to match URL pattern (e.g., workflows.js)
    const fileName = sectionSlug.toLowerCase() + '.js';
    
    return `import React from 'react';
import {
  CCard,
  CCardBody,
  CCol,
  CRow,
  CButton
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilArrowLeft, cilHome } from '@coreui/icons';
import { useNavigate } from 'react-router-dom';

/**
 * ${displayName} Page
 * Auto-generated placeholder by SectionGenerator
 * 
 * System: ${system}
 * Module: ${module}
 * Section: ${sectionSlug}
 * 
 * 📝 MODIFY THIS PAGE AS NEEDED
 * This is a placeholder page similar to Laravel Hello Kuppam's "Just a Display Page"
 * You can replace this entire content with your actual page implementation
 */
const ${componentName} = () => {
  const navigate = useNavigate();

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardBody>
              {/* Placeholder Content - Just like Hello Kuppam */}
              <div 
                className="d-flex flex-column align-items-center justify-content-center text-center w-100" 
                style={{ minHeight: 'calc(100vh - 300px)' }}
              >
                {/* Empty State Image */}
                <img 
                  src="/errors/empty.svg" 
                  alt="Empty Page" 
                  className="img-fluid mb-4" 
                  style={{ maxWidth: '300px', opacity: 0.6 }}
                />
                
                {/* Title */}
                <h1 className="h3 mb-3 fw-bold" style={{ color: '#2c3e50' }}>
                  Just a Display Page
                </h1>
                
                {/* Description */}
                <p className="text-muted mb-2" style={{ maxWidth: '600px', fontSize: '16px' }}>
                  This page is intentionally left empty and serves only as a display case or placeholder.<br />
                  There's no content here to interact with right now.
                </p>
                
                <p className="text-muted mb-4" style={{ maxWidth: '600px', fontSize: '14px' }}>
                  You can modify this page by editing:<br />
                  <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
                    src/resources/views/pages/${system}/${module}/${fileName}
                  </code>
                </p>
                
                {/* Action Buttons */}
                <div className="d-flex gap-3 mt-3">
                  <CButton 
                    color="secondary" 
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    <CIcon icon={cilArrowLeft} className="me-2" />
                    Go Back
                  </CButton>
                  
                  <CButton 
                    color="primary"
                    onClick={() => navigate('/dashboard')}
                  >
                    <CIcon icon={cilHome} className="me-2" />
                    Explore Dashboard
                  </CButton>
                </div>

                {/* Page Info Badge */}
                <div className="mt-5 p-3 bg-light rounded" style={{ maxWidth: '500px' }}>
                  <small className="text-muted">
                    <strong>Page Info:</strong><br />
                    System: <code>${system}</code> | 
                    Module: <code>${module}</code> | 
                    Section: <code>${sectionSlug}</code>
                  </small>
                </div>
              </div>

              {/* 
                ************************************************************************************************
                *                                                                                              *
                *                             >>> MODIFY THIS SECTION <<<                                      *
                *                                                                                              *
                *  Replace the content above with your actual page implementation.                            *
                *  You can create tables, forms, charts, or any other React components here.                  *
                *                                                                                              *
                *  Example:                                                                                    *
                *  - Add a CTable to display data                                                             *
                *  - Add forms with CForm components                                                          *
                *  - Add charts with Chart.js                                                                 *
                *  - Connect to API endpoints to fetch real data                                              *
                *                                                                                              *
                ************************************************************************************************
              */}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default ${componentName};
`;
  }

  /**
   * Delete a section page
   * @param {string} system - System name
   * @param {string} moduleName - Module name
   * @param {string} sectionName - Section name
   */
  async deleteSectionPage(system, moduleName, sectionName) {
    try {
      const moduleFolder = moduleName.toLowerCase();
      // Use lowercase filename to match URL pattern
      const sectionFileName = sectionName.toLowerCase() + '.js';
      
      const pagePath = path.join(
        this.baseFrontendPath,
        system,
        moduleFolder,
        sectionFileName
      );

      if (fs.existsSync(pagePath)) {
        fs.unlinkSync(pagePath);
        console.log(`🗑️ Deleted section page: ${sectionFileName}`);
        return { success: true, message: 'Page deleted successfully' };
      } else {
        console.log(`⚠️ Page not found: ${sectionFileName}`);
        return { success: false, message: 'Page not found' };
      }
    } catch (error) {
      console.error(`❌ Error deleting section page:`, error);
      return { success: false, message: error.message };
    }
  }
}

export default SectionGenerator;
