import axios from 'axios';
import Swal from 'sweetalert2';

const FileManager = {
    // Configuration
    config: {
        apiBaseUrl: '/file-manager',
        csrfToken: document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        currentFolder: null,
        viewMode: 'grid',
        selectedItems: new Set(),
    },

    // Initialize File Manager
    init() {
        this.config.currentFolder = new URLSearchParams(window.location.search).get('folder') || null;
        this.config.viewMode = this.getCookie('view_mode') || 'grid';
        this.setupEventListeners();
        this.loadContents();
        this.setupEcho();
        this.setupDragAndDrop();
        this.setupContextMenu();
        this.loadTree();
    },

    // Setup Event Listeners
    setupEventListeners() {
        // New Folder
        document.getElementById('new-folder-btn')?.addEventListener('click', () => this.showNewFolderModal());
        document.getElementById('new-folder-form')?.addEventListener('submit', (e) => this.createFolder(e));

        // Upload File
        document.getElementById('upload-btn')?.addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input')?.addEventListener('change', (e) => this.uploadFiles(e.target.files));

        // View Mode Toggle
        document.getElementById('grid-view-btn')?.addEventListener('click', () => this.setViewMode('grid'));
        document.getElementById('list-view-btn')?.addEventListener('click', () => this.setViewMode('list'));

        // Search
        document.getElementById('search-input')?.addEventListener('input', (e) => this.debounce(this.search, 300)(e.target.value));

        // Advanced Search
        document.getElementById('advanced-search-btn')?.addEventListener('click', () => this.toggleAdvancedSearch());
        document.getElementById('advanced-search-form')?.addEventListener('submit', (e) => this.advancedSearch(e));

        // Bulk Actions
        document.getElementById('bulk-delete-btn')?.addEventListener('click', () => this.bulkDelete());
        document.getElementById('bulk-star-btn')?.addEventListener('click', () => this.bulkStar(true));
        document.getElementById('bulk-unstar-btn')?.addEventListener('click', () => this.bulkStar(false));

        // Select All
        document.getElementById('select-all')?.addEventListener('change', (e) => this.selectAll(e.target.checked));
    },

    // Setup Laravel Echo for Real-Time Updates
    setupEcho() {
        const userId = document.querySelector('meta[name="user-id"]').getAttribute('content');
        const businessId = document.querySelector('meta[name="business-id"]').getAttribute('content');

        // File Events
        window.Echo.private(`.business.${businessId}`)
            .listen('.App\\Events\\FileManager\\FileCreated', (e) => this.handleFileCreated(e.file))
            .listen('.App\\Events\\FileManager\\FileDeleted', (e) => this.handleFileDeleted(e.file_id))
            .listen('.App\\Events\\FileManager\\FileRenamed', (e) => this.handleFileRenamed(e.file))
            .listen('.App\\Events\\FileManager\\FileStarred', (e) => this.handleFileStarred(e.file))
            .listen('.App\\Events\\FileManager\\FileRestored', (e) => this.handleFileRestored(e.file))
            .listen('.App\\Events\\FileManager\\FilePermanentlyDeleted', (e) => this.handleFileDeleted(e.file_id))
            .listen('.App\\Events\\FileManager\\FileVersionRestored', (e) => this.handleFileUpdated(e.file))
            .listen('.App\\Events\\FileManager\\FileUpdated', (e) => this.handleFileUpdated(e.file))
            .listen('.App\\Events\\FileManager\\FileShared', (e) => this.handleFileShared(e.file, e.shared_user_id));

        // Folder Events
        window.Echo.private(`.business.${businessId}`)
            .listen('.App\\Events\\FileManager\\FolderCreated', (e) => this.handleFolderCreated(e.folder))
            .listen('.App\\Events\\FileManager\\FolderDeleted', (e) => this.handleFolderDeleted(e.folder_id))
            .listen('.App\\Events\\FileManager\\FolderRenamed', (e) => this.handleFolderRenamed(e.folder))
            .listen('.App\\Events\\FileManager\\FolderStarred', (e) => this.handleFolderStarred(e.folder))
            .listen('.App\\Events\\FileManager\\FolderRestored', (e) => this.handleFolderRestored(e.folder))
            .listen('.App\\Events\\FileManager\\FolderPermanentlyDeleted', (e) => this.handleFolderDeleted(e.folder_id))
            .listen('.App\\Events\\FileManager\\FolderShared', (e) => this.handleFolderShared(e.folder, e.shared_user_id));

        // Item Moved
        window.Echo.private(`.business.${businessId}`)
            .listen('.App\\Events\\FileManager\\ItemMoved', (e) => this.handleItemMoved(e.item, e.type));

        // Business Channel for Public Items
        window.Echo.private(`.business.${businessId}`)
            .listen('.App\\Events\\FileManager\\FileCreated', (e) => this.handleFileCreated(e.file))
            .listen('.App\\Events\\FileManager\\FolderCreated', (e) => this.handleFolderCreated(e.folder));
    },

    // Load Folder Contents
    async loadContents(folderId = this.config.currentFolder, filters = {}) {
        try {
            const params = new URLSearchParams({ folder: folderId, ...filters });
            const response = await axios.get(`${this.config.apiBaseUrl}?${params}`);
            document.getElementById('file-manager-content').innerHTML = response.data;
            this.setupItemEventListeners();
            this.updateBreadcrumbs();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Failed to load contents', 'error');
        }
    },

    // Load Folder Tree
    async loadTree() {
        try {
            const response = await axios.get(`${this.config.apiBaseUrl}/tree`);
            document.getElementById('folder-tree').innerHTML = this.renderTree(response.data);
            this.setupTreeEventListeners();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Failed to load tree', 'error');
        }
    },

    // Upload Files
    async uploadFiles(files) {
        const formData = new FormData();
        for (const file of files) {
            formData.append('file[]', file);
        }
        formData.append('current_folder', this.config.currentFolder);
        formData.append('access_level', document.getElementById('access-level')?.value || 'private');
        formData.append('description', document.getElementById('file-description')?.value || '');

        try {
            const response = await axios.post(`${this.config.apiBaseUrl}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Upload failed', 'error');
        }
    },

    // Update File
    async updateFile(fileId, file, description) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', description || '');
        formData.append('_method', 'PUT');

        try {
            const response = await axios.post(`${this.config.apiBaseUrl}/files/${fileId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Update failed', 'error');
        }
    },

    // Create Folder
    async createFolder(event) {
        event.preventDefault();
        const form = event.target;
        const data = new FormData(form);

        try {
            const response = await axios.post(`${this.config.apiBaseUrl}/folders`, data);
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
            this.loadTree();
            form.reset();
            bootstrap.Modal.getInstance(document.getElementById('new-folder-modal')).hide();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Failed to create folder', 'error');
        }
    },

    // Rename Item
    async renameItem(id, type, newName) {
        try {
            const response = await axios.put(`${this.config.apiBaseUrl}/${type}s/${id}/rename`, {
                [`rename_${type}_name`]: newName,
            });
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
            if (type === 'folder') this.loadTree();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Rename failed', 'error');
        }
    },

    // Delete Item
    async deleteItem(id, type) {
        try {
            const response = await axios.delete(`${this.config.apiBaseUrl}/${type}s/${id}`);
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
            if (type === 'folder') this.loadTree();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Delete failed', 'error');
        }
    },

    // Restore Item
    async restoreItem(id, type) {
        try {
            const response = await axios.post(`${this.config.apiBaseUrl}/${type}s/${id}/restore`);
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
            if (type === 'folder') this.loadTree();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Restore failed', 'error');
        }
    },

    // Permanently Delete Item
    async permanentlyDeleteItem(id, type) {
        try {
            const response = await axios.delete(`${this.config.apiBaseUrl}/${type}s/${id}/permanent`);
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
            if (type === 'folder') this.loadTree();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Permanent delete failed', 'error');
        }
    },

    // Download File
    async downloadFile(id) {
        try {
            window.location.href = `${this.config.apiBaseUrl}/files/${id}/download`;
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Download failed', 'error');
        }
    },

    // Share Item
    async shareItem(id, type, email, permissionType) {
        try {
            const response = await axios.post(`${this.config.apiBaseUrl}/${type}s/${id}/share`, {
                share_with: email,
                permission_type: permissionType,
            });
            Swal.fire('Success', response.data.success, 'success');
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Share failed', 'error');
        }
    },

    // Revoke Share
    async revokeShare(id, type, userId) {
        try {
            const response = await axios.delete(`${this.config.apiBaseUrl}/${type}s/${id}/share/${userId}`);
            Swal.fire('Success', response.data.success, 'success');
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Revoke share failed', 'error');
        }
    },

    // Copy Item
    async copyItem(id, type, destinationFolderId) {
        try {
            const response = await axios.post(`${this.config.apiBaseUrl}/copy`, {
                item_id: id,
                item_type: type,
                destination_folder_id: destinationFolderId,
            });
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
            if (type === 'folder') this.loadTree();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Copy failed', 'error');
        }
    },

    // Move Item
    async moveItem(id, type, destinationFolderId) {
        try {
            const response = await axios.post(`${this.config.apiBaseUrl}/move`, {
                item_id: id,
                item_type: type,
                destination_folder_id: destinationFolderId,
            });
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
            if (type === 'folder') this.loadTree();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Move failed', 'error');
        }
    },

    // Star Item
    async starItem(id, type, star) {
        try {
            const response = await axios.post(`${this.config.apiBaseUrl}/${type}s/${id}/star`, { star });
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Star failed', 'error');
        }
    },

    // Get File Versions
    async getFileVersions(id) {
        try {
            const response = await axios.get(`${this.config.apiBaseUrl}/files/${id}/versions`);
            return response.data;
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Failed to load versions', 'error');
            return [];
        }
    },

    // Restore File Version
    async restoreFileVersion(id, versionNumber) {
        try {
            const response = await axios.post(`${this.config.apiBaseUrl}/files/${id}/versions/${versionNumber}/restore`);
            Swal.fire('Success', response.data.success, 'success');
            this.loadContents();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Version restore failed', 'error');
        }
    },

    // Preview File
    previewFile(file) {
        const url = `/storage/${file.file_path}`;
        const modal = document.getElementById('preview-modal');
        const content = document.getElementById('preview-content');

        if (file.mime_type.startsWith('image/')) {
            content.innerHTML = `<img src="${url}" class="img-fluid" alt="${file.display_name}">`;
        } else if (file.mime_type === 'application/pdf') {
            content.innerHTML = `<iframe src="${url}" width="100%" height="500px"></iframe>`;
        } else if (file.mime_type.startsWith('text/')) {
            content.innerHTML = `<pre>${file.display_name}</pre>`;
            axios.get(url).then((res) => (content.innerHTML = `<pre>${res.data}</pre>`));
        } else {
            content.innerHTML = `<p>Preview not available for this file type.</p>`;
        }

        bootstrap.Modal.getOrCreateInstance(modal).show();
    },

    // Get Activity Log
    async getActivityLog(targetId, targetType) {
        try {
            const response = await axios.get(`${this.config.apiBaseUrl}/activity-log`, {
                params: { target_id: targetId, target_type: targetType },
            });
            return response.data;
        } catch (error) {
            Swal.fire('Error', error.response?.data?.error || 'Failed to load activity log', 'error');
            return [];
        }
    },

    // Handle Real-Time Events
    handleFileCreated(file) {
        if (file.folder_id === this.config.currentFolder) {
            this.loadContents();
        }
    },

    handleFolderCreated(folder) {
        if (folder.parent_folder_id === this.config.currentFolder) {
            this.loadContents();
            this.loadTree();
        }
    },

    handleFileDeleted(fileId) {
        document.querySelector(`[data-file-id="${fileId}"]`)?.remove();
    },

    handleFolderDeleted(folderId) {
        document.querySelector(`[data-folder-id="${folderId}"]`)?.remove();
        this.loadTree();
    },

    handleFileRenamed(file) {
        const element = document.querySelector(`[data-file-id="${file.file_id}"]`);
        if (element) {
            element.querySelector('.item-name').textContent = file.display_name;
        }
    },

    handleFolderRenamed(folder) {
        const element = document.querySelector(`[data-folder-id="${folder.folder_id}"]`);
        if (element) {
            element.querySelector('.item-name').textContent = folder.name;
        }
        this.loadTree();
    },

    handleFileStarred(file) {
        const element = document.querySelector(`[data-file-id="${file.file_id}"]`);
        if (element) {
            const star = element.querySelector('.star-icon');
            star.classList.toggle('fas', file.is_starred);
            star.classList.toggle('far', !file.is_starred);
        }
    },

    handleFolderStarred(folder) {
        const element = document.querySelector(`[data-folder-id="${folder.folder_id}"]`);
        if (element) {
            const star = element.querySelector('.star-icon');
            star.classList.toggle('fas', folder.is_starred);
            star.classList.toggle('far', !folder.is_starred);
        }
    },

    handleFileRestored(file) {
        if (file.folder_id === this.config.currentFolder) {
            this.loadContents();
        }
    },

    handleFolderRestored(folder) {
        if (folder.parent_folder_id === this.config.currentFolder) {
            this.loadContents();
            this.loadTree();
        }
    },

    handleItemMoved(item, type) {
        const selector = type === 'file' ? `[data-file-id="${item.file_id}"]` : `[data-folder-id="${item.folder_id}"]`;
        if (item.folder_id !== this.config.currentFolder && item.parent_folder_id !== this.config.currentFolder) {
            document.querySelector(selector)?.remove();
        } else {
            this.loadContents();
            if (type === 'folder') this.loadTree();
        }
    },

    handleFileShared(file, sharedUserId) {
        this.loadContents();
    },

    handleFolderShared(folder, sharedUserId) {
        this.loadContents();
        this.loadTree();
    },

    handleFileUpdated(file) {
        const element = document.querySelector(`[data-file-id="${file.file_id}"]`);
        if (element) {
            element.querySelector('.item-name').textContent = file.display_name;
            element.querySelector('.item-size').textContent = this.formatSize(file.file_size);
            element.querySelector('.item-modified').textContent = new Date(file.updated_at).toLocaleString();
        }
    },

    // Setup Drag and Drop
    setupDragAndDrop() {
        const dropZone = document.getElementById('file-manager-content');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.uploadFiles(e.dataTransfer.files);
        });

        document.querySelectorAll('.folder-item').forEach((item) => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    id: item.dataset.folderId,
                    type: 'folder',
                }));
            });
        });

        document.querySelectorAll('.file-item').forEach((item) => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    id: item.dataset.fileId,
                    type: 'file',
                }));
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
            if (data.id && data.type) {
                this.moveItem(data.id, data.type, this.config.currentFolder);
            }
        });
    },

    // Setup Context Menu
    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            const item = e.target.closest('.file-item, .folder-item');
            if (item) {
                e.preventDefault();
                this.showContextMenu(item, e.clientX, e.clientY);
            }
        });
        document.addEventListener('click', () => this.hideContextMenu());
    },

    // Show Context Menu
    showContextMenu(item, x, y) {
        const type = item.classList.contains('file-item') ? 'file' : 'folder';
        const id = item.dataset.fileId || item.dataset.folderId;
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.position = 'absolute';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.innerHTML = `
            <ul class="list-group">
                <li class="list-group-item" onclick="FileManager.renameItem('${id}', '${type}', prompt('New name:'))">Rename</li>
                <li class="list-group-item" onclick="FileManager.deleteItem('${id}', '${type}')">Delete</li>
                <li class="list-group-item" onclick="FileManager.starItem('${id}', '${type}', ${!item.querySelector('.star-icon').classList.contains('fas')})">
                    ${item.querySelector('.star-icon').classList.contains('fas') ? 'Unstar' : 'Star'}
                </li>
                <li class="list-group-item" onclick="FileManager.copyItem('${id}', '${type}', '${this.config.currentFolder}')">Copy</li>
                <li class="list-group-item" onclick="FileManager.moveItem('${id}', '${type}', prompt('Destination folder ID:'))">Move</li>
                <li class="list-group-item" onclick="FileManager.shareItem('${id}', '${type}', prompt('Share with email:'), 'view')">Share</li>
                ${type === 'file' ? `<li class="list-group-item" onclick="FileManager.downloadFile('${id}')">Download</li>` : ''}
                ${type === 'file' ? `<li class="list-group-item" onclick="FileManager.previewFile({ file_id: '${id}', file_path: '${item.dataset.filePath}', mime_type: '${item.dataset.mimeType}', display_name: '${item.querySelector('.item-name').textContent}' })">Preview</li>` : ''}
                ${type === 'file' ? `<li class="list-group-item" onclick="FileManager.showVersions('${id}')">Versions</li>` : ''}
                <li class="list-group-item" onclick="FileManager.showActivityLog('${id}', '${type}')">Activity Log</li>
            </ul>
        `;
        document.body.appendChild(menu);
    },

    // Hide Context Menu
    hideContextMenu() {
        document.querySelectorAll('.context-menu').forEach((menu) => menu.remove());
    },

    // Show Versions
    async showVersions(fileId) {
        const versions = await this.getFileVersions(fileId);
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="versions-modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">File Versions</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <ul class="list-group">
                                ${versions.map((v) => `
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        Version ${v.version_number} - ${new Date(v.created_at).toLocaleString()}
                                        <button class="btn btn-sm btn-primary" onclick="FileManager.restoreFileVersion('${fileId}', ${v.version_number})">Restore</button>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('versions-modal')).show();
    },

    // Show Activity Log
    async showActivityLog(targetId, targetType) {
        const log = await this.getActivityLog(targetId, targetType);
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="modal fade" id="activity-log-modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Activity Log</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <ul class="list-group">
                                ${log.map((entry) => `
                                    <li class="list-group-item">
                                        ${entry.action_type} by ${entry.user_id} at ${new Date(entry.created_at).toLocaleString()}
                                        <br>Details: ${JSON.stringify(entry.details)}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('activity-log-modal')).show();
    },

    // Set View Mode
    setViewMode(mode) {
        this.config.viewMode = mode;
        document.cookie = `view_mode=${mode};path=/`;
        this.loadContents();
    },

    // Search
    async search(query) {
        this.loadContents(this.config.currentFolder, { search: query });
    },

    // Advanced Search
    async advancedSearch(event) {
        event.preventDefault();
        const form = event.target;
        const data = Object.fromEntries(new FormData(form));
        this.loadContents(this.config.currentFolder, data);
        bootstrap.Modal.getInstance(document.getElementById('advanced-search-modal')).hide();
    },

    // Bulk Delete
    async bulkDelete() {
        for (const item of this.config.selectedItems) {
            const [type, id] = item.split(':');
            await this.deleteItem(id, type);
        }
        this.config.selectedItems.clear();
        this.loadContents();
    },

    // Bulk Star
    async bulkStar(star) {
        for (const item of this.config.selectedItems) {
            const [type, id] = item.split(':');
            await this.starItem(id, type, star);
        }
        this.config.selectedItems.clear();
        this.loadContents();
    },

    // Select All
    selectAll(checked) {
        this.config.selectedItems.clear();
        if (checked) {
            document.querySelectorAll('.item-checkbox').forEach((cb) => {
                cb.checked = true;
                const item = cb.closest('.file-item, .folder-item');
                const type = item.classList.contains('file-item') ? 'file' : 'folder';
                const id = item.dataset.fileId || item.dataset.folderId;
                this.config.selectedItems.add(`${type}:${id}`);
            });
        }
        this.updateBulkActions();
    },

    // Update Bulk Actions
    updateBulkActions() {
        const count = this.config.selectedItems.size;
        document.getElementById('bulk-actions').style.display = count > 0 ? 'block' : 'none';
        document.getElementById('selected-count').textContent = count;
    },

    // Show New Folder Modal
    showNewFolderModal() {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('new-folder-modal')).show();
    },

    // Toggle Advanced Search
    toggleAdvancedSearch() {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('advanced-search-modal')).toggle();
    },

    // Render Tree
    renderTree(nodes) {
        return `
            <ul class="list-group">
                ${nodes.map((node) => `
                    <li class="list-group-item folder-tree-item" data-folder-id="${node.folder_id}">
                        <i class="fas fa-folder"></i> ${node.name}
                        ${node.children ? this.renderTree(node.children) : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    },

    // Setup Tree Event Listeners
    setupTreeEventListeners() {
        document.querySelectorAll('.folder-tree-item').forEach((item) => {
            item.addEventListener('click', () => {
                this.config.currentFolder = item.dataset.folderId;
                this.loadContents(item.dataset.folderId);
            });
        });
    },

    // Setup Item Event Listeners
    setupItemEventListeners() {
        document.querySelectorAll('.folder-item').forEach((item) => {
            item.querySelector('.item-name').addEventListener('click', () => {
                this.config.currentFolder = item.dataset.folderId;
                this.loadContents(item.dataset.folderId);
            });
        });

        document.querySelectorAll('.file-item').forEach((item) => {
            item.querySelector('.item-name').addEventListener('click', () => {
                this.previewFile({
                    file_id: item.dataset.fileId,
                    file_path: item.dataset.filePath,
                    mime_type: item.dataset.mimeType,
                    display_name: item.querySelector('.item-name').textContent,
                });
            });
        });

        document.querySelectorAll('.star-icon').forEach((star) => {
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = star.closest('.file-item, .folder-item');
                const type = item.classList.contains('file-item') ? 'file' : 'folder';
                const id = item.dataset.fileId || item.dataset.folderId;
                this.starItem(id, type, !star.classList.contains('fas'));
            });
        });

        document.querySelectorAll('.item-checkbox').forEach((cb) => {
            cb.addEventListener('change', () => {
                const item = cb.closest('.file-item, .folder-item');
                const type = item.classList.contains('file-item') ? 'file' : 'folder';
                const id = item.dataset.fileId || item.dataset.folderId;
                if (cb.checked) {
                    this.config.selectedItems.add(`${type}:${id}`);
                } else {
                    this.config.selectedItems.delete(`${type}:${id}`);
                }
                this.updateBulkActions();
            });
        });
    },

    // Update Breadcrumbs
    updateBreadcrumbs() {
        const breadcrumbs = document.getElementById('breadcrumbs');
        // Implementation depends on backend providing breadcrumb data
        breadcrumbs.innerHTML = `<li class="breadcrumb-item"><a href="#" onclick="FileManager.loadContents(null)">Home</a></li>`;
        if (this.config.currentFolder) {
            // Fetch breadcrumb path from backend or maintain locally
            breadcrumbs.innerHTML += `<li class="breadcrumb-item active">${this.config.currentFolder}</li>`;
        }
    },

    // Format File Size
    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    },

    // Get Cookie
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    },

    // Debounce Function
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },
};

export default FileManager;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => FileManager.init());