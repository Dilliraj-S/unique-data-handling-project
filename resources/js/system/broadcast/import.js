import { initHeaderMatchEcho, getFinalMapping } from './mapping.js';

const activeProcess = new Map();
const activeChannels = new Map();
const STORAGE_KEY = 'activeProcess';
let USER_CHANNEL_PREFIX = '';

export function generateProcessId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export function listenProgress(processId) {
    USER_CHANNEL_PREFIX = `progress.user.${window.userId}`;
    const activeProcessPlaceholder = document.querySelector('.active-imports-placeholder');

    if (activeChannels.has(processId)) {
        console.log(`Channel for processId ${processId} already exists, skipping listener setup.`);
        return;
    }

    // ✅ Show immediate toast on function call
    window.general.showToast({
        icon: 'info',
        title: 'Progress Started',
        message: `Process Started for process ID: ${processId}`,
        duration: 3000
    });

    const channel = window.Echo.channel(`${USER_CHANNEL_PREFIX}.${processId}`)
        .listen('.progress', (e) => {
            console.log(`Received progress event for ${e.type} with processId: ${processId}`, e);

            const details = e.details || {};
            console.log(details);
            const file = e.type === 'export'
                ? (details.files?.length ? details.files[details.files.length - 1].split('/').pop() : 'File')
                : details.file || 'File';

            const { isComplete, isError } = updateProgressUI(e, activeProcessPlaceholder);
            updateStoredImports(e);

            const dropdownToggle = document.querySelector('.dropdown-toggle');
            if (dropdownToggle) {
                const bsDropdown = new bootstrap.Dropdown(dropdownToggle);
                bsDropdown.show();
                console.log('Dropdown opened automatically for processId:', processId);
            }

            if (isError) {
                cleanupProcess(processId);
                window.general.showToast({
                    icon: 'error',
                    title: `${e.type.charAt(0).toUpperCase() + e.type.slice(1)} Failed`,
                    message: e.message,
                    duration: 5000
                });
            } else if (details.cancelled) {
                cleanupProcess(processId);
                window.general.showToast({
                    icon: 'warning',
                    title: `${e.type.charAt(0).toUpperCase() + e.type.slice(1)} Cancelled`,
                    message: e.message,
                    duration: 5000
                });
            } else if (isComplete) {
                window.general.showToast({
                    icon: 'success',
                    title: `${e.type.charAt(0).toUpperCase() + e.type.slice(1)} Completed`,
                    message: e.message,
                    duration: 5000
                });
            }

            if (isComplete || isError) {
                const timeout = isError ? 30000 : 5000;
                setTimeout(() => cleanupProcess(processId), timeout);
            }
        });

    activeChannels.set(processId, channel);
    console.log(`Listening on channel: ${USER_CHANNEL_PREFIX}.${processId}`);
}



function cleanupProcess(processId) {
    if (activeProcess.has(processId)) {
        activeProcess.get(processId).remove();
        activeProcess.delete(processId);
        console.log(`Removed DOM element for processId: ${processId}`);
    }
    if (activeChannels.has(processId)) {
        window.Echo.leave(`${USER_CHANNEL_PREFIX}.${processId}`);
        activeChannels.delete(processId);
        console.log(`Left channel: ${USER_CHANNEL_PREFIX}.${processId}`);
    }

    const savedImports = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const updatedProcess = savedImports.filter(imp => imp.processId !== processId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProcess));
    console.log(`Removed processId ${processId} from localStorage`);
}

