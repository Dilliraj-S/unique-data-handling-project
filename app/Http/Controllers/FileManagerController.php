<?php

namespace App\Http\Controllers;

use App\Facades\FileManager;
use App\Events\FileManager\{FileCreated, FolderCreated, FileDeleted, FolderDeleted, FileRenamed, FolderRenamed, ItemMoved, FileShared, FolderShared, FileStarred, FolderStarred, FileRestored, FolderRestored, FilePermanentlyDeleted, FolderPermanentlyDeleted, FileVersionRestored, FileUpdated};
use App\Services\DatabaseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class FileManagerController extends Controller
{
    protected $dbService;

    public function __construct(DatabaseService $dbService)
    {
        $this->dbService = $dbService;
    }

    public function index(Request $request)
    {
        $folderId = $request->query('folder');
        $filters = $request->only(['search', 'extension', 'size_min', 'size_max', 'date_from', 'date_to', 'owner_id', 'access_level', 'starred']);
        $viewMode = $request->cookie('view_mode', 'grid');

        $folders = FileManager::listFolders($folderId, Auth::user()->user_id, $filters);
        $files = FileManager::listFiles($folderId, Auth::user()->user_id, $filters);
        $breadcrumbs = $folderId ? FileManager::getBreadcrumbs($folderId) : [['id' => null, 'name' => 'Home']];

        if ($request->ajax()) {
            return response()->json([
                'html' => view('file-manager.partials.content', compact('folders', 'files', 'viewMode'))->render(),
                'breadcrumbs' => $breadcrumbs,
            ]);
        }

        return view('file-manager.index', compact('folders', 'files', 'viewMode', 'folderId', 'breadcrumbs'));
    }

    public function trash(Request $request)
    {
        $folders = FileManager::listTrashedFolders(Auth::user()->user_id);
        $files = FileManager::listTrashedFiles(Auth::user()->user_id);
        $viewMode = $request->cookie('view_mode', 'grid');

        return view('file-manager.trash', compact('folders', 'files', 'viewMode'));
    }

    public function tree()
    {
        $tree = FileManager::getFolderTree(Auth::user()->user_id);
        return response()->json($tree);
    }

    public function upload(Request $request)
    {
        $request->validate([
            'file.*' => 'required|file|max:102400', // 100MB max
            'current_folder' => 'nullable|uuid',
            'access_level' => 'in:private,public,partial',
            'description' => 'nullable|string|max:255',
        ]);

        $files = $request->file('file');
        $folderId = $request->input('current_folder');
        $accessLevel = $request->input('access_level', 'private');
        $description = $request->input('description');

        foreach ($files as $file) {
            $path = $file->store('files', 'public');
            $fileData = [
                'file_id' => (string) Str::uuid(),
                'user_id' => Auth::user()->user_id,
                'business_id' => Auth::user()->business_id,
                'folder_id' => $folderId,
                'display_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'access_level' => $accessLevel,
                'description' => $description,
                'version_number' => 1,
                'is_starred' => false,
            ];

            FileManager::createFile($fileData);
            Cache::tags(['files'])->flush();
            event(new FileCreated((object) $fileData));
        }

        return response()->json(['success' => 'Files uploaded successfully']);
    }

    public function update(Request $request, $fileId)
    {
        $request->validate([
            'file' => 'required|file|max:102400',
            'description' => 'nullable|string|max:255',
        ]);

        $file = FileManager::getFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        $newFile = $request->file('file');
        $newPath = $newFile->store('files', 'public');
        $versionData = [
            'file_id' => $file->file_id,
            'version_number' => $file->version_number + 1,
            'file_path' => $newPath,
            'file_size' => $newFile->getSize(),
            'mime_type' => $newFile->getMimeType(),
            'user_id' => Auth::user()->user_id,
        ];

        FileManager::createFileVersion($versionData);
        FileManager::updateFile($fileId, [
            'file_path' => $newPath,
            'file_size' => $newFile->getSize(),
            'mime_type' => $newFile->getMimeType(),
            'description' => $request->input('description'),
            'version_number' => $file->version_number + 1,
        ]);

        Storage::disk('public')->delete($file->file_path);
        Cache::tags(['files'])->flush();
        event(new FileUpdated($file));

        return response()->json(['success' => 'File updated successfully']);
    }

    public function createFolder(Request $request)
    {
        $request->validate([
            'folder_name' => 'required|string|max:255',
            'current_folder' => 'nullable|uuid',
            'access_level' => 'in:private,public,partial',
            'description' => 'nullable|string|max:255',
        ]);

        $folderData = [
            'folder_id' => (string) Str::uuid(),
            'user_id' => Auth::user()->user_id,
            'business_id' => Auth::user()->business_id,
            'parent_folder_id' => $request->input('current_folder'),
            'name' => $request->input('folder_name'),
            'access_level' => $request->input('access_level', 'private'),
            'description' => $request->input('description'),
            'is_starred' => false,
        ];

        FileManager::createFolder($folderData);
        Cache::tags(['folders'])->flush();
        event(new FolderCreated((object) $folderData));

        return response()->json(['success' => 'Folder created successfully']);
    }

    public function renameFile(Request $request, $fileId)
    {
        $request->validate(['rename_file_name' => 'required|string|max:255']);
        $file = FileManager::getFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        FileManager::updateFile($fileId, ['display_name' => $request->input('rename_file_name')]);
        Cache::tags(['files'])->flush();
        event(new FileRenamed($file));

        return response()->json(['success' => 'File renamed successfully']);
    }

    public function renameFolder(Request $request, $folderId)
    {
        $request->validate(['rename_folder_name' => 'required|string|max:255']);
        $folder = FileManager::getFolder($folderId, Auth::user()->user_id);
        if (!$folder) {
            return response()->json(['error' => 'Folder not found or access denied'], 404);
        }

        FileManager::updateFolder($folderId, ['name' => $request->input('rename_folder_name')]);
        Cache::tags(['folders'])->flush();
        event(new FolderRenamed($folder));

        return response()->json(['success' => 'Folder renamed successfully']);
    }

    public function deleteFile($fileId)
    {
        $file = FileManager::getFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        FileManager::deleteFile($fileId);
        Cache::tags(['files'])->flush();
        event(new FileDeleted($file));

        return response()->json(['success' => 'File moved to trash']);
    }

    public function deleteFolder($folderId)
    {
        $folder = FileManager::getFolder($folderId, Auth::user()->user_id);
        if (!$folder) {
            return response()->json(['error' => 'Folder not found or access denied'], 404);
        }

        FileManager::deleteFolder($folderId);
        Cache::tags(['folders'])->flush();
        event(new FolderDeleted($folder));

        return response()->json(['success' => 'Folder moved to trash']);
    }

    public function restoreFile($fileId)
    {
        $file = FileManager::getTrashedFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        FileManager::restoreFile($fileId);
        Cache::tags(['files'])->flush();
        event(new FileRestored($file));

        return response()->json(['success' => 'File restored successfully']);
    }

    public function restoreFolder($folderId)
    {
        $folder = FileManager::getTrashedFolder($folderId, Auth::user()->user_id);
        if (!$folder) {
            return response()->json(['error' => 'Folder not found or access denied'], 404);
        }

        FileManager::restoreFolder($folderId);
        Cache::tags(['folders'])->flush();
        event(new FolderRestored($folder));

        return response()->json(['success' => 'Folder restored successfully']);
    }

    public function permanentlyDeleteFile($fileId)
    {
        $file = FileManager::getTrashedFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        Storage::disk('public')->delete($file->file_path);
        FileManager::permanentlyDeleteFile($fileId);
        Cache::tags(['files'])->flush();
        event(new FilePermanentlyDeleted($file));

        return response()->json(['success' => 'File permanently deleted']);
    }

    public function permanentlyDeleteFolder($folderId)
    {
        $folder = FileManager::getTrashedFolder($folderId, Auth::user()->user_id);
        if (!$folder) {
            return response()->json(['error' => 'Folder not found or access denied'], 404);
        }

        FileManager::permanentlyDeleteFolder($folderId);
        Cache::tags(['folders'])->flush();
        event(new FolderPermanentlyDeleted($folder));

        return response()->json(['success' => 'Folder permanently deleted']);
    }

    public function downloadFile($fileId)
    {
        $file = FileManager::getFile($fileId, Auth::user()->user_id);
        if (!$file) {
            abort(404, 'File not found or access denied');
        }

        return Storage::disk('public')->download($file->file_path, $file->display_name);
    }

    public function shareFile(Request $request, $fileId)
    {
        $request->validate([
            'share_with' => 'required|email',
            'permission_type' => 'in:view,edit',
        ]);

        $file = FileManager::getFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        $sharedUser = $this->dbService->getConnection('business')->selectOne('SELECT user_id FROM users WHERE email = ?', [$request->input('share_with')]);
        if (!$sharedUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        FileManager::shareFile($fileId, $sharedUser->user_id, $request->input('permission_type'));
        Cache::tags(['files'])->flush();
        event(new FileShared($file, (object) ['user_id' => $sharedUser->user_id]));

        return response()->json(['success' => 'File shared successfully']);
    }

    public function shareFolder(Request $request, $folderId)
    {
        $request->validate([
            'share_with' => 'required|email',
            'permission_type' => 'in:view,edit',
        ]);

        $folder = FileManager::getFolder($folderId, Auth::user()->user_id);
        if (!$folder) {
            return response()->json(['error' => 'Folder not found or access denied'], 404);
        }

        $sharedUser = $this->dbService->getConnection('business')->selectOne('SELECT user_id FROM users WHERE email = ?', [$request->input('share_with')]);
        if (!$sharedUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        FileManager::shareFolder($folderId, $sharedUser->user_id, $request->input('permission_type'));
        Cache::tags(['folders'])->flush();
        event(new FolderShared($folder, (object) ['user_id' => $sharedUser->user_id]));

        return response()->json(['success' => 'Folder shared successfully']);
    }

    public function revokeFileShare($fileId, $userId)
    {
        $file = FileManager::getFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        FileManager::revokeFileShare($fileId, $userId);
        Cache::tags(['files'])->flush();

        return response()->json(['success' => 'Share revoked successfully']);
    }

    public function revokeFolderShare($folderId, $userId)
    {
        $folder = FileManager::getFolder($folderId, Auth::user()->user_id);
        if (!$folder) {
            return response()->json(['error' => 'Folder not found or access denied'], 404);
        }

        FileManager::revokeFolderShare($folderId, $userId);
        Cache::tags(['folders'])->flush();

        return response()->json(['success' => 'Share revoked successfully']);
    }

    public function copy(Request $request)
    {
        $request->validate([
            'item_id' => 'required|uuid',
            'item_type' => 'in:file,folder',
            'destination_folder_id' => 'nullable|uuid',
        ]);

        $itemId = $request->input('item_id');
        $itemType = $request->input('item_type');
        $destinationFolderId = $request->input('destination_folder_id');

        if ($itemType === 'file') {
            $file = FileManager::getFile($itemId, Auth::user()->user_id);
            if (!$file) {
                return response()->json(['error' => 'File not found or access denied'], 404);
            }

            $newFileId = (string) Str::uuid();
            $newPath = 'files/copy_' . basename($file->file_path);
            Storage::disk('public')->copy($file->file_path, $newPath);

            $fileData = [
                'file_id' => $newFileId,
                'user_id' => Auth::user()->user_id,
                'business_id' => Auth::user()->business_id,
                'folder_id' => $destinationFolderId,
                'display_name' => 'Copy of ' . $file->display_name,
                'file_path' => $newPath,
                'file_size' => $file->file_size,
                'mime_type' => $file->mime_type,
                'access_level' => $file->access_level,
                'description' => $file->description,
                'version_number' => 1,
                'is_starred' => false,
            ];

            FileManager::createFile($fileData);
            Cache::tags(['files'])->flush();
            event(new FileCreated((object) $fileData));
        } else {
            $folder = FileManager::getFolder($itemId, Auth::user()->user_id);
            if (!$folder) {
                return response()->json(['error' => 'Folder not found or access denied'], 404);
            }

            $newFolderId = (string) Str::uuid();
            $folderData = [
                'folder_id' => $newFolderId,
                'user_id' => Auth::user()->user_id,
                'business_id' => Auth::user()->business_id,
                'parent_folder_id' => $destinationFolderId,
                'name' => 'Copy of ' . $folder->name,
                'access_level' => $folder->access_level,
                'description' => $folder->description,
                'is_starred' => false,
            ];

            FileManager::createFolder($folderData);
            Cache::tags(['folders'])->flush();
            event(new FolderCreated((object) $folderData));

            // Recursively copy contents
            $this->copyFolderContents($itemId, $newFolderId);
        }

        return response()->json(['success' => ucfirst($itemType) . ' copied successfully']);
    }

    protected function copyFolderContents($sourceFolderId, $destinationFolderId)
    {
        $files = FileManager::listFiles($sourceFolderId, Auth::user()->user_id);
        foreach ($files as $file) {
            $newFileId = (string) Str::uuid();
            $newPath = 'files/copy_' . basename($file->file_path);
            Storage::disk('public')->copy($file->file_path, $newPath);

            $fileData = [
                'file_id' => $newFileId,
                'user_id' => Auth::user()->user_id,
                'business_id' => Auth::user()->business_id,
                'folder_id' => $destinationFolderId,
                'display_name' => $file->display_name,
                'file_path' => $newPath,
                'file_size' => $file->file_size,
                'mime_type' => $file->mime_type,
                'access_level' => $file->access_level,
                'description' => $file->description,
                'version_number' => 1,
                'is_starred' => false,
            ];

            FileManager::createFile($fileData);
            event(new FileCreated((object) $fileData));
        }

        $folders = FileManager::listFolders($sourceFolderId, Auth::user()->user_id);
        foreach ($folders as $folder) {
            $newFolderId = (string) Str::uuid();
            $folderData = [
                'folder_id' => $newFolderId,
                'user_id' => Auth::user()->user_id,
                'business_id' => Auth::user()->business_id,
                'parent_folder_id' => $destinationFolderId,
                'name' => $folder->name,
                'access_level' => $folder->access_level,
                'description' => $folder->description,
                'is_starred' => false,
            ];

            FileManager::createFolder($folderData);
            event(new FolderCreated((object) $folderData));
            $this->copyFolderContents($folder->folder_id, $newFolderId);
        }

        Cache::tags(['files', 'folders'])->flush();
    }

    public function move(Request $request)
    {
        $request->validate([
            'item_id' => 'required|uuid',
            'item_type' => 'in:file,folder',
            'destination_folder_id' => 'nullable|uuid',
        ]);

        $itemId = $request->input('item_id');
        $itemType = $request->input('item_type');
        $destinationFolderId = $request->input('destination_folder_id');

        if ($itemType === 'file') {
            $file = FileManager::getFile($itemId, Auth::user()->user_id);
            if (!$file) {
                return response()->json(['error' => 'File not found or access denied'], 404);
            }

            FileManager::updateFile($itemId, ['folder_id' => $destinationFolderId]);
            Cache::tags(['files'])->flush();
            event(new ItemMoved($file, 'file'));
        } else {
            $folder = FileManager::getFolder($itemId, Auth::user()->user_id);
            if (!$folder) {
                return response()->json(['error' => 'Folder not found or access denied'], 404);
            }

            FileManager::updateFolder($itemId, ['parent_folder_id' => $destinationFolderId]);
            Cache::tags(['folders'])->flush();
            event(new ItemMoved($folder, 'folder'));
        }

        return response()->json(['success' => ucfirst($itemType) . ' moved successfully']);
    }

    public function starFile(Request $request, $fileId)
    {
        $request->validate(['star' => 'required|boolean']);
        $file = FileManager::getFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        FileManager::updateFile($fileId, ['is_starred' => $request->input('star')]);
        Cache::tags(['files'])->flush();
        event(new FileStarred($file));

        return response()->json(['success' => 'File star status updated']);
    }
 
    public function starFolder(Request $request, $folderId)
    {
        $request->validate(['star' => 'required|boolean']);
        $folder = FileManager::getFolder($folderId, Auth::user()->user_id);
        if (!$folder) {
            return response()->json(['error' => 'Folder not found or access denied'], 404);
        }

        FileManager::updateFolder($folderId, ['is_starred' => $request->input('star')]);
        Cache::tags(['folders'])->flush();
        event(new FolderStarred($folder));

        return response()->json(['success' => 'Folder star status updated']);
    }

    public function getFileVersions($fileId)
    {
        $file = FileManager::getFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        $versions = FileManager::getFileVersions($fileId);
        return response()->json($versions);
    }

    public function restoreFileVersion($fileId, $versionNumber)
    {
        $file = FileManager::getFile($fileId, Auth::user()->user_id);
        if (!$file) {
            return response()->json(['error' => 'File not found or access denied'], 404);
        }

        $version = FileManager::getFileVersion($fileId, $versionNumber);
        if (!$version) {
            return response()->json(['error' => 'Version not found'], 404);
        }

        FileManager::updateFile($fileId, [
            'file_path' => $version->file_path,
            'file_size' => $version->file_size,
            'mime_type' => $version->mime_type,
            'version_number' => $file->version_number + 1,
        ]);

        Cache::tags(['files'])->flush();
        event(new FileVersionRestored($file));

        return response()->json(['success' => 'File version restored successfully']);
    }

    public function getActivityLog(Request $request)
    {
        $request->validate([
            'target_id' => 'required|uuid',
            'target_type' => 'in:file,folder',
        ]);

        $logs = FileManager::getActivityLog($request->input('target_id'), $request->input('target_type'), Auth::user()->user_id);
        return response()->json($logs);
    }
}