{{-- Template: Mapping Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Mapping')
@section('top-style')
    <link rel="stylesheet" href="{{ asset('treasury/libraries/visuals/datatables/datatables.min.css') }}">
    <style>
        .checkbox-list {
            max-height: 250px;
            overflow-y: auto;
            padding: 10px;
            border: 1px solid #ced4da;
            border-radius: 0.25rem;
            background-color: #fff;
        }

        .form-check {
            margin-bottom: 8px;
        }

        .section-container {
            margin-bottom: 2rem;
        }

        .text-muted {
            text-align: center;
            padding: 10px;
        }

        .form-floating label {
            font-size: 0.9rem;
        }

        #newTableSection {
            margin-top: 1rem;
        }

        .suggestion {
            color: #007bff;
            cursor: pointer;
        }

        .preview-table {
            max-height: 200px;
            overflow-y: auto;
        }

        .upload-card .card-body {
            padding: 1.5rem;
            background-color: #f8f9fa;
            border-radius: 0.25rem;
        }

        .upload-card .form-floating input {
            border-color: #ced4da;
        }

        .progress-btn {
            position: relative;
            width: 100%;
            height: 40px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 0.25rem;
            font-weight: bold;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .progress-btn:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }

        .progress-bar-inner {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background-color: #28a745;
            transition: width 0.3s ease-in-out;
        }

        .progress-text {
            position: relative;
            z-index: 1;
            line-height: 40px;
        }

        .time-taken {
            font-size: 0.9rem;
            color: #28a745;
            text-align: center;
            margin-top: 0.5rem;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        }

        .time-taken.visible {
            opacity: 1;
        }

        .map-fields-container {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }

        .fields-list-wrapper {
            flex: 1 1 45%;
        }

        .fields-list {
            max-height: 250px;
            overflow-y: auto;
            padding: 10px;
            border: 1px solid #ced4da;
            border-radius: 0.25rem;
            background-color: #fff;
        }

        .selected-pills {
            flex: 1;
            max-height: 250px;
            overflow-y: auto;
            padding: 10px;
            border: 1px solid #ced4da;
            border-radius: 0.25rem;
            background-color: #f8f9fa;
        }

        .pill {
            display: inline-flex;
            align-items: center;
            flex-direction: column;
            background-color: #007bff;
            color: white;
            padding: 8px 12px;
            margin: 3px;
            border-radius: 15px;
            font-size: 0.9rem;
            position: relative;
            min-width: 120px;
        }
        
        .pill-excellent {
            background-color: #28a745; /* Green for excellent matches */
            border: 2px solid #1e7e34;
        }
        
        .pill-good {
            background-color: #17a2b8; /* Teal for good matches */
            border: 2px solid #138496;
        }
        
        .pill-fair {
            background-color: #ffc107; /* Yellow for fair matches */
            color: #212529;
            border: 2px solid #e0a800;
        }
        
        .pill-weak {
            background-color: #dc3545; /* Red for weak matches */
            border: 2px solid #c82333;
        }
        
        .pair-text {
            font-weight: 500;
            text-align: center;
        }
        
        .confidence-text {
            font-size: 0.7rem;
            opacity: 0.8;
            margin-top: 2px;
            font-weight: 300;
        }

        .pill-close {
            position: absolute;
            top: -5px;
            right: -5px;
            background-color: rgba(255, 255, 255, 0.9);
            color: #333;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.8rem;
            border: 1px solid #ddd;
        }
        
        .pill-close:hover {
            background-color: #ff4757;
            color: white;
            border-color: #ff3742;
        }
        
        .selected-pills {
            min-height: 50px;
            padding: 10px;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            background-color: #f8f9fa;
        }
        
        .selected-pills:empty::before {
            content: 'No field pairs selected. Use Auto Match or manually add pairs.';
            color: #6c757d;
            font-style: italic;
        }
        
        .auto-match-legend {
            font-size: 0.8rem;
            margin-top: 10px;
        }
        
        .legend-item {
            display: inline-flex;
            align-items: center;
            margin-right: 15px;
            margin-bottom: 5px;
        }
        
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 3px;
            margin-right: 5px;
        }
    </style>
@endsection

