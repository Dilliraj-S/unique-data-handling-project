@extends('layouts.system-app')
@section('title', 'Skeleton-configs | Gotit HR Management Software')
@section('top-style')

@endsection
@section('bottom-script')

@endsection
@section('content')
<div class="content">
 
    
    







      <style>
        .dragover { border: 2px dashed #007bff; background: rgba(0, 123, 255, 0.1); }
        .context-menu { z-index: 1000; background: white; border: 1px solid #ccc; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .context-menu ul { padding: 0; margin: 0; }
        .context-menu li { cursor: pointer; padding: 8px 16px; }
        .context-menu li:hover { background: #f0f0f0; }
        .item-checkbox { margin-right: 10px; }
        .star-icon { cursor: pointer; }
        .folder-tree-item { cursor: pointer; }
        .folder-tree-item:hover { background: #f0f0f0; }
        #file-manager-content.grid-view .item { display: inline-block; width: 150px; text-align: center; margin: 10px; vertical-align: top; }
        #file-manager-content.list-view .item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #ddd; }
        #file-manager-content.list-view .item > * { flex: 1; }
        #bulk-actions { display: none; }
        #folder-tree { max-height: 400px; overflow-y: auto; }
    </style>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar -->
            <div class="col-md-3 bg-light p-3">
                <h5>File Manager</h5>
                <button id="new-folder-btn" class="btn btn-primary mb-2 w-100">New Folder</button>
                <button id="upload-btn" class="btn btn-secondary mb-2 w-100">Upload File</button>
                <input type="file" id="file-input" multiple style="display: none;">
                <div class="mb-3">
                    <input type="text" id="search-input" class="form-control" placeholder="Search...">
                    <button id="advanced-search-btn" class="btn btn-link p-0">Advanced Search</button>
                </div>
                <h6>Folder Tree</h6>
                <div id="folder-tree" class="list-group mb-3"></div>
                <a href="{{ route('file-manager.trash') }}" class="btn btn-outline-danger w-100">Trash</a>
            </div>
            <!-- Main Content -->
            <div class="col-md-9 p-3">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb" id="breadcrumbs">
                        @foreach ($breadcrumbs as $crumb)
                            <li class="breadcrumb-item {{ !$loop->last ? '' : 'active' }}">
                                @if (!$loop->last)
                                    <a href="#" onclick="FileManager.loadContents('{{ $crumb['id'] }}')">{{ $crumb['name'] }}</a>
                                @else
                                    {{ $crumb['name'] }}
                                @endif
                            </li>
                        @endforeach
                    </ol>
                </nav>
                <div class="d-flex justify-content-between mb-3">
                    <div>
                        <button id="grid-view-btn" class="btn btn-outline-primary {{ $viewMode === 'grid' ? 'active' : '' }}">Grid</button>
                        <button id="list-view-btn" class="btn btn-outline-primary {{ $viewMode === 'list' ? 'active' : '' }}">List</button>
                        <input type="checkbox" id="select-all" class="ms-3"> Select All
                    </div>
                    <div id="bulk-actions">
                        <span id="selected-count">0</span> selected
                        <button id="bulk-delete-btn" class="btn btn-danger btn-sm">Delete</button>
                        <button id="bulk-star-btn" class="btn btn-warning btn-sm">Star</button>
                        <button id="bulk-unstar-btn" class="btn btn-secondary btn-sm">Unstar</button>
                    </div>
                </div>
                <div id="file-manager-content" class="{{ $viewMode }}-view">
                    @include('file-manager.partials.content')
                </div>
            </div>
        </div>
    </div>

    <!-- Modals -->
    <!-- New Folder Modal -->
    <div class="modal fade" id="new-folder-modal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Create New Folder</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form id="new-folder-form">
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="folder-name" class="form-label">Folder Name</label>
                            <input type="text" class="form-control" id="folder-name" name="folder_name" required>
                        </div>
                        <div class="mb-3">
                            <label for="access-level" class="form-label">Access Level</label>
                            <select class="form-control" id="access-level" name="access_level">
                                <option value="private">Private</option>
                                <option value="public">Public</option>
                                <option value="partial">Partial</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="folder-description" class="form-label">Description</label>
                            <textarea class="form-control" id="folder-description" name="description"></textarea>
                        </div>
                        <input type="hidden" name="current_folder" value="{{ $folderId }}">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="submit" class="btn btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Advanced Search Modal -->
    <div class="modal fade" id="advanced-search-modal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Advanced Search</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form id="advanced-search-form">
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="search" class="form-label">Keyword</label>
                            <input type="text" class="form-control" id="search" name="search">
                        </div>
                        <div class="mb-3">
                            <label for="extension" class="form-label">File Extension</label>
                            <input type="text" class="form-control" id="extension" name="extension" placeholder="e.g., pdf">
                        </div>
                        <div class="mb-3">
                            <label for="size_min" class="form-label">Min Size (KB)</label>
                            <input type="number" class="form-control" id="size_min" name="size_min">
                        </div>
                        <div class="mb-3">
                            <label for="size_max" class="form-label">Max Size (KB)</label>
                            <input type="number" class="form-control" id="size_max" name="size_max">
                        </div>
                        <div class="mb-3">
                            <label for="date_from" class="form-label">From Date</label>
                            <input type="date" class="form-control" id="date_from" name="date_from">
                        </div>
                        <div class="mb-3">
                            <label for="date_to" class="form-label">To Date</label>
                            <input type="date" class="form-control" id="date_to" name="date_to">
                        </div>
                        <div class="mb-3">
                            <label for="owner_id" class="form-label">Owner ID</label>
                            <input type="text" class="form-control" id="owner_id" name="owner_id">
                        </div>
                        <div class="mb-3">
                            <label for="access_level" class="form-label">Access Level</label>
                            <select class="form-control" id="access_level" name="access_level">
                                <option value="">Any</option>
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                                <option value="partial">Partial</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="starred" class="form-label">Starred</label>
                            <select class="form-control" id="starred" name="starred">
                                <option value="">Any</option>
                                <option value="1">Starred</option>
                                <option value="0">Not Starred</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="submit" class="btn btn-primary">Search</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Preview Modal -->
    <div class="modal fade" id="preview-modal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">File Preview</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" id="preview-content"></div>
            </div>
        </div>
    </div>












</div>
@endsection