function updateProgressUI(event, activeProcessPlaceholder) {
    const { process_id, type, percent, message, details } = event;
    const processId = process_id;

    if (!activeProcessPlaceholder) {
        console.warn('Active process placeholder not found');
        return;
    }

    let progressItem = activeProcess.get(processId);
    if (!progressItem) {
        progressItem = document.createElement('li');
        progressItem.className = 'dropdown-item p-0';
        progressItem.id = `${type}-progress-${processId}`;
        activeProcessPlaceholder.appendChild(progressItem);
        activeProcess.set(processId, progressItem);
        console.log(`Created new progress item for ${type}-progress-${processId}`);
    }

    const isError = (type === "normal" || type === "bulk" || type === "import") ? details?.status?.toLowerCase() === 'error' : !!details?.error;
    const isCancelled = (type === "normal" || type === "bulk" || type === "import") ? details?.cancelled : false;
    const isComplete = percent === 100 && !isError && !isCancelled;

    const fileName = (type === "normal" || type === "bulk" || type === "import") ? details?.file : (details?.files?.length ? details.files[details.files.length - 1].split('/').pop() : null);

    if (type === "normal" || type === "bulk" || type === "import") {
        progressItem.innerHTML = `
        <div class='border rounded border-1 p-1'>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div> 
                    ${fileName ? `<span class="badge bg-white text-dark border border-1 rounded-pill sf-10 me-2">${fileName}</span>` : ''}
                    <span class="badge bg-warning text-white border border-1 rounded-pill sf-10 me-2">${type}</span>
                </div>
                <div>   
                    <span class="import-status sf-10">${details?.status || 'In Progress'}</span>
                    <span class="import-status sf-10">${percent}%</span>
                </div>
            </div>
            <div class="progress" style="height: 8px;">
                <div class="progress-bar ${isError || isCancelled ? 'bg-danger' : 'bg-success'} progress-bar-striped ${percent < 100 ? 'progress-bar-animated' : ''}"
                     role="progressbar" style="width: ${percent}%"
                     aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
                </div>
            </div>
            ${message ? `
            <div class="d-flex justify-content-between py-1 px-2">
                <div>
                    <small>inserted: ${details?.inserted || 0}/${details?.total || 0}</small>
                    <small>rejected: ${details?.rejected || 0}</small>
                </div>
                ${!isCancelled ? `<div><a href="#" class="text-danger cancel-import" data-id="${processId}"><small>cancel</small></a></div>` : ''}
            </div>` : ''}
            ${details?.rejected_csv && !isCancelled ? `
            <div class="auto-download-container" data-file="${encodeURIComponent(details.rejected_csv)}">
                <div class="text-center py-2">
                    <div class="spinner-border spinner-border-sm text-danger me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <small class="text-muted">Preparing rejected rows download...</small>
                </div>
            </div>` : ''}
        </div>`;
    } else if (type === "export") {
        progressItem.innerHTML = `
        <div class='border rounded border-1 p-1'>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div> 
                    ${fileName ? `<span class="badge bg-white text-dark border border-1 rounded-pill sf-10 me-2">${fileName}</span>` : ''}
                    <span class="badge bg-warning text-white border border-1 rounded-pill sf-10 me-2">${type}</span>
                </div>
                <div>   
                    <span class="import-status sf-10">${isError ? 'Error' : isComplete ? 'Completed' : 'In Progress'}</span>
                    <span class="import-status sf-10">${percent}%</span>
                </div>
            </div>
            <div class="progress" style="height: 8px;">
                <div class="progress-bar ${isError ? 'bg-danger' : 'bg-success'} progress-bar-striped ${percent < 100 ? 'progress-bar-animated' : ''}"
                     role="progressbar" style="width: ${percent}%"
                     aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
                </div>
            </div>
            ${message ? `
            <div class="d-flex justify-content-between py-1 px-2">
                <div>
                    <small>exported: ${details?.chunk_count || 0} chunks/${details?.total_rows || 0} rows</small>
                </div>
            </div>` : ''}
            ${details?.files?.length && isComplete ? `
            <div class="auto-download-container" data-process-id="${processId}">
                <div class="text-center py-2">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <small class="text-muted">Preparing export files download...</small>
                </div>
            </div>` : ''}
        </div>`;
    }

    // Auto-download for import rejected_csv
    if ((type === "normal" || type === "bulk" || type === "import") && details?.rejected_csv && !progressItem.downloadInitiated) {
        progressItem.downloadInitiated = true;
        setTimeout(() => {
            const downloadLink = document.createElement('a');
            downloadLink.href = `/download-rejected/${encodeURIComponent(details.rejected_csv)}`;
            downloadLink.style.display = 'none';
            downloadLink.download = fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            const container = progressItem.querySelector('.auto-download-container');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-success py-1 px-2 mb-0">
                        <small>
                            <i class="fas fa-check-circle me-1"></i>
                            Rejected rows downloaded successfully
                        </small>
                    </div>`;
            }
            console.log(`Auto-downloaded rejected CSV: ${details.rejected_csv} for processId: ${processId}`);
        }, 1500);
    }

    // Auto-download for export ZIP file when complete
    if (type === "export" && isComplete && details?.files?.length && !progressItem.downloadInitiated) {
        progressItem.downloadInitiated = true;
        setTimeout(() => {
            const downloadLink = document.createElement('a');
            downloadLink.href = `/download-export/${encodeURIComponent(processId)}`;
            downloadLink.style.display = 'none';
            downloadLink.download = `export_${processId}.zip`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            const container = progressItem.querySelector('.auto-download-container');
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-success py-1 px-2 mb-0">
                        <small>
                            <i class="fas fa-check-circle me-1"></i>
                            Export files downloaded successfully
                        </small>
                    </div>`;
            }
            console.log(`Auto-downloaded export ZIP for processId: ${processId}`);
        }, 1500);
    }

    return { isComplete, isError, processId };
}

