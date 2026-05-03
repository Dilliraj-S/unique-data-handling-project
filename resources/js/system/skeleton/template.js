import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';
import grapesjsPresetNewsletter from 'grapesjs-preset-newsletter';
/**
 * Initializes a GrapesJS editor for a template with dynamic placeholders and updates a hidden input with JSON content.
 * @param {string} type - The type of template ('email', 'web', or 'document').
 * @param {string} templateId - The ID of the template (matches data-template-id).
 * @param {string|null} placeholders - Comma-separated list of placeholders (e.g., 'name,email') or null/empty string.
 * @param {string|null} pretemplate - Optional JSON string of a pre-existing template.
 * @requires window.general
 * @requires grapesjs
 */
export function template(type, templateId, placeholders = null, pretemplate = null) {
  // Validate dependencies
  if (!window.general) {
    return;
  }
  if (typeof grapesjs !== 'object' || !grapesjs.init) {
    window.general.error('GrapesJS is required but not loaded');
    return;
  }
  if (!grapesjsPresetWebpage || !grapesjsPresetNewsletter) {
    window.general.error('Required plugins (gjs-preset-webpage or gjs-preset-newsletter) not loaded');
    return;
  }
  // Find the target div
  const selector = `div[data-template-id="${templateId}"]`;
  const targetDiv = document.querySelector(selector);
  if (!targetDiv) {
    window.general.error(`No element found with data-template-id="${templateId}"`);
    window.general.showToast({
      icon: 'error',
      title: 'Template Error',
      message: `No element found for template ID: ${templateId}`,
      duration: 5000
    });
    return;
  }
  // Get hidden input name from data-template-name or default to 'content'
  const inputName = targetDiv.getAttribute('data-template-name')?.trim() || 'content';
  if (!inputName || !/^[a-zA-Z0-9_]+$/.test(inputName)) {
    window.general.error('Invalid data-template-name', { templateId, inputName });
    window.general.showToast({
      icon: 'warning',
      title: 'Invalid Input Name',
      message: `Invalid data-template-name for ${templateId}, using default 'content'`,
      duration: 5000
    });
  }
  // Parse placeholders
  let placeholderList = [];
  if (placeholders && placeholders.trim() !== '') {
    try {
      placeholderList = placeholders.split(',').map(p => p.trim()).filter(Boolean);
    } catch (error) {
      window.general.error('Invalid placeholders', { templateId, error: error.message });
      window.general.showToast({
        icon: 'error',
        title: 'Configuration Error',
        message: `Invalid placeholders for template ${templateId}: ${error.message}`,
        duration: 5000
      });
      return;
    }
    // Validate placeholders format (only alphanumeric and underscore allowed, no spaces)
    const validPlaceholderRegex = /^[a-zA-Z0-9_]+$/;
    const invalidPlaceholders = placeholderList.filter(p => !validPlaceholderRegex.test(p) || p.includes(' '));
    if (invalidPlaceholders.length) {
      window.general.error('Invalid placeholder names detected', { templateId, invalid: invalidPlaceholders });
      window.general.showToast({
        icon: 'warning',
        title: 'Invalid Placeholders',
        message: `Placeholders must be alphanumeric or underscore with no spaces: ${invalidPlaceholders.join(', ')}`,
        duration: 5000
      });
      placeholderList = placeholderList.filter(p => validPlaceholderRegex.test(p) && !p.includes(' '));
    }
  }
  // Create hidden input for template content with dynamic name
  const hiddenInputContent = document.createElement('input');
  hiddenInputContent.type = 'hidden';
  hiddenInputContent.name = inputName;
  targetDiv.parentNode.insertBefore(hiddenInputContent, targetDiv);
  // Create placeholders div (only if placeholders are provided)
  if (placeholderList.length > 0) {
    const placeholdersDiv = document.createElement('div');
    placeholdersDiv.className = 'available-placeholders';
    placeholderList.forEach(placeholder => {
      const pill = document.createElement('span');
      pill.className = 'placeholder-pill';
      pill.innerHTML = `
        ${placeholder}
        <i class="ti ti-copy" style="font-size: 14px;"></i>
      `;
      pill.addEventListener('mouseover', () => {
        pill.style.backgroundColor = '#03c95a';
        pill.style.transform = 'scale(1.05)';
      });
      pill.addEventListener('mouseout', () => {
        pill.style.backgroundColor = '#00b4af';
        pill.style.transform = 'scale(1)';
      });
      pill.addEventListener('click', async () => {
        try {
          const placeholderText = `{:{${placeholder}}:}`;
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(placeholderText);
          } else {
            const textarea = document.createElement('textarea');
            textarea.value = placeholderText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }
          const icon = pill.querySelector('i');
          icon.className = 'ti ti-check';
          pill.style.backgroundColor = '#28a745';
          setTimeout(() => {
            icon.className = 'ti ti-copy';
            pill.style.backgroundColor = '#00cbff';
          }, 3000);
        } catch (error) {
          window.general.error('Failed to copy placeholder', { placeholder, error: error.message });
          window.general.showToast({
            icon: 'error',
            title: 'Copy Error',
            message: `Failed to copy ${placeholder}`,
            duration: 5000
          });
        }
      });
      placeholdersDiv.appendChild(pill);
    });
    targetDiv.parentNode.insertBefore(placeholdersDiv, targetDiv);
  }
  // Configure editor based on type
  const editorConfig = {
    container: selector,
    height: 'calc(100dvh - 150px)',
    storageManager: {
      type: 'local',
      id: 'gjsProject',
      autosave: false // Disable autosave to manage manually
    },
    plugins: [
      type === 'email' ? grapesjsPresetNewsletter : grapesjsPresetWebpage
    ],
    pluginsOpts: {
      [grapesjsPresetNewsletter]: {},
      [grapesjsPresetWebpage]: {}
    }
  };
  // Set default content based on type
  editorConfig.components = `
      <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to Got-It HR</title>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f0f2f5; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
  <table cellpadding="0" cellspacing="0" align="center" style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);">
    <tr>
      <td style="padding: 0;">
        <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background: linear-gradient(90deg, #00b4af 0%, #0082ba 100%);">
          <tr>
            <td style="width: 30%; padding: 20px; text-align: left; vertical-align: middle;">
              <a href="https://gotit4all.com/" target="_blank" style="display: inline-block; background-color: #ffffff; border-radius: 34px 20px 29px 19px; padding: 15px 26px 12px 24px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
                <img src="https://gotit4all.com/treasury/company/logo/logo.png" alt="Got-It HR Logo" style="max-width: 120px; display: block; border: 0;">
              </a>
            </td>
            <td style="width: 70%; padding: 20px; text-align: right; vertical-align: middle;">
              <span style="color: #ffffff; font-size: 16px; font-weight: bold; display: inline-block; padding: 8px 15px; border-radius: 25px;">Go Easy</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 20px; background-color: #f9fafb;">
        <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; background-color: #ffffff; border-left: 5px solid #0099b4; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 25px;">
              <h2 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0 0 15px;">Welcome to Got-It HR!</h2>
              <p style="font-size: 15px; line-height: 24px; color: #4a4a4a; margin: 0 0 15px;">Thank you for choosing Got-It HR to streamline your workforce management. Our platform empowers you with tools like biometric attendance, payroll automation, and seamless employee management.</p>
              <p style="text-align: center; margin: 20px 0;">
                <a href="https://gotit4all.com/login" target="_blank" style="display: inline-block; padding: 12px 30px; background: linear-gradient(90deg, #00b4af 0%, #0082ba 100%); color: #ffffff !important; font-size: 16px; font-weight: bold; border-radius: 25px; text-decoration: none; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">Get Started Now</a>
              </p>
              <p style="font-size: 15px; line-height: 24px; color: #4a4a4a; margin: 0 0 15px;">Have questions? <a href="mailto:info@gotit4all.com" style="color: #0082ba; text-decoration: none;">Reach out to our support team</a> at +91 90309 90395.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 20px; background: linear-gradient(180deg, #2d3748 0%, #1a202c 100%); color: #ffffff; text-align: center; position: relative;">
        <div style="width: 100%; height: 20px; position: absolute; top: -20px; left: 0;"></div>
        <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 0 auto;">
          <tr>
            <td style="padding: 0;">
              <div style="margin: 0 0 20px;">
                <a href="https://gotit4all.com/unsubscribe" style="color: #e2e8f0; font-size: 14px; padding: 2px 12px; text-decoration: none; display: inline-block; border-radius: 20px; margin: 0 5px;">Unsubscribe</a>
                <a href="https://gotit4all.com/support" style="color: #e2e8f0; font-size: 14px; padding: 2px 12px; text-decoration: none; display: inline-block; border-radius: 20px; margin: 0 5px;">Support</a>
                <a href="https://gotit4all.com/privacy-policy" style="color: #e2e8f0; font-size: 14px; padding: 2px 12px; text-decoration: none; display: inline-block; border-radius: 20px; margin: 0 5px;">Privacy</a>
                <a href="https://gotit4all.com/" style="color: #e2e8f0; font-size: 14px; padding: 2px 12px; text-decoration: none; display: inline-block; border-radius: 20px; margin: 0 5px;">Visit Site</a>
              </div>
              <div style="margin: 20px 0;">
                <a href="https://facebook.com/gotit4all" style="display: inline-block; width: 35px; height: 35px; background-color: #ffffff; border-radius: 50%; margin: 0 8px; text-align: center">
                  <img src="https://gotit4all.com/treasury/social/facebook.png" alt="Facebook" style="width: 100%; border-radius:20px; vertical-align: middle; border: 0;">
                </a>
                <a href="https://linkedin.com/company/gotit4all" style="display: inline-block; width: 35px; height: 35px; background-color: #ffffff; border-radius: 50%; margin: 0 8px; text-align: center">
                  <img src="https://gotit4all.com/treasury/social/linkedin.png" alt="LinkedIn" style="width: 100%; border-radius:20px; vertical-align: middle; border: 0;">
                </a>
                <a href="https://twitter.com/gotit4all" style="display: inline-block; width: 35px; height: 35px; background-color: #ffffff; border-radius: 50%; margin: 0 8px; text-align: center">
                  <img src="https://gotit4all.com/treasury/social/x.png" alt="Twitter" style="width: 100%; border-radius:20px; vertical-align: middle; border: 0;">
                </a>
              </div>
              <p style="font-size: 13px; color: #e2e8f0; margin: 0; line-height: 20px;">Got-It HR delivers innovative solutions for businesses, from biometric attendance to payroll management. <a href="https://gotit4all.com/support" style="color: #e2e8f0; text-decoration: none;">Get in touch!</a></p>
              <p style="font-size: 12px; color: #a0aec0; margin: 15px 0 0;">© 2025 <a href="https://gotit4all.com/" style="color: #a0aec0; text-decoration: none;">Got-It HR</a>. All rights reserved. Powered by <a href="https://digitalkuppam.com/" style="color: #a0aec0; text-decoration: none;">Digital Kuppam</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  // Initialize GrapesJS editor
  let editor;
  try {
    editor = grapesjs.init(editorConfig);
    // Function to correct close placeholder matches (only if placeholders are provided)
    const correctPlaceholder = (match) => {
      if (placeholderList.length === 0) return null; // No placeholders to correct against
      const placeholderName = match.slice(3, -3); // Extract name from {:{name}:}
      // Check for close matches (e.g., 'useraname' -> 'username')
      for (const validPlaceholder of placeholderList) {
        const distance = levenshteinDistance(placeholderName, validPlaceholder);
        if (distance <= 2 && distance > 0) { // Allow minor typos (e.g., 1-2 character differences)
          window.general.showToast({
            icon: 'info',
            title: 'Placeholder Corrected',
            message: `Corrected ${match} to {:{${validPlaceholder}}:}`,
            duration: 5000
          });
          return `{:{${validPlaceholder}}:}`;
        }
      }
      return null; // No correction found
    };
    // Levenshtein distance for typo detection
    const levenshteinDistance = (a, b) => {
      const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
      for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1, // deletion
            matrix[j - 1][i] + 1, // insertion
            matrix[j - 1][i - 1] + indicator // substitution
          );
        }
      }
      return matrix[b.length][a.length];
    };
    // Load pretemplate if provided
    if (pretemplate) {
      try {
        const templateData = JSON.parse(pretemplate);
        let components = templateData.components || '';
        if (placeholderList.length > 0) {
          const placeholderRegex = /\{:\{[a-zA-Z0-9_]+\}:\}/g;
          const validPlaceholders = placeholderList.map(p => `{:{${p}}:}`);
          // Validate and correct placeholders in pretemplate
          const foundPlaceholders = components.match(placeholderRegex) || [];
          const invalidPlaceholders = foundPlaceholders.filter(p => !validPlaceholders.includes(p));
          if (invalidPlaceholders.length) {
            window.general.error('Invalid placeholders in pretemplate', { templateId, invalid: invalidPlaceholders });
            window.general.showToast({
              icon: 'warning',
              title: 'Invalid Placeholders in Pretemplate',
              message: `Found invalid placeholders: ${invalidPlaceholders.join(', ')}`,
              duration: 5000
            });
          }
          components = components.replace(placeholderRegex, match => {
            if (validPlaceholders.includes(match)) {
              return match;
            }
            const corrected = correctPlaceholder(match);
            return corrected || ''; // Use corrected placeholder or remove invalid one
          });
        }
        editor.setComponents(components);
        editor.setStyle(templateData.styles || '');
      } catch (error) {
        window.general.error('Invalid pretemplate JSON', { templateId, error: error.message });
        window.general.showToast({
          icon: 'error',
          title: 'Pretemplate Error',
          message: `Invalid pretemplate for ${templateId}: ${error.message}`,
          duration: 5000
        });
      }
    }
    // Update content on change
    const updateContent = () => {
      try {
        // Clear local storage
        localStorage.removeItem('gjsProject');
        // Get editor content
        let htmlContent = editor.getHtml();
        const cssContent = editor.getCss();
        // Find and correct placeholders in content (only if placeholders are provided)
        if (placeholderList.length > 0) {
          const placeholderRegex = /\{:\{[a-zA-Z0-9_]+\}:\}/g;
          const foundPlaceholders = htmlContent.match(placeholderRegex) || [];
          const validPlaceholders = placeholderList.map(p => `{:{${p}}:}`);
          const invalidPlaceholders = foundPlaceholders.filter(p => !validPlaceholders.includes(p));
          // Log and notify invalid placeholders, attempt correction
          if (invalidPlaceholders.length) {
            window.general.error('Invalid placeholders found in content', { templateId, invalid: invalidPlaceholders });
          }
          // Sanitize and correct placeholders
          htmlContent = htmlContent.replace(placeholderRegex, match => {
            if (validPlaceholders.includes(match)) {
              return match;
            }
            const corrected = correctPlaceholder(match);
            return corrected || ''; // Use corrected placeholder or remove invalid one
          });
        }
        // Update editor content if changed, preserving styles
        if (htmlContent !== editor.getHtml()) {
          editor.setComponents(htmlContent);
          editor.setStyle(cssContent); // Explicitly preserve styles
        }
        // Update hidden input for content with JSON content
        const contentData = {
          components: htmlContent,
          styles: cssContent
        };
        hiddenInputContent.value = JSON.stringify(contentData);
      } catch (error) {
        window.general.error('Error updating template content', { templateId, error: error.message });
        window.general.showToast({
          icon: 'error',
          title: 'Update Error',
          message: `Failed to update template content for ${templateId}`,
          duration: 5000
        });
      }
    };
    // Attach change event listener with debouncing
    let debounceTimeout;
    editor.on('change', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(updateContent, 300);
    });
    // Trigger initial update
    updateContent();
  } catch (error) {
    window.general.error('Error initializing GrapesJS', { templateId, error: error.message });
    window.general.showToast({
      icon: 'error',
      title: 'Initialization Error',
      message: `Failed to initialize template editor for ${templateId}: ${error.message}`,
      duration: 5000
    });
  }
}