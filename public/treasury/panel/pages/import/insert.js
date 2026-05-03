$(document).ready(function() {
    const csrfToken = $('meta[name="csrf-token"]').attr('content');
    axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
    let activeTransfers = JSON.parse(localStorage.getItem('activeTransfers')) || {};
    let unmappedHeaders = [];
    let totalRecords = 0;

    const saveActiveTransfers = () => localStorage.setItem('activeTransfers', JSON.stringify(activeTransfers));
    const addOrUpdateProgressItem = (transferId, fileName, processed = 0, total = 0, status = 'processing', inserted = 0, rejected = 0) => {
        const $dropdown = $('.dropdown-menu-import');
        const $placeholder = $dropdown.find('.active-imports-placeholder');
        let $item = $placeholder.find(`[data-transfer-id="${transferId}"]`);
        const progress = total > 0 ? Math.min(100, (processed / total) * 100) : 0;

        if (status !== 'processing') {
            $item.remove();
            return;
        }
        if (!$item.length) {
            $placeholder.prepend(`
                <li class="dropdown-item progress-item" data-transfer-id="${transferId}">
                    <div class="d-flex align-items-center">
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between">
                                <span class="file-name">${fileName}</span>
                                <span class="progress-text">${progress.toFixed(2)}%</span>
                            </div>
                            <div class="progress mt-1" style="height: 8px;">
                                <div class="progress-bar bg-success" style="width: ${progress}%;" 
                                    aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                            <small class="text-muted">${processed} / ${total} Inserted: ${inserted}, Rejected: ${rejected}</small>
                        </div>
                        <span class="stop-import ms-2 text-danger" data-transfer-id="${transferId}" style="cursor: pointer;">✖</span>
                    </div>
                </li>
            `);
        } else {
            $item.find('.progress-text').text(`${progress.toFixed(2)}%`);
            $item.find('.progress-bar').css('width', `${progress}%`).attr('aria-valuenow', progress);
            $item.find('small.text-muted').text(`${processed} / ${total} Inserted: ${inserted}, Rejected: ${rejected}`);
        }
    };

    const downloadRejectedFile = (url, fileName) => {
        return axios.get(url, { responseType: 'blob' })
            .then((response) => {
                const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName || 'rejected_records.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            })
            .catch((err) => {
                throw new Error('Failed to download rejected file: ' + (err.response?.data?.error || err.message));
            });
    };

    const connectToProgressStream = (transferId) => {
        if (!transferId || !activeTransfers[transferId]) return;
        let hasDownloaded = false;

        const fetchProgress = () => {
            $.get('/import/progress-status', { transfer_id: transferId }, (data) => {
                const transfer = activeTransfers[transferId];
                if (!transfer || !transfer.fileName) {
                    clearInterval(transfer?.interval);
                    return;
                }
                const fileName = transfer.fileName;
                addOrUpdateProgressItem(transferId, fileName, data.processed, data.total, data.status, data.inserted_rows, data.rejected_rows);
                if (data.status === 'completed' || data.status === 'stopped') {
                    clearInterval(transfer.interval);
                    const toastType = data.status === 'completed' ? successToast : warningToast;
                    if (data.status === 'completed') {
                        toastType(
                            'Import Completed',
                            `Import of ${fileName} finished: ${data.inserted_rows} rows inserted, ${data.rejected_rows} rows rejected.`,
                            5000
                        );
                    } else {
                        toastType(
                            'Import Stopped',
                            `Import of ${fileName} stopped: ${data.inserted_rows} rows inserted, ${data.rejected_rows} rows rejected`,
                            5000
                        );
                    }
                    if (data.rejected_file && !hasDownloaded) {
                        hasDownloaded = true;
                        downloadRejectedFile(data.rejected_file, `rejected_${fileName}`)
                            .then(() => {
                                return axios.post('/import', { action: 'delete-rejected', transfer_id: transferId });
                            })
                            .then((deleteResponse) => {
                                successToast('Cleaned Up', deleteResponse.data.message, 5000);
                            })
                            .catch((err) => {
                                errorToast('Operation Failed', err.message || 'Failed to process rejected file', 5000);
                            });
                    }
                    delete activeTransfers[transferId];
                    saveActiveTransfers();
                }
            }).fail((err) => {
                clearInterval(activeTransfers[transferId]?.interval);
                delete activeTransfers[transferId];
                saveActiveTransfers();
            });
        };

        activeTransfers[transferId].interval = setInterval(fetchProgress, 2000);
        fetchProgress();
    };

    const checkOngoingImports = () => {
        Object.keys(activeTransfers).forEach(id => {
            axios.get('/import/progress-status', { params: { transfer_id: id } }).then(({ data }) => {
                const transfer = activeTransfers[id];
                if (!transfer || !transfer.fileName) {
                    delete activeTransfers[id];
                    saveActiveTransfers();
                    return;
                }
                const fileName = transfer.fileName;

                addOrUpdateProgressItem(id, fileName, data.processed, data.total, data.status, data.inserted_rows, data.rejected_rows);
                if (data.status === 'processing') {
                    connectToProgressStream(id);
                } else if (data.status !== 'pending') {
                    const toastType = data.status === 'completed' ? successToast : warningToast;
                    toastType(
                        data.status === 'completed' ? 'Import Completed' : 'Import Stopped',
                        `Import of ${fileName} ${data.status === 'completed' ? 'finished' : 'stopped'}: ${data.inserted_rows} rows inserted, ${data.rejected_rows} rows rejected`,
                        5000
                    );
                    if (data.rejected_file) {
                        downloadRejectedFile(data.rejected_file, `rejected_${fileName}`)
                            .then(() => {
                                return axios.post('/import', { action: 'delete-rejected', transfer_id: id });
                            })
                            .then((deleteResponse) => {
                                successToast('Cleaned Up', deleteResponse.data.message, 5000);
                            })
                            .catch((err) => {
                                errorToast('Operation Failed', err.message || 'Failed to process rejected file', 5000);
                            });
                    }
                    delete activeTransfers[id];
                    saveActiveTransfers();
                }
            }).catch(() => {
                delete activeTransfers[id];
                saveActiveTransfers();
            });
        });
    };

    checkOngoingImports();

    $('#uploadForm').submit(function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        formData.append('action', 'upload');

        const fileName = $('#csvFile')[0].files[0]?.name || 'Unknown File';
        $('#uploadProgressContainer').show();
        $('#uploadProgressBar').css('width', '0%');
        $('#uploadProgressText').html('0% <br> Please wait, do not refresh the page.');
        $('#uploadButton').prop('disabled', true);

        axios.post('/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: e => {
                const percent = Math.round((e.loaded * 100) / e.total);
                $('#uploadProgressBar').css('width', `${percent}%`);
                $('#uploadProgressText').html(percent+'%<br> Please wait, do not refresh the page.');
            }
        }).then(res => {
            $('#uploadProgressContainer').hide();
            $('#uploadButton').prop('disabled', false);
            const { transfer_id, csv_headers, table_columns, total_records } = res.data;
            activeTransfers[transfer_id] = { fileName };
            saveActiveTransfers();
            unmappedHeaders = [...csv_headers];
            totalRecords = total_records;
            displayMapping(csv_headers, table_columns, transfer_id, fileName);
            recommendChunkSize(total_records);
            $('#csvFile').val('');
        }).catch(err => {
            $('#uploadProgressContainer').hide();
            $('#uploadButton').prop('disabled', false);
            const errorMsg = err.response?.data?.error || 'Upload failed';
            errorToast('Upload Failed', errorMsg, 5000);
            console.error('Upload error:', err.response?.data);
        });
    });

    const displayMapping = (csvHeaders, tableColumns, transferId, fileName) => {
        $('#mappingContainer').show().data({ transferId, fileName });
        unmappedHeaders = [...csvHeaders];
        let mappedHeaders = {};
        tableColumns.forEach(col => {
            const idx = unmappedHeaders.findIndex(h => h.toLowerCase().trim() === col.toLowerCase().trim());
            if (idx !== -1) mappedHeaders[col] = unmappedHeaders.splice(idx, 1)[0];
        });
        $('#tableColumns').html(tableColumns.map(col => `<div class="table-column-item">${col}</div>`).join(''));
        $('#mappedHeaders').html(tableColumns.map(col => `
            <div class="drop-zone" data-column="${col}">
                ${mappedHeaders[col] ? `<div class="mapped-item" draggable="true">${mappedHeaders[col]}<button class="remove-btn">✖</button></div>` : 'Drop header here'}
            </div>
        `).join(''));
        updateUnmappedHeaders();
        toggleStartButton();
        if ($('#cancelMapping').length === 0) {
            $('#mappingContainer').append('<div class="text-end"><button id="cancelMapping" class="btn btn-danger mt-3">Cancel</button></div>');
        }
    };

    const updateUnmappedHeaders = () =>
        $('#unmappedHeaders').html(unmappedHeaders.map(h => `<div class="unmapped-item" draggable="true">${h}</div>`).join('') || '<div class="text-muted">No unmapped headers</div>');

    const recommendChunkSize = total => {
        const size = total <= 10 ? total : total <= 100 ? Math.ceil(total / 5) : total <= 1000 ? 100 : 500;
        $('#chunkSize').val(size);
        $('#chunkSizeRecommendation').text(`Recommended: ${size} (based on ${total} records)`);
    };

    $(document).on('dragstart', '.mapped-item, .unmapped-item', e =>
        e.originalEvent.dataTransfer.setData('text', $(e.target).text().replace('✖', '').trim()));

    $(document).on('dragover', '.drop-zone', e => {
        e.preventDefault();
        $(e.target).addClass('dragover');
    }).on('dragleave', '.drop-zone', e => {
        $(e.target).removeClass('dragover');
    }).on('drop', '.drop-zone', function(e) {
        e.preventDefault();
        const $this = $(this);
        $this.removeClass('dragover');
        const header = e.originalEvent.dataTransfer.getData('text');
        const $existing = $this.find('.mapped-item');

        console.log("Drop event on:", $this);
        console.log("Existing items:", $existing.length);

        if ($existing.length) {
            console.log("Drop prevented.");
            return;
        }

        $this.html(`<div class="mapped-item" draggable="true">${header}<button class="remove-btn">✖</button></div>`);
        unmappedHeaders = unmappedHeaders.filter(h => h !== header);
        updateUnmappedHeaders();
        toggleStartButton();
    });

    $(document).on('drop', '.unmapped-panel', e => {
        e.preventDefault();
        const header = e.originalEvent.dataTransfer.getData('text');
        const $mapped = $(`.mapped-item:contains("${header}")`);
        if ($mapped.length) {
            $mapped.parent().html('Drop header here');
            unmappedHeaders.push(header);
            updateUnmappedHeaders();
            toggleStartButton();
        }
    });

    $(document).on('click', '.remove-btn', function() {
        const header = $(this).parent().text().replace('✖', '').trim();
        $(this).parent().parent().html('Drop header here');
        unmappedHeaders.push(header);
        updateUnmappedHeaders();
        toggleStartButton();
    });

    const toggleStartButton = () => $('#startImport').prop('disabled', !$('.mapped-item').length);
    $('#startImport').click(() => {
        const mappedColumns = {};
        $('.drop-zone').each((_, el) => {
            const col = $(el).data('column');
            const header = $(el).find('.mapped-item').text().replace('✖', '').trim();
            if (header) mappedColumns[col] = header;
        });
        const chunkSize = parseInt($('#chunkSize').val(), 10);
        if (isNaN(chunkSize) || chunkSize <= 0) return alert('Please enter a valid chunk size.');
        const transferId = $('#mappingContainer').data('transferId');
        const fileName = $('#mappingContainer').data('fileName');

        if (!transferId) {
            errorToast('Import Error', 'No valid transfer ID found.', 5000);
            return;
        }
        $('#mappingContainer').hide().removeData('transferId').removeData('fileName');
        $('#tableColumns').empty();
        $('#mappedHeaders').empty();
        $('#unmappedHeaders').empty();
        $('#chunkSize').val('');
        $('#chunkSizeRecommendation').text('');
        $('#startImport').prop('disabled', true);
        unmappedHeaders = [];
        totalRecords = 0;

        axios.post('/import', {
            action: 'start',
            transfer_id: transferId,
            mapped_columns: mappedColumns,
            chunk_size: chunkSize
        })
            .then(res => {
                const returnedTransferId = res.data.transfer_id;
                activeTransfers[returnedTransferId] = { fileName, interval: null };
                saveActiveTransfers();
                addOrUpdateProgressItem(returnedTransferId, fileName, 0, totalRecords, 'processing');
                connectToProgressStream(returnedTransferId);
                $('.dropdown-menu-import').show();
            })
            .catch(err => {
                errorToast('Import Failed', err.response?.data?.error || 'Failed to start import', 5000);
            });
    });

    $(document).on('click', '.stop-import', function() {
        const transferId = $(this).data('transfer-id');
        if (!transferId || !activeTransfers[transferId]) return;
        const $button = $(this);
        $button.prop('disabled', true).html('<i class="ri-stop-line"></i> Cancelling...');

        axios.post('/import', { action: 'stop', transfer_id: transferId })
            .then((response) => {
                const data = response.data;
                clearInterval(activeTransfers[transferId].interval);
                const fileName = activeTransfers[transferId].fileName;
                addOrUpdateProgressItem(transferId, fileName, null, null, 'stopped');
                axios.get('/import/progress-status', { params: { transfer_id: transferId } })
                    .then(({ data: statusData }) => {
                        warningToast(
                            'Import Stopped',
                            `Import of ${fileName} stopped: ${statusData.inserted_rows} rows inserted, ${statusData.rejected_rows} rows rejected`,
                            5000
                        );
                        if (statusData.rejected_file) {
                            downloadRejectedFile(statusData.rejected_file, `rejected_${fileName}`)
                                .then(() => {
                                    return axios.post('/import', { action: 'delete-rejected', transfer_id: transferId });
                                })
                                .then((deleteResponse) => {
                                    successToast('Cleaned Up', deleteResponse.data.message, 5000);
                                })
                                .catch((err) => {
                                    errorToast('Operation Failed', err.message || 'Failed to process rejected file', 5000);
                                });
                        }
                    })
                    .catch((err) => errorToast('Status Fetch Failed', err.response?.data?.error || 'Failed to fetch transfer status', 5000));

                delete activeTransfers[transferId];
                saveActiveTransfers();
                $button.prop('disabled', false).html('<i class="ri-stop-line"></i>');
            })
            .catch(err => {
                $button.prop('disabled', false).html('<i class="ri-stop-line"></i>');
                errorToast('Stop Failed', err.response?.data?.error || 'Failed to stop import', 5000);
            });
    });

    $(document).on('click', '.dropdown-toggle-import', e => {
        e.stopPropagation();
        $('.dropdown-menu-import').toggle();
    });

    $(document).on('click', e => {
        if (!$(e.target).closest('.dropdown-menu-import').length && !$(e.target).closest('.dropdown-toggle-import').length) {
            $('.dropdown-menu-import').hide();
        }
    });

    $(document).on('click', '#cancelMapping', function() {
        $('#mappingContainer').hide();
        $('#tableColumns').empty();
        $('#mappedHeaders').empty();
        $('#unmappedHeaders').empty();
        $('#chunkSize').val('');
        $('#chunkSizeRecommendation').text('');
        $('#startImport').prop('disabled', true);
        unmappedHeaders = [];
        totalRecords = 0;
        $('#mappingContainer').removeData('transferId').removeData('fileName');
    });
});