function updateStoredImports(event) {
    const { process_id, type, percent, message, details } = event;
    const savedImports = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const existingIndex = savedImports.findIndex(imp => imp.processId === process_id);
    const importData = {
        processId: process_id,
        type,
        percent,
        message,
        details,
        timestamp: Date.now()
    };

    if (percent === 100 || (type === "export" ? details?.error : details?.status?.toLowerCase() === 'error') || (type !== "export" && details?.cancelled)) {
        if (existingIndex !== -1) {
            savedImports.splice(existingIndex, 1);
            console.log(`Removed completed/failed/cancelled processId ${process_id} from localStorage`);
        }
    } else if (existingIndex !== -1) {
        savedImports[existingIndex] = importData;
        console.log(`Updated processId ${process_id} in localStorage`);
    } else {
        savedImports.push(importData);
        console.log(`Added processId ${process_id} to localStorage`);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedImports));
}

function restoreactiveProcess() {
    const savedImports = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const activeProcessPlaceholder = document.querySelector('.active-imports-placeholder');

    const filteredImports = savedImports.filter(imp => {
        const isActive = imp.percent < 100 &&
                        !(imp.type !== "export" && imp.details?.cancelled) &&
                        !(imp.type === "export" && imp.details?.error) &&
                        Date.now() - imp.timestamp < 86400000; // 24-hour expiration
        if (!isActive) {
            console.log(`Filtered out processId ${imp.processId} (type: ${imp.type}, percent: ${imp.percent}, cancelled: ${imp.details?.cancelled}, error: ${imp.details?.error})`);
        }
        return isActive;
    });

    if (filteredImports.length !== savedImports.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredImports));
        console.log(`Updated localStorage with ${filteredImports.length} active processes`);
    }

    filteredImports.forEach(importData => {
        const { processId, type, percent, message, details } = importData;
        console.log(`Restoring processId ${processId} (type: ${type}, percent: ${percent})`);

        // Avoid duplicate listeners
        if (!activeChannels.has(processId)) {
            const channel = window.Echo.channel(`${USER_CHANNEL_PREFIX}.${processId}`)
                .listen('.progress', (e) => {
                    console.log(`Restored channel received event for ${e.type} with processId: ${processId}`, e);
                    updateProgressUI(e, activeProcessPlaceholder);
                    updateStoredImports(e);
                });
            activeChannels.set(processId, channel);
            console.log(`Restored channel for processId: ${processId}`);
        }

        updateProgressUI({ process_id: processId, type, percent, message, details }, activeProcessPlaceholder);
    });
}

