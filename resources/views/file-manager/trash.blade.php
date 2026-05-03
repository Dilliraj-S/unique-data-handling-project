<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="user-id" content="{{ auth()->user()->user_id }}">
    <meta name="business-id" content="{{ auth()->user()->business_id }}">
    <title>Trash - File Manager</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .item-checkbox { margin-right: 10px; }
        .star-icon { cursor: pointer; }
        #file-manager-content.grid-view .item { display: inline-block; width: 150px; text-align: center; margin: 10px; vertical-align: top; }
        #file-manager-content.list-view .item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #ddd; }
        #file-manager-content.list-view .item > * { flex: 1; }
        #bulk-actions { display: none; }
    </style>
    @vite(['resources/js/app.js'])
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <div class="col-md-3 bg-light p-3">
                <h5>File Manager</h5>
                <a href="{{ route('file-manager.index') }}" class="btn btn-primary mb-2 w-100">Back to Files</a>
            </div>
            <!-- Main Content -->
            <div class="col-md-9 p-3">
                <h4>Trash</h4>
                <div class="d-flex justify-content-between mb-3">
                    <div>
                        <button id="grid-view-btn" class="btn btn-outline-primary {{ $viewMode === 'grid' ? 'active' : '' }}">Grid</button>
                        <button id="list-view-btn" class="btn btn-outline-primary {{ $viewMode === 'list' ? 'active' : '' }}">List</button>
                        <input type="checkbox" id="select-all" class="ms-3"> Select All
                    </div>
                    <div id="bulk-actions">
                        <span id="selected-count">0</span> selected
                        <button id="bulk-restore-btn" class="btn btn-success btn-sm">Restore</button>
                        <button id="bulk-permanent-delete-btn" class="btn btn-danger btn-sm">Permanently Delete</button>
                    </div>
                </div>
                <div id="file-manager-content" class="{{ $viewMode }}-view">
                    @foreach($folders as $folder)
                        <div class="item folder-item" data-folder-id="{{ $folder->folder_id }}">
                            <input type="checkbox" class="item-checkbox">
                            <i class="fas fa-folder fa-2x"></i>
                            <div class="item-name">{{ $folder->name }}</div>
                            <div class="item-metadata">
                                <small>Deleted: {{ \Carbon\Carbon::parse($folder->deleted_at)->format('Y-m-d H:i') }}</small>
                            </div>
                        </div>
                    @endforeach
                    @foreach($files as $file)
                        <div class="item file-item" data-file-id="{{ $file->file_id }}">
                            <input type="checkbox" class="item-checkbox">
                            <img src="{{ $file->mime_type == 'application/pdf' ? asset('icons/pdf.png') : ($file->mime_type == 'image/jpeg' || $file->mime_type == 'image/png' ? '/storage/' . $file->file_path : asset('icons/file.png')) }}" alt="icon" width="32" class="file-icon">
                            <div class="item-name">{{ $file->display_name }}</div>
                            <div class="item-metadata">
                                <small>Deleted: {{ \Carbon\Carbon::parse($file->deleted_at)->format('Y-m-d H:i') }}</small>
                                <small>{{ number_format($file->file_size / 1024, 2) }} KB</small>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</body>
</html>