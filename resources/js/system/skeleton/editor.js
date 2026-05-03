import Quill from 'quill';
import 'quill/dist/quill.snow.css';
/**
 * Initializes a Quill editor with dynamic placeholders and updates a hidden input with JSON content.
 * @param {string} id - The ID of the editor (matches data-editor-id).
 * @param {string|null} placeholders - Comma-separated list of placeholders (e.g., 'name,email') or null/empty string.
 * @param {string|null} pretemplate - Optional JSON string of pre-existing content.
 * @requires window.general
 * @requires Quill
 */
export function editor(id, placeholders = null, pretemplate = null) {
  // Validate dependencies
  if (!window.general) {
    console.error('window.general is required but not available');
    return;
  }
  if (typeof Quill !== 'function') {
    window.general.error('Quill is required but not loaded');
    return;
  }
  // Find the target div
  const selector = `div[data-editor-id="${id}"]`;
  const targetDiv = document.querySelector(selector);
  if (!targetDiv) {
    window.general.error(`No element found with data-editor-id="${id}"`);
    window.general.showToast({
      icon: 'error',
      title: 'Editor Error',
      message: `No element found for editor ID: ${id}`,
      duration: 5000
    });
    return;
  }
  // Get hidden input name from data-editor-name or default to 'content'
  const inputName = targetDiv.getAttribute('data-editor-name')?.trim() || 'content';
  if (!inputName || !/^[a-zA-Z0-9_]+$/.test(inputName)) {
    window.general.error('Invalid data-editor-name', { id, inputName });
    window.general.showToast({
      icon: 'warning',
      title: 'Invalid Input Name',
      message: `Invalid data-editor-name for ${id}, using default 'content'`,
      duration: 5000
    });
  }
  // Parse placeholders
  let placeholderList = [];
  if (placeholders && placeholders.trim() !== '') {
    try {
      placeholderList = placeholders.split(',').map(p => p.trim()).filter(Boolean);
    } catch (error) {
      window.general.error('Invalid placeholders', { id, error: error.message });
      window.general.showToast({
        icon: 'error',
        title: 'Configuration Error',
        message: `Invalid placeholders for editor ${id}: ${error.message}`,
        duration: 5000
      });
      return;
    }
    // Validate placeholders format (only alphanumeric and underscore allowed, no spaces)
    const validPlaceholderRegex = /^[a-zA-Z0-9_]+$/;
    const invalidPlaceholders = placeholderList.filter(p => !validPlaceholderRegex.test(p) || p.includes(' '));
    if (invalidPlaceholders.length) {
      window.general.error('Invalid placeholder names detected', { id, invalid: invalidPlaceholders });
      window.general.showToast({
        icon: 'warning',
        title: 'Invalid Placeholders',
        message: `Placeholders must be alphanumeric or underscore with no spaces: ${invalidPlaceholders.join(', ')}`,
        duration: 5000
      });
      placeholderList = placeholderList.filter(p => validPlaceholderRegex.test(p) && !p.includes(' '));
    }
  }
  // Create hidden input for editor content
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
  // Custom editor styles
  const editorStyles = `
    .ql-toolbar.ql-snow {
      background-color: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 6px 6px 0 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 8px;
    }
    .ql-toolbar.ql-snow .ql-formats {
      margin-right: 12px;
    }
    .ql-toolbar.ql-snow .ql-picker-label,
    .ql-toolbar.ql-snow button {
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      transition: background-color 0.2s;
    }
    .ql-toolbar.ql-snow .ql-picker-label:hover,
    .ql-toolbar.ql-snow button:hover {
      background-color: #0056b3;
    }
    .ql-toolbar.ql-snow .ql-active {
      background-color: #28a745;
    }
    .ql-container.ql-snow {
      background-color: #ffffff;
      border: 1px solid #dee2e6;
      border-radius: 0 0 6px 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 16px;
    }
    .ql-editor {
      min-height: 200px;
      padding: 16px;
      color: #343a40;
    }
    .ql-editor:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
    @media (max-width: 768px) {
      .ql-toolbar.ql-snow {
        font-size: 14px;
        padding: 6px;
      }
      .ql-toolbar.ql-snow .ql-formats {
        margin-right: 8px;
      }
      .placeholder-pills {
        flex-direction: column;
        gap: 8px;
      }
    }
  `;
  // Initialize Quill editor
  let quill;
  try {
    // Configure Quill
    const quill = new Quill(targetDiv, {
      theme: 'snow',
      modules: {
        toolbar: [
          // Text styles (inline)
          ['bold', 'italic', 'underline', 'strike'],
          // Block level styles
          ['blockquote', 'code-block'],
          // Headers and Font size
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          // Lists and indentation
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'indent': '-1' }, { 'indent': '+1' }],
          // Alignment and direction
          [{ 'align': [] }, { 'direction': 'rtl' }],
          // Colors
          [{ 'color': [] }, { 'background': [] }],
          // Clear formatting
          ['clean']
        ]
      }
    });
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
        let content = templateData.content || '';
        if (placeholderList.length > 0) {
          const placeholderRegex = /\{:\{[a-zA-Z0-9_]+\}:\}/g;
          const validPlaceholders = placeholderList.map(p => `{:{${p}}:}`);
          // Validate and correct placeholders in pretemplate
          const foundPlaceholders = content.match(placeholderRegex) || [];
          const invalidPlaceholders = foundPlaceholders.filter(p => !validPlaceholders.includes(p));
          if (invalidPlaceholders.length) {
            window.general.error('Invalid placeholders in pretemplate', { id, invalid: invalidPlaceholders });
            window.general.showToast({
              icon: 'warning',
              title: 'Invalid Placeholders in Pretemplate',
              message: `Found invalid placeholders: ${invalidPlaceholders.join(', ')}`,
              duration: 5000
            });
          }
          content = content.replace(placeholderRegex, match => {
            if (validPlaceholders.includes(match)) {
              return match;
            }
            const corrected = correctPlaceholder(match);
            return corrected || ''; // Use corrected placeholder or remove invalid one
          });
        }
        quill.root.innerHTML = content;
      } catch (error) {
        window.general.error('Invalid pretemplate JSON', { id, error: error.message });
        window.general.showToast({
          icon: 'error',
          title: 'Pretemplate Error',
          message: `Invalid pretemplate for ${id}: ${error.message}`,
          duration: 5000
        });
      }
    }
    // Update content on change
    const updateContent = () => {
      try {
        let htmlContent = quill.root.innerHTML;
        // Find and correct placeholders in content (only if placeholders are provided)
        if (placeholderList.length > 0) {
          const placeholderRegex = /\{:\{[a-zA-Z0-9_]+\}:\}/g;
          const foundPlaceholders = htmlContent.match(placeholderRegex) || [];
          const validPlaceholders = placeholderList.map(p => `{:{${p}}:}`);
          const invalidPlaceholders = foundPlaceholders.filter(p => !validPlaceholders.includes(p));
          // Log and notify invalid placeholders, attempt correction
          if (invalidPlaceholders.length) {
            window.general.error('Invalid placeholders found in content', { id, invalid: invalidPlaceholders });
          }
          // Sanitize and correct placeholders
          htmlContent = htmlContent.replace(placeholderRegex, match => {
            if (validPlaceholders.includes(match)) {
              return match;
            }
            const corrected = correctPlaceholder(match);
            return corrected || ''; // Use corrected placeholder or remove invalid one
          });
          // Update editor content if changed
          if (htmlContent !== quill.root.innerHTML) {
            quill.root.innerHTML = htmlContent;
          }
        }
        // Update hidden input with JSON content
        const contentData = { content: htmlContent };
        hiddenInputContent.value = JSON.stringify(contentData);
      } catch (error) {
        window.general.error('Error updating editor content', { id, error: error.message });
        window.general.showToast({
          icon: 'error',
          title: 'Update Error',
          message: `Failed to update editor content for ${id}`,
          duration: 5000
        });
      }
    };
    // Attach change event listener with debouncing
    let debounceTimeout;
    quill.on('text-change', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(updateContent, 300);
    });
    // Trigger initial update
    updateContent();
  } catch (error) {
    window.general.error('Error initializing Quill', { id, error: error.message });
    window.general.showToast({
      icon: 'error',
      title: 'Initialization Error',
      message: `Failed to initialize editor for ${id}: ${error.message}`,
      duration: 5000
    });
  }
}