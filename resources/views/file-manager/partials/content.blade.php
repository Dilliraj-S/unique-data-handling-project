<div>
    @foreach($folders as $folder)
        <div class="item folder-item" data-folder-id="{{ $folder->folder_id }}" draggable="true">
            <input type="checkbox" class="item-checkbox">
            <i class="fas fa-folder fa-2x"></i>
            <div class="item-name">{{ $folder->name }}</div>
            <i class="star-icon fa{{ $folder->is_starred ? 's' : 'r' }} fa-star"></i>
            <div class="item-metadata">
                <small>Modified: {{ \Carbon\Carbon::parse($folder->updated_at)->format('Y-m-d H:i') }}</small>
                @if($folder->description)
                    <small>Description: {{ Str::limit($folder->description, 20) }}</small>
                @endif
                <small>Access: {{ ucfirst($folder->access_level) }}</small>
            </div>
        </div>
    @endforeach
    @foreach($files as $file)
        <div class="item file-item" data-file-id="{{ $file->file_id }}" data-file-path="{{ $file->file_path }}" data-mime-type="{{ $file->mime_type }}" draggable="true">
            <input type="checkbox" class="item-checkbox">
            <img src="{{ $file->mime_type == 'application/pdf' ? asset('icons/pdf.png') : ($file->mime_type == 'image/jpeg' || $file->mime_type == 'image/png' ? '/storage/' . $file->file_path : asset('icons/file.png')) }}" alt="icon" width="32" class="file-icon">
            <div class="item-name">{{ $file->display_name }}</div>
            <i class="star-icon fa{{ $file->is_starred ? 's' : 'r' }} fa-star"></i>
            <div class="item-metadata">
                <small class="item-size">{{ number_format($file->file_size / 1024, 2) }} KB</small>
                <small class="item-modified">Modified: {{ \Carbon\Carbon::parse($file->updated_at)->format('Y-m-d H:i') }}</small>
                @if($file->description)
                    <small>Description: {{ Str::limit($file->description, 20) }}</small>
                @endif
                <small>Access: {{ ucfirst($file->access_level) }}</small>
            </div>
        </div>
    @endforeach
</div>