@section('bottom-script')
<script>
    (function() {
        const actionUrl = "{{ url('/skeleton-action/') }}/@skeletonToken('central_filters_mapping')_f";
        const saveToken = "@skeletonToken('central_filters_mapping')_f";

        const uploadDbSel = document.getElementById('uploadDatabase');
        const mainDbSel = document.getElementById('mainDatabase');
        const mainTableSel = document.getElementById('mainTable');
        const mappedDbSel = document.getElementById('mappedDatabase');
        const mappedTableSel = document.getElementById('mappedTable');
        const newTableNameInput = document.getElementById('newTableName');
        const fileInput = document.getElementById('fileInput');
        const createTableBtn = document.getElementById('createTableBtn');
        const uploadFileBtn = document.getElementById('uploadFileBtn');
        const uploadStatus = document.getElementById('uploadStatus');
        const mainFieldsList = document.getElementById('mainFieldsList');
        const mappedFieldsList = document.getElementById('mappedFieldsList');
        // New elements for explicit field pairing
        let mainFieldsCache = [];
        let mappedFieldsCache = [];
        const fieldPairContainerId = 'fieldPairContainer';

        function csrfHeaders() {
            const meta = document.querySelector('meta[name="csrf-token"]');
            return meta ? { 'X-CSRF-TOKEN': meta.getAttribute('content') } : {};
        }

        function postAction(action, data = {}, files = null) {
            const fd = new FormData();
            fd.append('save_token', saveToken);
            fd.append('action', action);
            Object.entries(data).forEach(([k,v]) => {
                if (Array.isArray(v)) {
                    // Handle arrays of objects properly
                    v.forEach((x, index) => {
                        if (typeof x === 'object' && x !== null) {
                            // For objects, append each property with proper indexing
                            Object.entries(x).forEach(([prop, val]) => {
                                fd.append(`${k}[${index}][${prop}]`, val);
                            });
                        } else {
                            // For primitive values
                            fd.append(k+'[]', x);
                        }
                    });
                } else if (v !== undefined && v !== null) {
                    fd.append(k, v);
                }
            });
            if (files) Object.entries(files).forEach(([k,v]) => v && fd.append(k, v));
            return fetch(actionUrl, { method: 'POST', headers: csrfHeaders(), body: fd })
                .then(async r => { const j = await r.json().catch(()=>({})); if (!r.ok || j.status===false) throw new Error(j.message||j.error||'Request failed'); return j; });
        }

        function populateSelect(el, items) {
            el.innerHTML='';
            // Add default option first
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.textContent = items && items.length > 0 ? 'Select an option' : 'No options available';
            el.appendChild(defaultOption);
            
            const frag = document.createDocumentFragment();
            (items||[]).forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; frag.appendChild(o); });
            el.appendChild(frag);
            
            console.log('Populated select', el.id, 'with', (items||[]).length, 'items');
        }

        function renderMainFieldsList(headers) {
            mainFieldsList.innerHTML = '';
            if (!headers?.length) {
                mainFieldsList.innerHTML = '<p class="text-muted">No headers found</p>';
                return;
            }
            headers.forEach(h => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'btn btn-outline-primary btn-sm m-1';
                b.textContent = h;
                b.draggable = true;
                b.addEventListener('dragstart', (ev) => {
                    ev.dataTransfer.setData('text/plain', 'main:' + h);
                });
                b.addEventListener('click', () => {
                    document.getElementById('mainFieldSelect').value = h;
                });
                mainFieldsList.appendChild(b);
            });
        }

        function renderMappedFieldsList(headers) {
            mappedFieldsList.innerHTML = '';
            if (!headers?.length) {
                mappedFieldsList.innerHTML = '<p class="text-muted">No headers found</p>';
                return;
            }
            headers.forEach(h => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'btn btn-outline-primary btn-sm m-1';
                b.textContent = h;
                b.draggable = true;
                b.addEventListener('dragstart', (ev) => {
                    ev.dataTransfer.setData('text/plain', 'mapped:' + h);
                });
                b.addEventListener('click', () => {
                    document.getElementById('mappedFieldSelect').value = h;
                });
                mappedFieldsList.appendChild(b);
            });
        }

        function refreshTables(selectDbEl, selectTableEl){ 
            if(!selectDbEl.value) {
                populateSelect(selectTableEl, []);
                return; 
            }
            console.log('Refreshing tables for database:', selectDbEl.value);
            postAction('get_tables', { database: selectDbEl.value }).then(r=>{ 
                console.log('Tables received:', r.tables);
                populateSelect(selectTableEl, r.tables); 
                // Only trigger change if there are tables and a selection was made
                if(r.tables && r.tables.length > 0) {
                    selectTableEl.dispatchEvent(new Event('change')); 
                }
            }).catch(e=>{
                console.error('Error fetching tables:', e.message);
                populateSelect(selectTableEl, []);
            }); 
        }

        // Robust change handling via delegation because some selects may be re-rendered by dynamic loaders
        document.addEventListener('change', function(e){
            const id = e.target?.id;
            if (id === 'mainDatabase') {
                const curMainDb = document.getElementById('mainDatabase');
                const curMainTable = document.getElementById('mainTable');
                fieldMappings=[]; renderPills(); 
                // Clear main fields cache when database changes
                mainFieldsCache = [];
                renderMainFieldsList([]);
                refreshTables(curMainDb, curMainTable);
            }
            if (id === 'mappedDatabase') {
                const curMappedDb = document.getElementById('mappedDatabase');
                const curMappedTable = document.getElementById('mappedTable');
                fieldMappings=[]; renderPills(); 
                // Clear mapped fields cache when database changes
                mappedFieldsCache = [];
                renderMappedFieldsList([]);
                refreshTables(curMappedDb, curMappedTable);
            }
            if (id === 'uploadDatabase') { /* No action needed beyond upload */ }
            if (id === 'mappedTable') {
                const curMappedDb = document.getElementById('mappedDatabase');
                const curMappedTable = document.getElementById('mappedTable');
                console.log('Mapped table changed:', curMappedDb?.value, curMappedTable?.value);
                if(!curMappedDb?.value||!curMappedTable?.value) {
                    mappedFieldsCache = [];
                    renderMappedFieldsList([]);
                    renderPairingUI();
                    return;
                }
                
                // Parse table name in case it contains database prefix
                let database = curMappedDb.value;
                let table = curMappedTable.value;
                
                if (table.includes('.')) {
                    const parts = table.split('.');
                    if (parts.length === 2) {
                        database = parts[0];
                        table = parts[1];
                        console.log('Parsed mapped table - Database:', database, 'Table:', table);
                    }
                }
                
                postAction('get_table_fields', { database: database, table: table }).then(r=>{
                    console.log('Mapped fields received:', r.fields);
                    mappedFieldsCache = r.fields || [];
                    renderMappedFieldsList(mappedFieldsCache);
                    renderPairingUI();
                    // Auto-suggest pairs when both field caches are available
                    if (mainFieldsCache?.length && mappedFieldsCache?.length) {
                        tryAutoSuggestPairs();
                    }
                }).catch(e=>{
                    console.error('Error fetching mapped fields:', e.message);
                    mappedFieldsCache = [];
                    renderMappedFieldsList([]);
                });
            }
            if (id === 'mainTable') {
                const curMainDb = document.getElementById('mainDatabase');
                const curMainTable = document.getElementById('mainTable');
                console.log('Main table changed:', curMainDb?.value, curMainTable?.value);
                if(!curMainDb?.value||!curMainTable?.value) {
                    mainFieldsCache = [];
                    renderMainFieldsList([]);
                    renderPairingUI();
                    return;
                }
                
                // Parse table name in case it contains database prefix
                let database = curMainDb.value;
                let table = curMainTable.value;
                
                if (table.includes('.')) {
                    const parts = table.split('.');
                    if (parts.length === 2) {
                        database = parts[0];
                        table = parts[1];
                        console.log('Parsed main table - Database:', database, 'Table:', table);
                    }
                }
                
                postAction('get_table_fields', { database: database, table: table }).then(r=>{
                    console.log('Main fields received:', r.fields);
                    mainFieldsCache = r.fields || [];
                    renderMainFieldsList(mainFieldsCache);
                    renderPairingUI();
                    // Auto-suggest pairs when both field caches are available
                    if (mainFieldsCache?.length && mappedFieldsCache?.length) {
                        tryAutoSuggestPairs();
                    }
                }).catch(e=>{
                    console.error('Error fetching main fields:', e.message);
                    mainFieldsCache = [];
                    renderMainFieldsList([]);
                });
            }
            if (e.target.name === 'resultType2') {
                document.getElementById('emptyDefinition').classList.toggle('d-none', e.target.value !== 'all_empty');
            }
        }, true);

        // MutationObserver to detect dynamic changes in select options and trigger 'change'
        const observerConfig = { childList: true };
        const mainTableObserver = new MutationObserver(() => mainTableSel.dispatchEvent(new Event('change')));
        mainTableObserver.observe(mainTableSel, observerConfig);
        const mappedTableObserver = new MutationObserver(() => mappedTableSel.dispatchEvent(new Event('change')));
        mappedTableObserver.observe(mappedTableSel, observerConfig);

        // On initial load, if both tables already selected (e.g. restored by the dynamic loader), fetch headers immediately
        function fetchFieldsIfSelected(){
            const curMappedDb = document.getElementById('mappedDatabase');
            const curMappedTable = document.getElementById('mappedTable');
            const curMainDb = document.getElementById('mainDatabase');
            const curMainTable = document.getElementById('mainTable');
            
            console.log('Initial fetch check - Mapped:', curMappedDb?.value, curMappedTable?.value);
            console.log('Initial fetch check - Main:', curMainDb?.value, curMainTable?.value);
            
            if (curMappedDb?.value && curMappedTable?.value) {
                console.log('Fetching mapped fields on load');
                
                // Parse table name in case it contains database prefix
                let database = curMappedDb.value;
                let table = curMappedTable.value;
                
                if (table.includes('.')) {
                    const parts = table.split('.');
                    if (parts.length === 2) {
                        database = parts[0];
                        table = parts[1];
                        console.log('Parsed initial mapped table - Database:', database, 'Table:', table);
                    }
                }
                
                postAction('get_table_fields', { database: database, table: table })
                    .then(r=>{ 
                        console.log('Initial mapped fields loaded:', r.fields);
                        mappedFieldsCache = r.fields || []; 
                        renderMappedFieldsList(mappedFieldsCache); 
                        renderPairingUI(); 
                        // Auto-suggest pairs when both field caches are available
                        if (mainFieldsCache?.length && mappedFieldsCache?.length) {
                            tryAutoSuggestPairs();
                        }
                    })
                    .catch(e=>console.error('Error loading initial mapped fields:', e));
            }
            if (curMainDb?.value && curMainTable?.value) {
                console.log('Fetching main fields on load');
                
                // Parse table name in case it contains database prefix
                let database = curMainDb.value;
                let table = curMainTable.value;
                
                if (table.includes('.')) {
                    const parts = table.split('.');
                    if (parts.length === 2) {
                        database = parts[0];
                        table = parts[1];
                        console.log('Parsed initial main table - Database:', database, 'Table:', table);
                    }
                }
                
                postAction('get_table_fields', { database: database, table: table })
                    .then(r=>{ 
                        console.log('Initial main fields loaded:', r.fields);
                        mainFieldsCache = r.fields || []; 
                        renderMainFieldsList(mainFieldsCache); 
                        renderPairingUI(); 
                        // Auto-suggest pairs when both field caches are available
                        if (mainFieldsCache?.length && mappedFieldsCache?.length) {
                            tryAutoSuggestPairs();
                        }
                    })
                    .catch(e=>console.error('Error loading initial main fields:', e));
            }
        }
        
        // Multiple attempts to ensure fields are loaded properly
        window.setTimeout(fetchFieldsIfSelected, 500);
        window.setTimeout(fetchFieldsIfSelected, 1500);
        window.setTimeout(fetchFieldsIfSelected, 3000);

        createTableBtn?.addEventListener('click', (e)=>{
            e.preventDefault();
            const targetDb = uploadDbSel.value;
            if (!targetDb) { alert('Please select a database first'); return; }
            const file = fileInput.files && fileInput.files[0];
            if (!file) { alert('Please choose a CSV file'); return; }
            createTableBtn.disabled = true; uploadStatus.classList.remove('d-none');
            postAction('upload_csv', { mapped_database: targetDb, new_table_name: newTableNameInput.value || '' }, { csv_file: file })
                .then(r=>{
                    console.log('CSV upload successful:', r);
                    // Auto-select the uploaded table in mapped selects (matching before code behavior)
                    mappedDbSel.value = targetDb;
                    mappedDbSel.dispatchEvent(new Event('change'));
                    postAction('get_tables', { database: targetDb }).then(tt=>{
                        populateSelect(mappedTableSel, tt.tables);
                        mappedTableSel.value = r.table;
                        // Force trigger the change event to load fields
                        mappedTableSel.dispatchEvent(new Event('change'));
                        
                        // Also ensure fields are fetched after a short delay
                        setTimeout(() => {
                            if(mappedTableSel.value === r.table) {
                                console.log('Force fetching mapped fields after upload');
                                postAction('get_table_fields', { database: targetDb, table: r.table })
                                    .then(fr=>{
                                        mappedFieldsCache = fr.fields || [];
                                        renderMappedFieldsList(mappedFieldsCache);
                                        renderPairingUI();
                                    })
                                    .catch(e=>console.error('Error force fetching fields:', e));
                            }
                        }, 500);
                        
                        alert(r.message);
                    }).catch(e=>alert(e.message));
                })
                .catch(e2=>alert(e2.message))
                .finally(()=>{ createTableBtn.disabled = false; uploadStatus.classList.add('d-none'); });
        });

        uploadFileBtn?.addEventListener('click', (e)=>{ e.preventDefault(); createTableBtn.click(); });

        // Add drag-drop handlers to lists
        [mainFieldsList, mappedFieldsList].forEach(list => {
            list.addEventListener('dragover', (e) => e.preventDefault());
            list.addEventListener('drop', (e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('text/plain');
                const targetBtn = e.target.closest('button.btn');
                if (!targetBtn) return;
                const targetField = targetBtn.textContent;
                const targetListId = list.id;
                if (data.startsWith('main:')) {
                    const mainField = data.substring(5);
                    if (targetListId === 'mappedFieldsList') {
                        addFieldPair(mainField, targetField);
                    }
                } else if (data.startsWith('mapped:')) {
                    const mappedField = data.substring(7);
                    if (targetListId === 'mainFieldsList') {
                        addFieldPair(targetField, mappedField);
                    }
                }
            });
        });

        // Mapping, processing, preview, export logic
        const selectedPills = document.getElementById('selectedPills');
        const processBtn = document.getElementById('processBtn');
        const outputFieldsList = document.getElementById('outputFieldsList');
        const previewTable = document.getElementById('previewTable');
        const totalRecordsP = document.getElementById('totalRecords');
        const exportBtn = document.getElementById('exportBtn');
        const resetBtn = document.getElementById('resetBtn');
        const undoBtn = document.getElementById('undoBtn');
        const customFilterInput = document.getElementById('customFilter');
        const addPairBtn = document.getElementById('addPairBtn');

        let fieldMappings = [];
        let lastActionStack = [];
        let lastImmediateResult = null; // full data for small dataset
        let lastProcessMeta = null;     // { process_id }

        addPairBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const mf = document.getElementById('mainFieldSelect').value;
            const mpf = document.getElementById('mappedFieldSelect').value;
            addFieldPair(mf, mpf);
        });

        function renderPills(){
            selectedPills.innerHTML='';
            fieldMappings.forEach((pair, index) => {
                const p = document.createElement('span');
                p.className = 'pill';
                
                // Add confidence indicator if available
                const confidenceText = pair.confidence ? ` (${pair.confidence}% match)` : '';
                p.innerHTML = `
                    <span class="pair-text">${pair.main} ⇄ ${pair.mapped}</span>
                    ${pair.confidence ? `<small class="confidence-text">${confidenceText}</small>` : ''}
                `;
                
                // Add confidence-based styling
                if (pair.confidence) {
                    if (pair.confidence >= 90) p.classList.add('pill-excellent');
                    else if (pair.confidence >= 80) p.classList.add('pill-good');
                    else if (pair.confidence >= 70) p.classList.add('pill-fair');
                    else p.classList.add('pill-weak');
                }
                
                const c = document.createElement('span');
                c.className = 'pill-close';
                c.textContent = '×';
                c.addEventListener('click', () => {
                    fieldMappings = fieldMappings.filter(x => !(x.main === pair.main && x.mapped === pair.mapped));
                    renderPills();
                });
                
                p.appendChild(c);
                selectedPills.appendChild(p);
            });
            
            // Update pair count badge
            const pairCountBadge = document.getElementById('pairCount');
            if (pairCountBadge) {
                pairCountBadge.textContent = fieldMappings.length;
                pairCountBadge.className = fieldMappings.length > 0 ? 'badge bg-success' : 'badge bg-secondary';
            }
            
            // Show/hide legend based on whether there are confidence scores
            const matchLegend = document.getElementById('matchLegend');
            const hasConfidenceScores = fieldMappings.some(pair => pair.confidence);
            if (matchLegend) {
                matchLegend.style.display = hasConfidenceScores ? 'block' : 'none';
            }
        }
        function addFieldPair(mainField, mappedField){
            if (!mainField || !mappedField) return;
            const exists = fieldMappings.some(p=>p.main===mainField && p.mapped===mappedField);
            if (!exists){ fieldMappings.push({ main: mainField, mapped: mappedField }); lastActionStack.push({type:'add_pair', pair:{main:mainField, mapped:mappedField}}); renderPills(); }
        }
        // Enable quick mapping: click a mapped header to pair with currently chosen main field
        mappedFieldsList.addEventListener('click', (e)=>{
            const btn = e.target?.closest('button.btn');
            if (!btn) return;
            const mappedName = btn.textContent;
            const wrap = document.getElementById(fieldPairContainerId);
            const mainSel = wrap?.querySelector('#mainFieldSelect');
            if (!mainSel || !mainSel.value){
                alert('Select a main field first, then click a mapped header to create a pair.');
                return;
            }
            addFieldPair(mainSel.value, mappedName);
        });

        function tryAutoSuggestPairs(showStatus = false){
            if (!mainFieldsCache?.length || !mappedFieldsCache?.length) {
                if (showStatus) showAutoMatchStatus('Cannot auto-match: Both tables must be selected and have fields loaded.', 'warning');
                return;
            }
            
            console.log('Auto-matching fields...');
            console.log('Main fields:', mainFieldsCache);
            console.log('Mapped fields:', mappedFieldsCache);
            
            const suggestions = findBestFieldMatches(mainFieldsCache, mappedFieldsCache);
            
            if (suggestions.length) {
                // Add confidence scores to suggestions
                const suggestionsWithConfidence = suggestions.map(s => ({
                    ...s,
                    confidence: Math.round(s.score || 0)
                }));
                
                // Clear existing mappings and add new suggestions
                fieldMappings = suggestionsWithConfidence;
                renderPills();
                console.log('Auto-matched pairs:', suggestionsWithConfidence);
                
                if (showStatus) {
                    const excellentMatches = suggestionsWithConfidence.filter(s => s.confidence >= 90).length;
                    const goodMatches = suggestionsWithConfidence.filter(s => s.confidence >= 80 && s.confidence < 90).length;
                    const fairMatches = suggestionsWithConfidence.filter(s => s.confidence >= 70 && s.confidence < 80).length;
                    
                    let message = `Successfully auto-matched ${suggestions.length} field pairs. `;
                    if (excellentMatches > 0) message += `${excellentMatches} excellent matches, `;
                    if (goodMatches > 0) message += `${goodMatches} good matches, `;
                    if (fairMatches > 0) message += `${fairMatches} fair matches.`;
                    
                    showAutoMatchStatus(message.replace(/, $/, '.'), 'success');
                }
            } else {
                console.log('No automatic matches found');
                if (showStatus) {
                    showAutoMatchStatus('No matching fields found. Field names are too different for automatic matching.', 'info');
                }
            }
        }
        
        function showAutoMatchStatus(message, type = 'info') {
            const statusDiv = document.getElementById('autoMatchStatus');
            const messageSpan = document.getElementById('autoMatchMessage');
            const alertDiv = statusDiv.querySelector('.alert');
            
            if (statusDiv && messageSpan && alertDiv) {
                messageSpan.textContent = message;
                alertDiv.className = `alert alert-${type} alert-sm`;
                statusDiv.style.display = 'block';
                
                // Auto-hide after 5 seconds
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 5000);
            }
        }
        
        function findBestFieldMatches(mainFields, mappedFields) {
            const matches = [];
            const usedMappedFields = new Set();
            
            // Define field name variations and synonyms
            const fieldSynonyms = {
                'email': ['smtp', 'mail', 'email_address', 'e_mail', 'li_smtp', 'gs_smtp'],
                'smtp': ['email', 'mail', 'email_address', 'e_mail', 'li_smtp', 'gs_smtp'],
                'id': ['identifier', 'primary_key', 'pk'],
                'name': ['full_name', 'username', 'display_name', 'li_full_name', 'ap_full_name'],
                'first_name': ['fname', 'firstname', 'given_name', 'li_first_name'],
                'last_name': ['lname', 'lastname', 'surname', 'family_name', 'li_last_name'],
                'phone': ['telephone', 'mobile', 'cell_phone', 'phone_number', 'dls_mobile', 'dls_cell_phone', 'dls_direct_dial'],
                'address': ['location', 'street', 'addr', 'gs_company_address', 'gs_street'],
                'company': ['organization', 'org', 'company_name', 'business', 'li_company_name', 'gs_company_name'],
                'title': ['job_title', 'position', 'designation', 'li_job_title', 'dls_designation'],
                'created_at': ['created', 'date_created', 'creation_date'],
                'updated_at': ['updated', 'date_updated', 'modification_date'],
                'city': ['location', 'gs_city', 'ap_contact_city'],
                'state': ['region', 'gs_state', 'ap_contact_state'],
                'country': ['nation', 'gs_country', 'li_contact_country', 'ap_contact_country'],
                'website': ['url', 'site', 'gs_website'],
                'revenue': ['income', 'sales', 'turnover'],
                'industry': ['sector', 'business_type', 'li_contact_industry']
            };
            
            // Helper function to normalize field names for comparison
            function normalizeFieldName(field) {
                return field.toLowerCase()
                    .replace(/[_\-\s]/g, '') // Remove underscores, hyphens, spaces
                    .replace(/^(li_|dls_|gs_|ap_)/, '') // Remove common prefixes
                    .replace(/(id|name|date)$/, ''); // Remove common suffixes for better matching
            }
            
            // Helper function to calculate match score
            function calculateMatchScore(mainField, mappedField) {
                const main = mainField.toLowerCase();
                const mapped = mappedField.toLowerCase();
                
                // Exact match (highest priority)
                if (main === mapped) return 100;
                
                // Check synonyms
                const mainSynonyms = fieldSynonyms[main] || [];
                const mappedSynonyms = fieldSynonyms[mapped] || [];
                if (mainSynonyms.includes(mapped) || mappedSynonyms.includes(main)) return 90;
                
                // Normalized match (remove prefixes/suffixes)
                const normalizedMain = normalizeFieldName(main);
                const normalizedMapped = normalizeFieldName(mapped);
                if (normalizedMain === normalizedMapped && normalizedMain.length > 2) return 80;
                
                // Partial match (one contains the other)
                if (main.includes(mapped) || mapped.includes(main)) {
                    const minLength = Math.min(main.length, mapped.length);
                    const maxLength = Math.max(main.length, mapped.length);
                    if (minLength >= 3) return 70 * (minLength / maxLength);
                }
                
                // Similar endings (like _id, _name)
                const mainParts = main.split('_');
                const mappedParts = mapped.split('_');
                if (mainParts.length > 1 && mappedParts.length > 1) {
                    const mainSuffix = mainParts[mainParts.length - 1];
                    const mappedSuffix = mappedParts[mappedParts.length - 1];
                    if (mainSuffix === mappedSuffix && mainSuffix.length > 2) return 60;
                }
                
                return 0;
            }
            
            // Find best matches for each main field
            mainFields.forEach(mainField => {
                let bestMatch = null;
                let bestScore = 0;
                
                mappedFields.forEach(mappedField => {
                    if (usedMappedFields.has(mappedField)) return;
                    
                    const score = calculateMatchScore(mainField, mappedField);
                    if (score > bestScore && score >= 60) { // Minimum score threshold
                        bestScore = score;
                        bestMatch = mappedField;
                    }
                });
                
                if (bestMatch) {
                    matches.push({ main: mainField, mapped: bestMatch, score: bestScore });
                    usedMappedFields.add(bestMatch);
                }
            });
            
            // Sort by score (best matches first) and return with scores
            return matches
                .sort((a, b) => b.score - a.score)
                .map(match => ({ main: match.main, mapped: match.mapped, score: match.score }));
        }

        function renderPairingUI(){
            const mainSel = document.getElementById('mainFieldSelect');
            const mappedSel = document.getElementById('mappedFieldSelect');
            // Populate selects
            if (mainFieldsCache?.length){ 
                mainSel.innerHTML = '<option value="" disabled selected>Select main field</option>' + mainFieldsCache.map(f=>`<option value="${f}">${f}</option>`).join(''); 
                console.log('Main field select populated with', mainFieldsCache.length, 'fields');
            } else {
                mainSel.innerHTML = '<option value="" disabled selected>No main fields available</option>';
            }
            if (mappedFieldsCache?.length){ 
                mappedSel.innerHTML = '<option value="" disabled selected>Select mapped field</option>' + mappedFieldsCache.map(f=>`<option value="${f}">${f}</option>`).join(''); 
                console.log('Mapped field select populated with', mappedFieldsCache.length, 'fields');
            } else {
                mappedSel.innerHTML = '<option value="" disabled selected>No mapped fields available</option>';
            }
        }

        function getResultTypes(){
            const rt1 = document.querySelector('input[name="resultType1"]:checked')?.value || 'all_mapped';
            const rt2 = document.querySelector('input[name="resultType2"]:checked')?.value || 'all_matched';
            return { rt1, rt2 };
        }

        // Hierarchical behavior: enable/disable secondary options depending on primary
        function applyHierarchy(){
            const primary = document.querySelector('input[name="resultType1"]:checked')?.value;
            const secInputs = Array.from(document.querySelectorAll('input[name="resultType2"]'));
            // By default enable all
            secInputs.forEach(i=>{ i.disabled = false; i.parentElement.classList.remove('text-muted'); });
            if (primary === 'not_in_main'){
                // 'All Matched' does not apply when filtering not-in-main; disable it
                const match = document.getElementById('allMatchedRecords');
                if (match){ match.disabled = true; match.checked = false; match.parentElement.classList.add('text-muted'); }
            }
        }
        document.addEventListener('change', (e)=>{
            if (e.target && (e.target.name === 'resultType1')){ applyHierarchy(); }
        });
        // Initialize hierarchy on load
        window.setTimeout(applyHierarchy, 0);
        function renderOutputFieldsCheckboxes(fields){
            outputFieldsList.innerHTML='';
            if(!fields?.length){ outputFieldsList.innerHTML='<p class="text-muted">No output fields</p>'; return; }
            fields.forEach(n=>{ const id='out_'+n; const wrap=document.createElement('div'); wrap.className='form-check'; wrap.innerHTML = `<input class="form-check-input" type="checkbox" value="${n}" id="${id}" checked><label class="form-check-label" for="${id}">${n}</label>`; outputFieldsList.appendChild(wrap); });
        }
        function renderPreview(rows){
            previewTable.innerHTML='';
            if(!rows?.length){ previewTable.innerHTML='<p class="text-muted">No data</p>'; return; }
            const table=document.createElement('table'); table.className='table table-sm table-striped';
            const cols = Object.keys(rows[0]);
            const thead=document.createElement('thead'); const trh=document.createElement('tr'); cols.forEach(c=>{ const th=document.createElement('th'); th.textContent=c; trh.appendChild(th); }); thead.appendChild(trh);
            const tbody=document.createElement('tbody'); rows.forEach(r=>{ const tr=document.createElement('tr'); cols.forEach(c=>{ const td=document.createElement('td'); td.textContent = r[c] ?? ''; tr.appendChild(td); }); tbody.appendChild(tr); });
            table.appendChild(thead); table.appendChild(tbody); previewTable.appendChild(table);
        }
        function getSelectedOutputFields(){ return Array.from(outputFieldsList.querySelectorAll('input[type="checkbox"]:checked')).map(i=>i.value); }

        processBtn.addEventListener('click', (e)=>{
            e.preventDefault();
            if(!mainDbSel.value || !mainTableSel.value || !mappedDbSel.value || !mappedTableSel.value){ alert('Select both main and mapped tables.'); return; }
            if(!fieldMappings.length){ tryAutoSuggestPairs(); }
            if(!fieldMappings.length){ alert('Add at least one field mapping pair.'); return; }
            const { rt1, rt2 } = getResultTypes();
            const emptyType = document.getElementById('emptyType')?.value || 'whitespace';
            
            // Parse table names in case they contain database prefixes
            let mainDatabase = mainDbSel.value;
            let mainTable = mainTableSel.value;
            let mappedDatabase = mappedDbSel.value;
            let mappedTable = mappedTableSel.value;
            
            if (mainTable.includes('.')) {
                const parts = mainTable.split('.');
                if (parts.length === 2) {
                    mainDatabase = parts[0];
                    mainTable = parts[1];
                    console.log('Parsed main table for processing - Database:', mainDatabase, 'Table:', mainTable);
                }
            }
            
            if (mappedTable.includes('.')) {
                const parts = mappedTable.split('.');
                if (parts.length === 2) {
                    mappedDatabase = parts[0];
                    mappedTable = parts[1];
                    console.log('Parsed mapped table for processing - Database:', mappedDatabase, 'Table:', mappedTable);
                }
            }
            
            console.log('Sending process_mapping request:', {
                main_database: mainDatabase,
                main_table: mainTable,
                mapped_database: mappedDatabase,
                mapped_table: mappedTable,
                field_mappings: fieldMappings,
                result_type_1: rt1,
                result_type_2: rt2
            });
            
            processBtn.disabled = true;
            postAction('process_mapping', {
                main_database: mainDatabase,
                main_table: mainTable,
                mapped_database: mappedDatabase,
                mapped_table: mappedTable,
                field_mappings: fieldMappings,
                result_type_1: rt1,
                result_type_2: rt2,
                empty_type: emptyType,
                custom_filter: customFilterInput.value || ''
            }).then(r=>{
                if (r.background_processing) {
                    lastImmediateResult = null; lastProcessMeta = { process_id: r.process_id }; pollProgress(r.process_id);
           
           
                } else {
                    lastImmediateResult = r; lastProcessMeta = null;
                    renderOutputFieldsCheckboxes(r.output_fields || []);
                    renderPreview(r.preview_data || []);
                    totalRecordsP.textContent = `Total Records: ${r.total_records}`;
                    exportBtn.disabled = false;
                }
            }).catch(err=>{
                console.error('Process mapping error:', err);
                console.error('Error details:', {
                    message: err.message,
                    stack: err.stack,
                    response: err.response
                });
                
                let errorMessage = err.message || 'Unknown error occurred';
                if (errorMessage.includes('does not exist')) {
                    errorMessage += '\n\nPlease verify that both tables exist and are accessible.';
                }
                
                alert('Processing failed: ' + errorMessage);
            }).finally(()=>{ processBtn.disabled = false; });
        });

        function pollProgress(processId){
            const h = setInterval(()=>{
                postAction('get_mapping_progress', { process_id: processId }).then(p=>{
                    if (p.completed) {
                        clearInterval(h);
                        postAction('get_mapping_preview', { process_id: process_id }).then(pr=>{
                            renderOutputFieldsCheckboxes(pr.output_fields || []);
                            renderPreview(pr.preview_data || []);
                            totalRecordsP.textContent = `Total Records: ${pr.total_records}`;
                            exportBtn.disabled = false;
                        }).catch(e=>alert(e.message));
                    }
                }).catch(()=>{});
            }, 1500);
        }

        // Auto Match button event handler
        const autoMatchBtn = document.getElementById('autoMatchBtn');
        if (autoMatchBtn) {
            autoMatchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                tryAutoSuggestPairs(true); // Show status messages
            });
        }
        
        // Clear Pairs button event handler
        const clearPairsBtn = document.getElementById('clearPairsBtn');
        if (clearPairsBtn) {
            clearPairsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (fieldMappings.length > 0) {
                    if (confirm(`Are you sure you want to clear all ${fieldMappings.length} field pairs?`)) {
                        fieldMappings = [];
                        lastActionStack = [];
                        renderPills();
                        showAutoMatchStatus('All field pairs have been cleared.', 'info');
                    }
                } else {
                    showAutoMatchStatus('No field pairs to clear.', 'info');
                }
            });
        }
        
        undoBtn.addEventListener('click', (e)=>{ e.preventDefault(); const last=lastActionStack.pop(); if(last?.type==='add_pair'){ fieldMappings = fieldMappings.filter(x=>!(x.main===last.pair.main && x.mapped===last.pair.mapped)); renderPills(); }});
        resetBtn.addEventListener('click', (e)=>{ e.preventDefault(); fieldMappings=[]; lastActionStack=[]; renderPills(); outputFieldsList.innerHTML='<p class="text-muted">Click Process to see fields</p>'; previewTable.innerHTML='<p class="text-muted">Click Process to see preview</p>'; totalRecordsP.textContent = 'Click Process to see total records'; exportBtn.disabled=true; lastImmediateResult=null; lastProcessMeta=null; });

        exportBtn.addEventListener('click', (e)=>{
            e.preventDefault();
            const selected = getSelectedOutputFields();
            if (lastProcessMeta?.process_id) {
                const fd = new FormData(); fd.append('save_token', saveToken); fd.append('action','download_mapping_results'); fd.append('process_id', lastProcessMeta.process_id); selected.forEach(f=>fd.append('selected_fields[]', f));
                fetch(actionUrl, { method:'POST', headers: csrfHeaders(), body: fd }).then(async res=>{ if(!res.ok) throw new Error('Download failed'); const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`mapping_results_${new Date().toISOString().replace(/[:.]/g,'_')}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }).catch(e2=>alert(e2.message));
            } else if (lastImmediateResult?.data) {
                const rows = lastImmediateResult.data; const fields = selected.length ? selected : (lastImmediateResult.output_fields || Object.keys(rows[0] || {}));
                const csv = [fields.join(',')].concat(rows.map(r=>fields.map(f=>{ const v=r[f]??''; const s=String(v).replace(/"/g,'""'); return '"'+s+'"'; }).join(','))).join('\n');
                const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' }); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`mapping_results_${new Date().toISOString().replace(/[:.]/g,'_')}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            } else { alert('Nothing to export yet.'); }
        });

        // Removed automatic initialization to prevent unwanted table population
        // Initialize empty definition visibility
        window.setTimeout(() => {
            const checked = document.querySelector('input[name="resultType2"]:checked');
            if (checked && checked.value === 'all_empty') {
                document.getElementById('emptyDefinition').classList.remove('d-none');
            }
        }, 0);
    })();
