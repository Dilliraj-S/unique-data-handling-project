/**
 * ExportService - Handles data export to CSV, Excel, PDF
 * Equivalent to bv project's export functionality
 */

class ExportService {
  /**
   * Export data to CSV
   * @param {Array} data - Data to export
   * @param {Array} columns - Column definitions
   * @param {string} filename - Output filename
   */
  static exportToCSV(data, columns, filename = 'export.csv') {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get visible columns
    const visibleColumns = columns.filter(col => col.visible !== false && col.data !== 'selection' && col.data !== 'actions');
    
    // Create CSV header
    const headers = visibleColumns.map(col => col.title || col.data);
    const csvRows = [headers.join(',')];

    // Add data rows
    data.forEach(row => {
      const values = visibleColumns.map(col => {
        let value = row[col.data] || '';
        // Escape commas and quotes in CSV
        value = String(value).replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export data to Excel (using CSV format with .xlsx extension)
   * For full Excel support, you would need a library like xlsx
   * @param {Array} data - Data to export
   * @param {Array} columns - Column definitions
   * @param {string} filename - Output filename
   */
  static exportToExcel(data, columns, filename = 'export.xlsx') {
    // For now, we'll use CSV format
    // In production, you'd use a library like 'xlsx' for proper Excel format
    this.exportToCSV(data, columns, filename.replace('.xlsx', '.csv'));
    
    // TODO: Implement proper Excel export using xlsx library
    // Example:
    // const XLSX = require('xlsx');
    // const worksheet = XLSX.utils.json_to_sheet(data);
    // const workbook = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    // XLSX.writeFile(workbook, filename);
  }

  /**
   * Export data to PDF
   * @param {Array} data - Data to export
   * @param {Array} columns - Column definitions
   * @param {string} filename - Output filename
   */
  static exportToPDF(data, columns, filename = 'export.pdf') {
    // PDF export requires a library like jsPDF or pdfmake
    // For now, we'll create a simple HTML table and use browser print
    console.warn('PDF export requires additional library. Using print preview instead.');
    
    const visibleColumns = columns.filter(col => col.visible !== false && col.data !== 'selection' && col.data !== 'actions');
    
    // Create HTML table
    let html = `
      <html>
        <head>
          <title>${filename}</title>
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            @media print {
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h2>Export Data</h2>
          <table>
            <thead>
              <tr>
                ${visibleColumns.map(col => `<th>${col.title || col.data}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${visibleColumns.map(col => `<td>${row[col.data] || ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }

  /**
   * Export via API (server-side export for large datasets)
   * @param {string} token - Table token
   * @param {Object} filters - Current filters
   * @param {Array} exportColumns - Columns to export
   * @param {string} format - Export format (csv, excel, pdf)
   * @param {string} apiEndpoint - API endpoint
   */
  static async exportViaAPI(token, filters, exportColumns, format = 'csv', apiEndpoint = '/api/skeleton-action') {
    try {
      const response = await fetch(`${apiEndpoint}/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skeleton_filters: {
            ...filters,
            export: {
              export: true,
              columns: exportColumns,
              format: format
            }
          },
          skeleton_view: 'export'
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Export error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ExportService;