document.addEventListener('click', async function (e) {
    const target = e.target.closest('.cancel-import') || e.target.closest('.download-export');
    if (!target) return;
    window.general.initAddons();
    e.preventDefault();

    if (target.classList.contains('cancel-import')) {
        const processId = target.dataset.id;
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'Do you really want to cancel this process?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, cancel it',
            cancelButtonText: 'No, keep it'
        });

        if (!result.isConfirmed) return;

        try {
            const response = await fetch(`/process/cancel/${encodeURIComponent(processId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ reason: 'User cancelled' })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to cancel process');
            }
            cleanupProcess(processId);
            console.log(`Cancelled processId ${processId}`);
        } catch (err) {
            await Swal.fire({
                title: 'Error!',
                text: err.message || 'An error occurred while cancelling the process.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            console.error(`Error cancelling processId ${processId}:`, err);
        }
    } else if (target.classList.contains('download-export')) {
        const processId = target.dataset.id;
        const files = JSON.parse(decodeURIComponent(target.dataset.files));
        files.forEach(file => {
            const downloadLink = document.createElement('a');
            downloadLink.href = `/download-export/${encodeURIComponent(file)}`;
            downloadLink.style.display = 'none';
            downloadLink.download = file.split('/').pop();
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            console.log(`Downloaded export file: ${file} for processId: ${processId}`);
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (!window.userId) {
        console.error("Missing userId. Set window.userId before loading import.js.");
        return;
    }

    USER_CHANNEL_PREFIX = `progress.user.${window.userId}`;
    restoreactiveProcess();

    const importBtn = document.querySelector('[data-role="import"]');
    const matchBtn = document.querySelector('[data-role="match"]');
    const resetBtn = document.querySelector('[data-role="reset"]');
    const mappingContainer = document.querySelector('[data-role="mapping-container"]');
    const form = document.querySelector('form.static');

    if (matchBtn) {
        matchBtn.addEventListener('click', () => {
            initHeaderMatchEcho();
            
        });
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.querySelectorAll('select').forEach(select => {
                select.disabled = false;
            });

            if (mappingContainer) {
                mappingContainer.innerHTML = '';
            }
            let tokenInput = form.querySelector('input[name="save_token"]');
            if (tokenInput && window.currentToken) {
                tokenInput.value = `${window.currentToken}m`;
            }
            importBtn.disabled = false;
            importBtn.textContent = 'Import';
            importBtn.classList.add('d-none');
            matchBtn.classList.remove('d-none');
            resetBtn.classList.add('d-none');
            console.log('Reset button clicked');
        });
    }

    if (importBtn && form) {
        importBtn.addEventListener('click', (e) => {
            e.preventDefault();

            document.querySelectorAll('select').forEach(select => {
                select.disabled = false;
            });

            const { mapping } = getFinalMapping();
            const processId = generateProcessId();
            listenProgress(processId);
            const tokenInput = form.querySelector('input[name="save_token"]');
            if (tokenInput && window.currentToken) {
                tokenInput.value = `${window.currentToken}f`;
            }

            ['mapping', 'process_id'].forEach(name => {
                const existingInput = form.querySelector(`input[name="${name}"]`);
                if (existingInput) {
                    existingInput.remove();
                }
            });

            const inputs = [
                { name: 'mapping', value: JSON.stringify(mapping) },
                { name: 'process_id', value: processId },
            ];

            inputs.forEach(input => {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = input.name;
                hiddenInput.value = input.value;
                form.appendChild(hiddenInput);
            });
            importBtn.disabled = true;
            importBtn.textContent = 'Importing...';
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            console.log(`Started import process with processId: ${processId}`);
        });
    }
});