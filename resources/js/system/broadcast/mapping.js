import './index.js';
import Sortable from 'sortablejs';

let currentTable = '';

export function initHeaderMatchEcho() {
    console.log("Initializing Echo listener...");

    if (window.headerMatchChannel) {
        window.Echo.leave(`match.headers.${window.userId}`);
    }

    window.headerMatchChannel = window.Echo.channel(`match.headers.${window.userId}`);
    window.headerMatchChannel.listen('.headers', (e) => {
        console.log('Received broadcast:', e);

        if (!Array.isArray(e.map)) {
            console.error('Invalid or missing map in broadcast payload:', e.map);
            return;
        }
        const [columns, matched, unmatched, table, path, token] = e.map;
        window.currentToken = token.slice(0, -1);
        window.currentCsvFile = path;
        currentTable = table;

        renderTargets(columns, matched, unmatched);
    });
}

export function renderTargets(columns = [], matched = [], unmatched = []) {
    modifybtn();
    const mappingContainer = document.querySelector('[data-role="mapping-container"]');
    if (!mappingContainer) {
        console.error('mapping-container not found');
        return;
    }
    document.querySelectorAll('select').forEach(select => {
        select.disabled = true;
    });


    mappingContainer.innerHTML = `
        <div class="row g-4 mt-3">
            <div class="col-md-6">
                <div class="mapping-card shadow-none border border-1">
                    <div class="card-header bg-info">
                        <h6 class="mb-0 text-white">Mapping Targets</h6>
                    </div>
                    <div id="column-targets" class="card-body p-3"></div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="mapping-card shadow-none border border-1">
                    <div class="card-header bg-info">
                        <h6 class="mb-0 text-white">Available Columns (${unmatched.length})</h6>
                    </div>
                    <div id="unmatched-list" class="card-body p-3 mapping-list">
                        ${unmatched.length ? '' : '<div class="text-muted text-center py-3">All columns are mapped</div>'}
                    </div>
                </div>
            </div>
        </div>
    `;

    const unmatchedList = document.getElementById('unmatched-list');
    if (unmatchedList) {
        unmatchedList.innerHTML = unmatched.map(col => `
            <div class="mapping-column-pill unmapped-pill" data-column="${col}">
                <span class="column-text">${col}</span>
                <span class="badge rounded-pill sf-10 forced-badge border border-1 bg-white text-danger">Drag to map</span>
            </div>
        `).join('');
    }

    const targetsContainer = document.getElementById('column-targets');
if (targetsContainer) {
    targetsContainer.innerHTML = columns.map(col => {
        const match = matched.find(m => m.db === col) || {};
        const isForced = match.forced !== undefined ? match.forced : (match.csv && match.csv !== col);
        return `
            <div class="target-slot mb-2" data-target="${col}">
                <div id="match-slot-${col}" class="mapping-dropzone p-0 ${match.csv ? '' : 'empty-slot'}">
                    ${match.csv ? `
                        <div class="mapping-column-pill ${isForced ? 'forced-pill' : 'mapped-pill'}" data-column="${match.csv}">
                            <span class="column-text">${isForced ? `[${col}: ${match.csv}]` : match.csv}</span>
                            <span class="badge rounded-pill sf-10 forced-badge border border-1 bg-white ${isForced ? 'text-warning' : 'text-success'}">
                                ${isForced ? 'Forced' : 'Mapped'}
                            </span>
                        </div>
                    ` : `
                        <div class="empty-placeholder">${col}</div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}
    initSortable();
}

function initSortable() {
    const unmatchedList = document.getElementById('unmatched-list');
    if (unmatchedList) {
        new Sortable(unmatchedList, {
            group: 'headers',
            animation: 150,
            sort: true,
            ghostClass: 'ghost-item',
            onEnd: updateUnmatchedCount,
            onAdd: evt => {
                handleItemAdd(evt);
                updateUnmatchedCount();
            }
        });
    }

    const dropzones = document.querySelectorAll('.mapping-dropzone');
    dropzones.forEach(dropzone => {
        new Sortable(dropzone, {
            group: 'headers',
            animation: 150,
            ghostClass: 'ghost-item',
            onAdd: evt => {
                Array.from(evt.to.children).forEach(child => {
                    if (child !== evt.item && child.classList.contains('mapping-column-pill')) {
                        child.classList.remove('mapped-pill', 'forced-pill');
                        child.classList.add('unmapped-pill');
                        const badge = child.querySelector('.badge');
                        if (badge) {
                            badge.textContent = 'Drag to map';
                            badge.className = 'badge rounded-pill sf-10 forced-badge border border-1 bg-white text-danger';
                        }
                        document.getElementById('unmatched-list')?.appendChild(child);
                    }
                });

                handleItemAdd(evt);
                updateUnmatchedCount();
            },
            onRemove: evt => {
                handleItemRemove(evt);
                updateUnmatchedCount();
            },
            put: to => !to.el.querySelector('.mapping-column-pill')
        });
    });
}

function handleItemAdd(evt) {
    const item = evt.item;
    const isUnmatchedList = evt.to.id === 'unmatched-list';
    const targetColumn = evt.to.parentElement?.dataset.target;
    const pillColumn = item.dataset.column;
    const isForced = pillColumn !== targetColumn;

    // Reset pill classes
    item.className = 'mapping-column-pill';
    
    // Set pill type class
    if (isUnmatchedList) {
        item.classList.add('unmapped-pill');
    } else {
        item.classList.add(isForced ? 'forced-pill' : 'mapped-pill');
    }

    // Get or create badge and text elements
    let badge = item.querySelector('.badge');
    let columnText = item.querySelector('.column-text');
    
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'badge rounded-pill sf-10 forced-badge border border-1 bg-white';
        item.appendChild(badge);
    }
    
    if (!columnText) {
        columnText = document.createElement('span');
        columnText.className = 'column-text d-flex align-items-center gap-1';
        item.insertBefore(columnText, badge);
    }

    // Handle different states
    if (isUnmatchedList) {
        // In unmatched list (available columns)
        columnText.innerHTML = pillColumn;
        badge.className = 'badge rounded-pill sf-10 forced-badge border border-1 bg-white text-danger';
        badge.textContent = 'Drag to map';
    } else {
        // In a target dropzone
        if (isForced) {
            // Forced mapping (column name doesn't match target)
            columnText.innerHTML = `
                <span class="target-col">${targetColumn}</span>
                <i class="fas fa-arrow-right text-muted mx-1" style="font-size: 0.7rem;"></i>
                <span class="csv-col">${pillColumn}</span>
            `;
            badge.className = 'badge rounded-pill sf-10 forced-badge border border-1 bg-white text-warning';
            badge.textContent = 'Forced';
        } else {
            // Perfect match
            columnText.innerHTML = pillColumn;
            badge.className = 'badge rounded-pill sf-10 forced-badge border border-1 bg-white text-success';
            badge.textContent = 'Mapped';
        }
    }

    // Update dropzone appearance
    if (!isUnmatchedList) {
        evt.to.classList.remove('empty-slot');
        const placeholder = evt.to.querySelector('.empty-placeholder');
        if (placeholder) placeholder.remove();
    }
}

function handleItemRemove(evt) {
    if (evt.from.children.length === 0 && evt.from.id !== 'unmatched-list') {
        evt.from.classList.add('empty-slot');
        const col = evt.from.parentElement.dataset.target;
        evt.from.innerHTML = `<div class="empty-placeholder">${col}</div>`;
    }
}

function updateUnmatchedCount() {
    const unmatchedList = document.getElementById('unmatched-list');
    if (!unmatchedList) return;

    const unmatchedCount = unmatchedList.querySelectorAll('.unmapped-pill').length;
    const title = unmatchedList.closest('.mapping-card')?.querySelector('.card-header h6');
    if (title) title.textContent = `Available Columns (${unmatchedCount})`;

    if (unmatchedCount === 0 && !unmatchedList.querySelector('.text-muted')) {
        unmatchedList.innerHTML = '<div class="text-muted text-center py-3">All columns are mapped</div>';
    } else if (unmatchedCount > 0 && unmatchedList.querySelector('.text-muted')) {
        unmatchedList.innerHTML = Array.from(unmatchedList.querySelectorAll('.unmapped-pill')).map(pill => pill.outerHTML).join('');
    }
}

export function getFinalMapping() {
    const mapping = {};

    document.querySelectorAll('.target-slot').forEach(slot => {
        const dbColumn = slot.dataset.target;
        const pill = slot.querySelector('.mapping-column-pill');
        const csvHeader = pill ? pill.dataset.column : null;
        mapping[csvHeader] = dbColumn;
    });
    console.log(mapping);
    return {
        path: window.currentCsvFile || '',
        table: currentTable,
        mapping: mapping
    };
}


export async function submitMappedHeaders() {
    const { mapping, path, table } = getFinalMapping();
    
    const token = window.currentToken;
    const file = path;

    if (!token) {
        alert('Token not found!');
        return;
    }

    const payload = {
        save_token: token,
        table,
        file,
        mapping,
        skeleton_view: 'import',
        skeleton_action: 'submit_mapping'
    };
    return payload;
}
export function modifybtn(){
    const importBtn = document.querySelector('[data-role="import"]');
    const matchBtn = document.querySelector('[data-role="match"]');
    const resetBtn = document.querySelector('[data-role="reset"]');
    importBtn.classList.remove('d-none');
    matchBtn.classList.add('d-none');
    resetBtn.classList.remove('d-none');
    console.log('Match headers clicked');
}