</script>
@endsection

@section('content')
<div class="container-xxl flex-grow-1 container-p-y">
    <div class="row gy-2">
        <div class="col-xl-12">
            <div class="container-fluid px-0 d-flex justify-content-between align-items-center">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item">
                            <a href="javascript:void(0);">Filters</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="javascript:void(0);">Search</a>
                        </li>
                        <li class="breadcrumb-item active fw-bold">Mapping</li>
                    </ol>
                </nav>
            </div>
        </div>

        <div class="container-xxl flex-grow-1 container-p-y">
            <h3>Advanced Mapping Tool</h3>

            <!-- Combined Single Form for All Steps -->
            <form action="{{ url('/skeleton-action/') }}/@skeletonToken('central_filters_mapping')_f" 
                  class="mapping-form" data-type="field">
                @csrf
                <input type="hidden" name="save_token" value="@skeletonToken('central_filters_mapping')_f">
                <input type="hidden" name="name" value="mapping_config">
                <input type="hidden" name="type" value="data">
                <input type="hidden" name="status" value="active">

                <div class="row g-4">

                    <!-- Step 1: Upload File -->
                    <div class="col-lg-6 section-container mt-3">
                        <div class="card shadow-lg border-0 rounded-4 upload-card">
                            <div class="card-header bg-gradient bg-primary text-white fw-bold d-flex align-items-center justify-content-between">
                                <span>1. Upload File (CSV/XLSX, Optional)</span>
                            </div>
                            <div class="card-body p-4">

                                <!-- Row 1: Table Name + Database -->
                                <div class="row g-3 align-items-center mb-3">
                                    <div class="col-6">
                                        <div class="float-input-control">
                                            <input type="text" id="newTableName" name="tableName" value="" class="form-float-input mb-3" required placeholder="Enter table name">
                                            <label for="newTableName" placeholder="Enter table name" class="form-float-label">Table Name
                                            </label>
                                        </div>
                                    </div>


                                    <div class="col-md-6">
                                        <div class="form-floating form-floating-outline">
                                            <select class="form-select"
                                                    id="uploadDatabase"
                                                    data-select="dropdown"
                                                    data-target="@skeletonToken('central_unique_database')_s"
                                                    data-ctx="upload_db"
                                                    name="database" required>
                                                <option value="" disabled selected>Select Database</option>
                                                @php
                                                    $allowedDatabases = App\Facades\Skeleton::getAuthenticatedUser()->access_db;
                                                    $options = explode(',', $allowedDatabases);
                                                @endphp
                                                @foreach($options as $db)
                                                    <option value="{{ $db }}">{{ $db }}</option>
                                                @endforeach
                                            </select>
                                            <label for="uploadDatabase">Upload Database</label>
                                        </div>
                                    </div>
                                </div>

                                <!-- Row 2: Create + File Upload + Upload + Status -->
                                <div class="row g-3 align-items-center">
                                    <div class="col-md-6">
                                        <input type="file" class="form-control border-primary"
                                            id="fileInput"
                                            name="csv_file"
                                            accept=".csv,.xlsx">
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-info  shadow-sm w-100"
                                                id="createTableBtn"
                                                title="Create table from CSV">
                                            <i class="bi bi-table me-2"></i> Create
                                        </button>
                                    </div>
                                    
                                    <!-- <div class="col-md-3">
                                        <button class="btn btn-primary btn-lg rounded-pill shadow-sm w-100"
                                                id="uploadFileBtn"
                                                title="Upload CSV/XLSX file">
                                            <i class="bi bi-cloud-arrow-up"></i> Upload
                                        </button>
                                    </div> -->
                                    <div class="col-md-2">
                                        <div id="uploadStatus" class="d-none">
                                            <div class="alert alert-info p-2 mb-0 text-center">
                                                <i class="bi bi-hourglass-split me-1"></i>
                                                ...
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <!-- Step 2: Select Tables -->
                    <div class="col-lg-6 section-container mt-4">
                        <div class="card border-primary">
                            <div class="card-header bg-primary text-white">2. Select Tables</div>
                            <div class="card-body">
                                <div class="row g-3">
                                    {{-- Main Database & Main Table --}}
                                    <div class="col-md-6">
                                        <div class="form-floating form-floating-outline mt-3">
                                            <select class="form-select"
                                                    id="mainDatabase"
                                                    data-select="dropdown"
                                                    data-target="@skeletonToken('central_unique_database')_s"
                                                    data-ctx="main_db"
                                                    name="database" required>
                                                <option value="" disabled selected>Select Database</option>
                                                @php
                                                    $allowedDatabases = App\Facades\Skeleton::getAuthenticatedUser()->access_db;
                                                    $options = explode(',', $allowedDatabases);
                                                @endphp
                                                @foreach($options as $db)
                                                    <option value="{{ $db }}">{{ $db }}</option>
                                                @endforeach
                                            </select>
                                            <label for="mainDatabase">Main Database</label>
                                        </div>
                                    </div>

                                    <div class="col-md-6">
                                        <div class="form-floating form-floating-outline mt-3">
                                            <select class="form-select border-primary"
                                                    id="mainTable"
                                                    data-select="dynamic"
                                                    data-source="@skeletonToken('central_unique_database')_s"
                                                    data-ctx="main_db"
                                                    name="main_table" required>
                                                <option value="" disabled selected>Select Table</option>
                                                {{-- Options loaded dynamically --}}
                                            </select>
                                            <label for="mainTable">Main Table</label>
                                        </div>
                                    </div>

                                    {{-- Mapped Database & Mapped Table --}}
                                    <div class="col-md-6">
                                        <div class="form-floating form-floating-outline mt-3">
                                            <select class="form-select border-primary"
                                                    id="mappedDatabase"
                                                    data-select="dropdown"
                                                    data-target="@skeletonToken('central_unique_database')_s"
                                                    data-ctx="mapped_db"
                                                    name="mapped_database" required>
                                                <option value="" disabled selected>Select Database</option>
                                                @foreach($options as $db)
                                                    <option value="{{ $db }}">{{ $db }}</option>
                                                @endforeach
                                            </select>
                                            <label for="mappedDatabase">Mapped Database</label>
                                        </div>
                                    </div>

                                    <div class="col-md-6">
                                        <div class="form-floating form-floating-outline mt-3">
                                            <select class="form-select border-primary"
                                                    id="mappedTable"
                                                    data-select="dynamic"
                                                    data-source="@skeletonToken('central_unique_database')_s"
                                                    data-ctx="mapped_db"
                                                    name="mapped_table" required>
                                                <option value="" disabled selected>Select Table</option>
                                                {{-- Options loaded dynamically --}}
                                            </select>
                                            <label for="mappedTable">Mapped Table</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Step 3: Map & Process -->
                    <div class="col-lg-6 section-container">
                        <div class="card border-primary">
                            <div class="card-header bg-primary text-white">3. Map & Process</div>
                            <div class="card-body mt-3">
                                <h6>Map Fields</h6>
                                <div class="map-fields-container">
                                    <div class="fields-list-wrapper">
                                        <div class="fields-list" id="mainFieldsList">
                                            <p class="text-muted">Select a main table to see headers</p>
                                        </div>
                                    </div>
                                    <div class="fields-list-wrapper">
                                        <div class="fields-list" id="mappedFieldsList">
                                            <p class="text-muted">Select a mapped table to see headers</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <div class="row g-2 align-items-end">
                                        <div class="col-6">
                                            <select class="form-select" id="mainFieldSelect">
                                                <option value="" disabled selected>Select main field</option>
                                            </select>
                                        </div>
                                        <div class="col-6">
                                            <select class="form-select" id="mappedFieldSelect">
                                                <option value="" disabled selected>Select mapped field</option>
                                            </select>
                                        </div>
                                       
                                    </div>
                                    <div class="row mt-2">
                                        <div class="col-12">
                                            <div class="btn-group w-100" role="group">
                                                <button class="btn btn-success" id="autoMatchBtn" title="Automatically match similar field names">
                                                    <i class="bi bi-magic"></i> Auto Match
                                                </button>
                                                <button class="btn btn-info" id="addPairBtn" title="Add field pair">
                                                <i class="bi bi-plus-circle"></i>
                                                </button>
                                                <button class="btn btn-warning" id="clearPairsBtn" title="Clear all field pairs">
                                                    <i class="bi bi-trash me-2"></i> Clear All
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <label class="form-label mb-2">Selected Pairs <span id="pairCount" class="badge bg-primary">0</span></label>
                                    <div class="selected-pills" id="selectedPills"></div>
                                    <div class="auto-match-legend" id="matchLegend" style="display: none;">
                                        <small class="text-muted">Match Quality Legend:</small><br>
                                        <div class="legend-item">
                                            <div class="legend-color" style="background-color: #28a745;"></div>
                                            <span>Excellent (90%+)</span>
                                        </div>
                                        <div class="legend-item">
                                            <div class="legend-color" style="background-color: #17a2b8;"></div>
                                            <span>Good (80-89%)</span>
                                        </div>
                                        <div class="legend-item">
                                            <div class="legend-color" style="background-color: #ffc107;"></div>
                                            <span>Fair (70-79%)</span>
                                        </div>
                                        <div class="legend-item">
                                            <div class="legend-color" style="background-color: #dc3545;"></div>
                                            <span>Weak (60-69%)</span>
                                        </div>
                                    </div>
                                    <div id="autoMatchStatus" class="mt-2" style="display: none;">
                                        <div class="alert alert-info alert-sm">
                                            <i class="bi bi-info-circle"></i> <span id="autoMatchMessage"></span>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-6 mt-3">
                                        <h6>Result Type 1:</h6>
                                        <div class="form-check mt-3">
                                            <input class="form-check-input" type="radio" name="resultType1" 
                                                   id="allFromMapTable" value="all_mapped" checked>
                                            <label class="form-check-label" for="allFromMapTable">All Records From Map Table</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="resultType1" 
                                                   id="commonInBoth" value="common">
                                            <label class="form-check-label" for="commonInBoth">Common Records in Both Tables</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="resultType1" 
                                                   id="notInMainTable" value="not_in_main">
                                            <label class="form-check-label" for="notInMainTable">Records Not-In Main Table</label>
                                        </div>
                                    </div>

                                    <div class="col-6 mt-3">
                                        <h6>Result Type 2:</h6>
                                        <div class="form-check mt-3">
                                            <input class="form-check-input" type="radio" name="resultType2" 
                                                   id="allMatchedRecords" value="all_matched" checked>
                                            <label class="form-check-label" for="allMatchedRecords">All Matched Records</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="resultType2" 
                                                   id="allEmptyRecords" value="all_empty">
                                            <label class="form-check-label" for="allEmptyRecords">All Empty Records</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="resultType2" 
                                                   id="allNonEmptyRecords" value="all_non_empty">
                                            <label class="form-check-label" for="allNonEmptyRecords">All Non-Empty Records</label>
                                        </div>
                                        <div id="emptyDefinition" class="mt-3 d-none">
                                            <label for="emptyType">Empty Definition</label>
                                            <select class="form-select" id="emptyType">
                                                <option value="strict">NULL or empty string</option>
                                                <option value="whitespace" selected>NULL, empty, or whitespace</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-3">
                                    <label>Optional custom condition</label>
                                    <input type="text" class="form-control" id="customFilter"
                                           placeholder="Custom Filter (e.g., 'field > 10'):">
                                </div>

                                <button class="btn btn-primary mt-3 w-100" id="processBtn">Process</button>
                            </div>
                        </div>
                    </div>

                    <!-- Step 4: Output & Export -->
                    <div class="col-lg-6 section-container">
                        <div class="card border-primary">
                            <div class="card-header bg-primary text-white">4. Output & Export</div>
                            <div class="card-body mt-3">
                                <h6>Output Fields</h6>
                                <div class="checkbox-list" id="outputFieldsList">
                                    <p class="text-muted">Click Process to see fields</p>
                                </div>

                                <h6 class="mt-3">Preview Data</h6>
                                <div class="preview-table" id="previewTable">
                                    <p class="text-muted">Click Process to see preview</p>
                                </div>
                                <p id="totalRecords" class="text-muted mt-3">Click Process to see total records</p>

                                <div class="mt-3 d-flex justify-content-between">
                                    <button class="btn btn-secondary" id="resetBtn">Reset</button>
                                    <button class="btn btn-warning" id="undoBtn">Undo Last</button>
                                    <button class="btn btn-success" id="exportBtn" disabled>Export as CSV</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </form>
        </div>
    </div>
</div>
@endsection