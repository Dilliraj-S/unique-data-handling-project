<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;
use Exception;

class FileManagerService
{
    protected $dbService;

    public function __construct(DatabaseService $dbService)
    {
        $this->dbService = $dbService;
    }

    /**
     * Get a file by ID with permission check for authenticated user.
     *
     * @param string $fileId File ID.
     * @return object|null File object or null if not found/unauthorized.
     * @throws Exception If database query fails.
     */
    public function getFile($fileId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $conn = $this->dbService->getConnection('business');
            $query = 'SELECT f.* FROM files f 
                      LEFT JOIN file_permissions fp ON f.file_id = fp.file_id 
                      WHERE f.file_id = ? AND f.deleted_at IS NULL 
                      AND (f.user_id = ? OR fp.user_id = ? OR f.access_level = ?)';
            $params = [$fileId, $user->user_id, $user->user_id, 'public'];

            return $conn->selectOne($query, $params);
        } catch (Exception $e) {
            \Log::error('Failed to get file: ' . $e->getMessage(), ['file_id' => $fileId, 'user_id' => auth()->id()]);
            throw new Exception('Unable to retrieve file.');
        }
    }

    /**
     * Upload a file to the specified path for an authenticated user.
     *
     * @param UploadedFile $file The uploaded file.
     * @param string $path Folder path (e.g., 'company/development/testing').
     * @param string $userId User ID of the uploader.
     * @return string File ID of the created file.
     * @throws Exception If upload or database insertion fails.
     */
    public function uploadFile(UploadedFile $file, $path, $userId)
    {
        try {
            $user = auth()->user();
            if (!$user || $user->user_id !== $userId) {
                throw new Exception('Unauthorized access.');
            }

            // Normalize path and ensure folders exist
            $path = trim($path, '/');
            $folderId = $this->ensureFolderPath($path, $userId);

            // Store file in public/files
            $fileName = $file->getClientOriginalName();
            $filePath = $path ? "files/{$path}/{$fileName}" : "files/{$fileName}";
            $fullPath = public_path($filePath);
            $file->move(dirname($fullPath), $fileName);

            // Create file record
            $fileId = (string) Str::uuid();
            $conn = $this->dbService->getConnection('business');
            $conn->insert(
                'INSERT INTO files (file_id, user_id, business_id, folder_id, display_name, file_path, file_size, mime_type, access_level, description, version_number, is_starred, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    $fileId,
                    $userId,
                    $user->business_id,
                    $folderId,
                    $fileName,
                    $filePath,
                    $file->getSize(),
                    $file->getMimeType(),
                    'public',
                    '',
                    1,
                    false,
                ]
            );

            $this->logActivity($fileId, 'file', 'created', $userId);
            Cache::forget('files_' . md5($folderId . $userId . serialize([])));

            return $fileId;
        } catch (Exception $e) {
            \Log::error('Failed to upload file: ' . $e->getMessage(), ['path' => $path, 'user_id' => $userId]);
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
            throw new Exception('Failed to upload file.');
        }
    }

    /**
     * Ensure folder path exists and return the last folder's ID.
     *
     * @param string $path Folder path (e.g., 'company/development/testing').
     * @param string $userId User ID.
     * @return string|null Folder ID of the last folder or null for root.
     * @throws Exception If folder creation fails.
     */
    protected function ensureFolderPath($path, $userId)
    {
        if (!$path) {
            return null;
        }

        $folders = explode('/', $path);
        $parentId = null;
        $conn = $this->dbService->getConnection('business');

        foreach ($folders as $folderName) {
            $folder = $conn->selectOne(
                'SELECT folder_id FROM folders 
                 WHERE name = ? AND user_id = ? AND parent_folder_id <=> ? AND deleted_at IS NULL',
                [$folderName, $userId, $parentId]
            );

            if (!$folder) {
                $folderId = (string) Str::uuid();
                $conn->insert(
                    'INSERT INTO folders (folder_id, user_id, business_id, parent_folder_id, name, access_level, description, is_starred, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                    [
                        $folderId,
                        $userId,
                        auth()->user()->business_id,
                        $parentId,
                        $folderName,
                        'public',
                        '',
                        false,
                    ]
                );
                $this->logActivity($folderId, 'folder', 'created', $userId);
                Cache::forget('folders_' . md5($parentId . $userId . serialize([])));
                Cache::forget('folder_tree_' . $userId);
            } else {
                $folderId = $folder->folder_id;
            }

            $parentId = $folderId;
        }

        return $parentId;
    }

    /**
     * List folders for the authenticated user.
     *
     * @param string|null $folderId Parent folder ID or null for root.
     * @param array $filters Search and advanced filters.
     * @return array List of folder objects.
     * @throws Exception If database query fails.
     */
    public function listFolders($folderId = null, array $filters = [])
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $cacheKey = 'folders_' . md5($folderId . $user->user_id . serialize($filters));
            return Cache::remember($cacheKey, 600, function () use ($folderId, $user, $filters) {
                $conn = $this->dbService->getConnection('business');
                $query = 'SELECT f.* FROM folders f 
                          LEFT JOIN folder_permissions fp ON f.folder_id = fp.folder_id 
                          WHERE f.deleted_at IS NULL 
                          AND (f.user_id = ? OR fp.user_id = ? OR f.access_level = ?)';
                $params = [$user->user_id, $user->user_id, 'public'];

                if ($folderId) {
                    $query .= ' AND f.parent_folder_id = ?';
                    $params[] = $folderId;
                } else {
                    $query .= ' AND f.parent_folder_id IS NULL';
                }

                if (!empty($filters['search'])) {
                    $query .= ' AND f.name LIKE ?';
                    $params[] = '%' . $filters['search'] . '%';
                }
                if (!empty($filters['access_level'])) {
                    $query .= ' AND f.access_level = ?';
                    $params[] = $filters['access_level'];
                }
                if (isset($filters['starred'])) {
                    $query .= ' AND f.is_starred = ?';
                    $params[] = $filters['starred'];
                }
                if (!empty($filters['owner_id'])) {
                    $query .= ' AND f.user_id = ?';
                    $params[] = $filters['owner_id'];
                }
                if (!empty($filters['date_from'])) {
                    $query .= ' AND f.updated_at >= ?';
                    $params[] = $filters['date_from'];
                }
                if (!empty($filters['date_to'])) {
                    $query .= ' AND f.updated_at <= ?';
                    $params[] = $filters['date_to'];
                }

                return $conn->select($query, $params);
            });
        } catch (Exception $e) {
            \Log::error('Failed to list folders: ' . $e->getMessage(), ['user_id' => auth()->id(), 'folder_id' => $folderId]);
            throw new Exception('Unable to retrieve folders.');
        }
    }

    /**
     * List files for the authenticated user.
     *
     * @param string|null $folderId Parent folder ID or null for root.
     * @param array $filters Search and advanced filters.
     * @return array List of file objects.
     * @throws Exception If database query fails.
     */
    public function listFiles($folderId = null, array $filters = [])
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $cacheKey = 'files_' . md5($folderId . $user->user_id . serialize($filters));
            return Cache::remember($cacheKey, 600, function () use ($folderId, $user, $filters) {
                $conn = $this->dbService->getConnection('business');
                $query = 'SELECT f.* FROM files f 
                          LEFT JOIN file_permissions fp ON f.file_id = fp.file_id 
                          WHERE f.deleted_at IS NULL 
                          AND (f.user_id = ? OR fp.user_id = ? OR f.access_level = ?)';
                $params = [$user->user_id, $user->user_id, 'public'];

                if ($folderId) {
                    $query .= ' AND f.folder_id = ?';
                    $params[] = $folderId;
                } else {
                    $query .= ' AND f.folder_id IS NULL';
                }

                if (!empty($filters['search'])) {
                    $query .= ' AND f.display_name LIKE ?';
                    $params[] = '%' . $filters['search'] . '%';
                }
                if (!empty($filters['extension'])) {
                    $query .= ' AND f.display_name LIKE ?';
                    $params[] = '%.' . ltrim($filters['extension'], '.');
                }
                if (!empty($filters['size_min'])) {
                    $query .= ' AND f.file_size >= ?';
                    $params[] = $filters['size_min'] * 1024;
                }
                if (!empty($filters['size_max'])) {
                    $query .= ' AND f.file_size <= ?';
                    $params[] = $filters['size_max'] * 1024;
                }
                if (!empty($filters['access_level'])) {
                    $query .= ' AND f.access_level = ?';
                    $params[] = $filters['access_level'];
                }
                if (isset($filters['starred'])) {
                    $query .= ' AND f.is_starred = ?';
                    $params[] = $filters['starred'];
                }
                if (!empty($filters['owner_id'])) {
                    $query .= ' AND f.user_id = ?';
                    $params[] = $filters['owner_id'];
                }
                if (!empty($filters['date_from'])) {
                    $query .= ' AND f.updated_at >= ?';
                    $params[] = $filters['date_from'];
                }
                if (!empty($filters['date_to'])) {
                    $query .= ' AND f.updated_at <= ?';
                    $params[] = $filters['date_to'];
                }

                return $conn->select($query, $params);
            });
        } catch (Exception $e) {
            \Log::error('Failed to list files: ' . $e->getMessage(), ['user_id' => auth()->id(), 'folder_id' => $folderId]);
            throw new Exception('Unable to retrieve files.');
        }
    }

    /**
     * List trashed folders for the authenticated user.
     *
     * @return array List of trashed folder objects.
     * @throws Exception If database query fails.
     */
    public function listTrashedFolders()
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $conn = $this->dbService->getConnection('business');
            $query = 'SELECT * FROM folders WHERE deleted_at IS NOT NULL AND user_id = ?';
            return $conn->select($query, [$user->user_id]);
        } catch (Exception $e) {
            \Log::error('Failed to list trashed folders: ' . $e->getMessage(), ['user_id' => auth()->id()]);
            throw new Exception('Unable to retrieve trashed folders.');
        }
    }

    /**
     * List trashed files for the authenticated user.
     *
     * @return array List of trashed file objects.
     * @throws Exception If database query fails.
     */
    public function listTrashedFiles()
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $conn = $this->dbService->getConnection('business');
            $query = 'SELECT * FROM files WHERE deleted_at IS NOT NULL AND user_id = ?';
            return $conn->select($query, [$user->user_id]);
        } catch (Exception $e) {
            \Log::error('Failed to list trashed files: ' . $e->getMessage(), ['user_id' => auth()->id()]);
            throw new Exception('Unable to retrieve trashed files.');
        }
    }

    /**
     * Get folder tree for the authenticated user.
     *
     * @return array Nested folder tree.
     * @throws Exception If database query fails.
     */
    public function getFolderTree()
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $cacheKey = 'folder_tree_' . $user->user_id;
            return Cache::remember($cacheKey, 600, function () use ($user) {
                $conn = $this->dbService->getConnection('business');
                $folders = $conn->select(
                    'SELECT folder_id, name, parent_folder_id 
                     FROM folders 
                     WHERE deleted_at IS NULL AND (user_id = ? OR access_level = ?)',
                    [$user->user_id, 'public']
                );

                $tree = [];
                $lookup = [];
                foreach ($folders as $folder) {
                    $folder->children = [];
                    $lookup[$folder->folder_id] = $folder;
                }

                foreach ($folders as $folder) {
                    if ($folder->parent_folder_id && isset($lookup[$folder->parent_folder_id])) {
                        $lookup[$folder->parent_folder_id]->children[] = $folder;
                    } else {
                        $tree[] = $folder;
                    }
                }

                return $tree;
            });
        } catch (Exception $e) {
            \Log::error('Failed to get folder tree: ' . $e->getMessage(), ['user_id' => auth()->id()]);
            throw new Exception('Unable to retrieve folder tree.');
        }
    }

    /**
     * Get breadcrumbs for a folder.
     *
     * @param string $folderId Folder ID.
     * @return array Breadcrumb array.
     * @throws Exception If database query fails.
     */
    public function getBreadcrumbs($folderId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $conn = $this->dbService->getConnection('business');
            $breadcrumbs = [['id' => null, 'name' => 'Home']];

            $currentId = $folderId;
            while ($currentId) {
                $folder = $conn->selectOne(
                    'SELECT folder_id, name, parent_folder_id 
                     FROM folders 
                     WHERE folder_id = ? AND deleted_at IS NULL 
                     AND (user_id = ? OR access_level = ?)',
                    [$currentId, $user->user_id, 'public']
                );
                if (!$folder) {
                    break;
                }
                array_unshift($breadcrumbs, [
                    'id' => $folder->folder_id,
                    'name' => $folder->name,
                ]);
                $currentId = $folder->parent_folder_id;
            }

            return $breadcrumbs;
        } catch (Exception $e) {
            \Log::error('Failed to get breadcrumbs: ' . $e->getMessage(), ['folder_id' => $folderId, 'user_id' => auth()->id()]);
            throw new Exception('Unable to retrieve breadcrumbs.');
        }
    }

    /**
     * Create a new folder.
     *
     * @param array $data Folder data (name, parent_folder_id, etc.).
     * @return string Folder ID.
     * @throws Exception If folder creation fails.
     */
    public function createFolder(array $data)
    {
        try {
            $user = auth()->user();
            if (!$user || $user->user_id !== $data['user_id']) {
                throw new Exception('Unauthorized access.');
            }

            $folderId = (string) Str::uuid();
            $conn = $this->dbService->getConnection('business');
            $conn->insert(
                'INSERT INTO folders (folder_id, user_id, business_id, parent_folder_id, name, access_level, description, is_starred, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    $folderId,
                    $data['user_id'],
                    $data['business_id'],
                    $data['parent_folder_id'],
                    $data['name'],
                    $data['access_level'] ?? 'public',
                    $data['description'] ?? '',
                    $data['is_starred'] ?? false,
                ]
            );

            $this->logActivity($folderId, 'folder', 'created', $data['user_id']);
            Cache::forget('folders_' . md5($data['parent_folder_id'] . $data['user_id'] . serialize([])));
            Cache::forget('folder_tree_' . $data['user_id']);

            return $folderId;
        } catch (Exception $e) {
            \Log::error('Failed to create folder: ' . $e->getMessage(), ['data' => $data]);
            throw new Exception('Failed to create folder.');
        }
    }

    /**
     * Update a file.
     *
     * @param string $fileId File ID.
     * @param array $data Fields to update.
     * @return void
     * @throws Exception If file not found or update fails.
     */
    public function updateFile($fileId, array $data)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $file = $this->getFile($fileId);
            if (!$file) {
                throw new Exception('File not found or access denied.');
            }

            $conn = $this->dbService->getConnection('business');
            $fields = [];
            $params = [];
            foreach ($data as $key => $value) {
                $fields[] = "$key = ?";
                $params[] = $value;
            }
            $params[] = $fileId;

            $conn->update(
                'UPDATE files SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE file_id = ?',
                $params
            );

            $this->logActivity($fileId, 'file', 'updated', $user->user_id);
            Cache::forget('files_' . md5($file->folder_id . $user->user_id . serialize([])));
        } catch (Exception $e) {
            \Log::error('Failed to update file: ' . $e->getMessage(), ['file_id' => $fileId, 'data' => $data]);
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Update a folder.
     *
     * @param string $folderId Folder ID.
     * @param array $data Fields to update.
     * @return void
     * @throws Exception If folder not found or update fails.
     */
    public function updateFolder($folderId, array $data)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $folder = $this->getFolder($folderId);
            if (!$folder) {
                throw new Exception('Folder not found or access denied.');
            }

            $conn = $this->dbService->getConnection('business');
            $fields = [];
            $params = [];
            foreach ($data as $key => $value) {
                $fields[] = "$key = ?";
                $params[] = $value;
            }
            $params[] = $folderId;

            $conn->update(
                'UPDATE folders SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE folder_id = ?',
                $params
            );

            $this->logActivity($folderId, 'folder', 'updated', $user->user_id);
            Cache::forget('folders_' . md5($folder->parent_folder_id . $user->user_id . serialize([])));
            Cache::forget('folder_tree_' . $user->user_id);
        } catch (Exception $e) {
            \Log::error('Failed to update folder: ' . $e->getMessage(), ['folder_id' => $folderId, 'data' => $data]);
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Get a folder by ID with permission check.
     *
     * @param string $folderId Folder ID.
     * @return object|null Folder object or null if not found.
     * @throws Exception If database query fails.
     */
    public function getFolder($folderId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $conn = $this->dbService->getConnection('business');
            $query = 'SELECT f.* FROM folders f 
                      LEFT JOIN folder_permissions fp ON f.folder_id = fp.folder_id 
                      WHERE f.folder_id = ? AND f.deleted_at IS NULL 
                      AND (f.user_id = ? OR fp.user_id = ? OR f.access_level = ?)';
            $params = [$folderId, $user->user_id, $user->user_id, 'public'];

            return $conn->selectOne($query, $params);
        } catch (Exception $e) {
            \Log::error('Failed to get folder: ' . $e->getMessage(), ['folder_id' => $folderId, 'user_id' => auth()->id()]);
            throw new Exception('Unable to retrieve folder.');
        }
    }

    /**
     * Get a trashed file by ID.
     *
     * @param string $fileId File ID.
     * @return object|null File object or null if not found.
     * @throws Exception If database query fails.
     */
    public function getTrashedFile($fileId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $conn = $this->dbService->getConnection('business');
            return $conn->selectOne(
                'SELECT * FROM files WHERE file_id = ? AND deleted_at IS NOT NULL AND user_id = ?',
                [$fileId, $user->user_id]
            );
        } catch (Exception $e) {
            \Log::error('Failed to get trashed file: ' . $e->getMessage(), ['file_id' => $fileId, 'user_id' => auth()->id()]);
            throw new Exception('Unable to retrieve trashed file.');
        }
    }

    /**
     * Get a trashed folder by ID.
     *
     * @param string $folderId Folder ID.
     * @return object|null Folder object or null if not found.
     * @throws Exception If database query fails.
     */
    public function getTrashedFolder($folderId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $conn = $this->dbService->getConnection('business');
            return $conn->selectOne(
                'SELECT * FROM folders WHERE folder_id = ? AND deleted_at IS NOT NULL AND user_id = ?',
                [$folderId, $user->user_id]
            );
        } catch (Exception $e) {
            \Log::error('Failed to get trashed folder: ' . $e->getMessage(), ['folder_id' => $folderId, 'user_id' => auth()->id()]);
            throw new Exception('Unable to retrieve trashed folder.');
        }
    }

    /**
     * Soft delete a file.
     *
     * @param string $fileId File ID.
     * @return void
     * @throws Exception If file not found or deletion fails.
     */
    public function deleteFile($fileId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $file = $this->getFile($fileId);
            if (!$file) {
                throw new Exception('File not found.');
            }

            $conn = $this->dbService->getConnection('business');
            $conn->update(
                'UPDATE files SET deleted_at = NOW() WHERE file_id = ?',
                [$fileId]
            );

            $this->logActivity($fileId, 'file', 'deleted', $user->user_id);
            Cache::forget('files_' . md5($file->folder_id . $user->user_id . serialize([])));
        } catch (Exception $e) {
            \Log::error('Failed to delete file: ' . $e->getMessage(), ['file_id' => $fileId]);
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Soft delete a folder and its contents.
     *
     * @param string $folderId Folder ID.
     * @return void
     * @throws Exception If folder not found or deletion fails.
     */
    public function deleteFolder($folderId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $folder = $this->getFolder($folderId);
            if (!$folder) {
                throw new Exception('Folder not found.');
            }

            $conn = $this->dbService->getConnection('business');
            DB::transaction(function () use ($conn, $folderId, $folder, $user) {
                $conn->update(
                    'UPDATE folders SET deleted_at = NOW() WHERE folder_id = ?',
                    [$folderId]
                );

                $subfolders = $conn->select('SELECT folder_id FROM folders WHERE parent_folder_id = ?', [$folderId]);
                foreach ($subfolders as $subfolder) {
                    $this->deleteFolder($subfolder->folder_id);
                }

                $conn->update(
                    'UPDATE files SET deleted_at = NOW() WHERE folder_id = ?',
                    [$folderId]
                );
            });

            $this->logActivity($folderId, 'folder', 'deleted', $user->user_id);
            Cache::forget('folders_' . md5($folder->parent_folder_id . $user->user_id . serialize([])));
            Cache::forget('folder_tree_' . $user->user_id);
        } catch (Exception $e) {
            \Log::error('Failed to delete folder: ' . $e->getMessage(), ['folder_id' => $folderId]);
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Restore a soft-deleted file.
     *
     * @param string $fileId File ID.
     * @return void
     * @throws Exception If file not found or restoration fails.
     */
    public function restoreFile($fileId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $file = $this->getTrashedFile($fileId);
            if (!$file) {
                throw new Exception('File not found.');
            }

            $conn = $this->dbService->getConnection('business');
            $conn->update(
                'UPDATE files SET deleted_at = NULL WHERE file_id = ?',
                [$fileId]
            );

            $this->logActivity($fileId, 'file', 'restored', $user->user_id);
            Cache::forget('files_' . md5($file->folder_id . $user->user_id . serialize([])));
        } catch (Exception $e) {
            \Log::error('Failed to restore file: ' . $e->getMessage(), ['file_id' => $fileId]);
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Restore a soft-deleted folder and its contents.
     *
     * @param string $folderId Folder ID.
     * @return void
     * @throws Exception If folder not found or restoration fails.
     */
    public function restoreFolder($folderId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $folder = $this->getTrashedFolder($folderId);
            if (!$folder) {
                throw new Exception('Folder not found.');
            }

            $conn = $this->dbService->getConnection('business');
            DB::transaction(function () use ($conn, $folderId, $folder, $user) {
                $conn->update(
                    'UPDATE folders SET deleted_at = NULL WHERE folder_id = ?',
                    [$folderId]
                );

                $subfolders = $conn->select(
                    'SELECT folder_id FROM folders WHERE parent_folder_id = ? AND deleted_at IS NOT NULL',
                    [$folderId]
                );
                foreach ($subfolders as $subfolder) {
                    $this->restoreFolder($subfolder->folder_id);
                }

                $conn->update(
                    'UPDATE files SET deleted_at = NULL WHERE folder_id = ?',
                    [$folderId]
                );
            });

            $this->logActivity($folderId, 'folder', 'restored', $user->user_id);
            Cache::forget('folders_' . md5($folder->parent_folder_id . $user->user_id . serialize([])));
            Cache::forget('folder_tree_' . $user->user_id);
        } catch (Exception $e) {
            \Log::error('Failed to restore folder: ' . $e->getMessage(), ['folder_id' => $folderId]);
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Permanently delete a file and its versions.
     *
     * @param string $fileId File ID.
     * @return void
     * @throws Exception If file not found or deletion fails.
     */
    public function permanentlyDeleteFile($fileId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $file = $this->getTrashedFile($fileId);
            if (!$file) {
                throw new Exception('File not found.');
            }

            $conn = $this->dbService->getConnection('business');
            DB::transaction(function () use ($conn, $fileId, $file, $user) {
                $versions = $conn->select('SELECT file_path FROM file_versions WHERE file_id = ?', [$fileId]);
                foreach ($versions as $version) {
                    if (file_exists(public_path($version->file_path))) {
                        unlink(public_path($version->file_path));
                    }
                }
                $conn->delete('DELETE FROM file_versions WHERE file_id = ?', [$fileId]);

                $conn->delete('DELETE FROM file_permissions WHERE file_id = ?', [$fileId]);
                $conn->delete('DELETE FROM activity_logs WHERE target_id = ? AND target_type = ?', [$fileId, 'file']);
                $conn->delete('DELETE FROM files WHERE file_id = ?', [$fileId]);
            });

            if (file_exists(public_path($file->file_path))) {
                unlink(public_path($file->file_path));
            }
            $this->logActivity($fileId, 'file', 'permanently_deleted', $user->user_id);
            Cache::forget('files_' . md5($file->folder_id . $user->user_id . serialize([])));
        } catch (Exception $e) {
            \Log::error('Failed to permanently delete file: ' . $e->getMessage(), ['file_id' => $fileId]);
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Permanently delete a folder and its contents.
     *
     * @param string $folderId Folder ID.
     * @return void
     * @throws Exception If folder not found or deletion fails.
     */
    public function permanentlyDeleteFolder($folderId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $folder = $this->getTrashedFolder($folderId);
            if (!$folder) {
                throw new Exception('Folder not found.');
            }

            $conn = $this->dbService->getConnection('business');
            DB::transaction(function () use ($conn, $folderId, $folder, $user) {
                $subfolders = $conn->select('SELECT folder_id FROM folders WHERE parent_folder_id = ?', [$folderId]);
                foreach ($subfolders as $subfolder) {
                    $this->permanentlyDeleteFolder($subfolder->folder_id);
                }

                $files = $conn->select('SELECT file_id FROM files WHERE folder_id = ?', [$folderId]);
                foreach ($files as $file) {
                    $this->permanentlyDeleteFile($file->file_id);
                }

                $conn->delete('DELETE FROM folder_permissions WHERE folder_id = ?', [$folderId]);
                $conn->delete('DELETE FROM activity_logs WHERE target_id = ? AND target_type = ?', [$folderId, 'folder']);
                $conn->delete('DELETE FROM folders WHERE folder_id = ?', [$folderId]);
            });

            $this->logActivity($folderId, 'folder', 'permanently_deleted', $user->user_id);
            Cache::forget('folders_' . md5($folder->parent_folder_id . $user->user_id . serialize([])));
            Cache::forget('folder_tree_' . $user->user_id);
        } catch (Exception $e) {
            \Log::error('Failed to permanently delete folder: ' . $e->getMessage(), ['folder_id' => $folderId]);
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Share a file with a user.
     *
     * @param string $fileId File ID.
     * @param string $sharedUserId User ID to share with.
     * @param string $permissionType Permission type (view/edit).
     * @return void
     * @throws Exception If file not found or sharing fails.
     */
    public function shareFile($fileId, $sharedUserId, $permissionType)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $file = $this->getFile($fileId);
            if (!$file) {
                throw new Exception('File not found.');
            }

            $conn = $this->dbService->getConnection('business');
            $conn->insert(
                'INSERT INTO file_permissions (file_id, user_id, permission_type, created_at) 
                 VALUES (?, ?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE permission_type = ?, updated_at = NOW()',
                [$fileId, $sharedUserId, $permissionType, $permissionType]
            );

            $this->logActivity($fileId, 'file', 'shared', $user->user_id, ['shared_user_id' => $sharedUserId]);
            Cache::forget('files_' . md5($file->folder_id . $user->user_id . serialize([])));
        } catch (Exception $e) {
            \Log::error('Failed to share file: ' . $e->getMessage(), ['file_id' => $fileId, 'shared_user_id' => $sharedUserId]);
            throw new Exception('Failed to share file.');
        }
    }

    /**
     * Share a folder with a user.
     *
     * @param string $folderId Folder ID.
     * @param string $sharedUserId User ID to share with.
     * @param string $permissionType Permission type (view/edit).
     * @return void
     * @throws Exception If folder not found or sharing fails.
     */
    public function shareFolder($folderId, $sharedUserId, $permissionType)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $folder = $this->getFolder($folderId);
            if (!$folder) {
                throw new Exception('Folder not found.');
            }

            $conn = $this->dbService->getConnection('business');
            DB::transaction(function () use ($conn, $folderId, $sharedUserId, $permissionType, $user) {
                $conn->insert(
                    'INSERT INTO folder_permissions (folder_id, user_id, permission_type, created_at) 
                     VALUES (?, ?, ?, NOW()) 
                     ON DUPLICATE KEY UPDATE permission_type = ?, updated_at = NOW()',
                    [$folderId, $sharedUserId, $permissionType, $permissionType]
                );

                $subfolders = $conn->select('SELECT folder_id FROM folders WHERE parent_folder_id = ?', [$folderId]);
                foreach ($subfolders as $subfolder) {
                    $this->shareFolder($subfolder->folder_id, $sharedUserId, $permissionType);
                }

                $files = $conn->select('SELECT file_id FROM files WHERE folder_id = ?', [$folderId]);
                foreach ($files as $file) {
                    $this->shareFile($file->file_id, $sharedUserId, $permissionType);
                }
            });

            $this->logActivity($folderId, 'folder', 'shared', $user->user_id, ['shared_user_id' => $sharedUserId]);
            Cache::forget('folders_' . md5($folder->parent_folder_id . $user->user_id . serialize([])));
            Cache::forget('folder_tree_' . $user->user_id);
        } catch (Exception $e) {
            \Log::error('Failed to share folder: ' . $e->getMessage(), ['folder_id' => $folderId, 'shared_user_id' => $sharedUserId]);
            throw new Exception('Failed to share folder.');
        }
    }

    /**
     * Revoke file share for a user.
     *
     * @param string $fileId File ID.
     * @param string $userId User ID to revoke.
     * @return void
     * @throws Exception If file not found or revocation fails.
     */
    public function revokeFileShare($fileId, $userId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $file = $this->getFile($fileId);
            if (!$file) {
                throw new Exception('File not found.');
            }

            $conn = $this->dbService->getConnection('business');
            $conn->delete(
                'DELETE FROM file_permissions WHERE file_id = ? AND user_id = ?',
                [$fileId, $userId]
            );

            $this->logActivity($fileId, 'file', 'share_revoked', $user->user_id, ['revoked_user_id' => $userId]);
            Cache::forget('files_' . md5($file->folder_id . $user->user_id . serialize([])));
        } catch (Exception $e) {
            \Log::error('Failed to revoke file share: ' . $e->getMessage(), ['file_id' => $fileId, 'user_id' => $userId]);
            throw new Exception('Failed to revoke file share.');
        }
    }

    /**
     * Revoke folder share for a user.
     *
     * @param string $folderId Folder ID.
     * @param string $userId User ID to revoke.
     * @return void
     * @throws Exception If folder not found or revocation fails.
     */
    public function revokeFolderShare($folderId, $userId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $folder = $this->getFolder($folderId);
            if (!$folder) {
                throw new Exception('Folder not found.');
            }

            $conn = $this->dbService->getConnection('business');
            DB::transaction(function () use ($conn, $folderId, $userId, $folder, $user) {
                $conn->delete(
                    'DELETE FROM folder_permissions WHERE folder_id = ? AND user_id = ?',
                    [$folderId, $userId]
                );

                $subfolders = $conn->select('SELECT folder_id FROM folders WHERE parent_folder_id = ?', [$folderId]);
                foreach ($subfolders as $subfolder) {
                    $this->revokeFolderShare($subfolder->folder_id, $userId);
                }

                $files = $conn->select('SELECT file_id FROM files WHERE folder_id = ?', [$folderId]);
                foreach ($files as $file) {
                    $this->revokeFileShare($file->file_id, $userId);
                }
            });

            $this->logActivity($folderId, 'folder', 'share_revoked', $user->user_id, ['revoked_user_id' => $userId]);
            Cache::forget('folders_' . md5($folder->parent_folder_id . $user->user_id . serialize([])));
            Cache::forget('folder_tree_' . $user->user_id);
        } catch (Exception $e) {
            \Log::error('Failed to revoke folder share: ' . $e->getMessage(), ['folder_id' => $folderId, 'user_id' => $userId]);
            throw new Exception('Failed to revoke folder share.');
        }
    }

    /**
     * Create a new file version.
     *
     * @param array $data Version data (file_id, version_number, file_path, etc.).
     * @return void
     * @throws Exception If version creation fails.
     */
    public function createFileVersion(array $data)
    {
        try {
            $user = auth()->user();
            if (!$user || $user->user_id !== $data['user_id']) {
                throw new Exception('Unauthorized access.');
            }

            $conn = $this->dbService->getConnection('business');
            $conn->insert(
                'INSERT INTO file_versions (file_id, version_number, file_path, file_size, mime_type, user_id, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [
                    $data['file_id'],
                    $data['version_number'],
                    $data['file_path'],
                    $data['file_size'],
                    $data['mime_type'],
                    $data['user_id'],
                ]
            );

            $this->logActivity($data['file_id'], 'file', 'version_created', $data['user_id']);
            Cache::forget('files_' . md5($data['folder_id'] . $data['user_id'] . serialize([])));
        } catch (Exception $e) {
            \Log::error('Failed to create file version: ' . $e->getMessage(), ['data' => $data]);
            if (file_exists(public_path($data['file_path']))) {
                unlink(public_path($data['file_path']));
            }
            throw new Exception('Failed to create file version.');
        }
    }

    /**
     * Get all versions of a file.
     *
     * @param string $fileId File ID.
     * @return array List of version objects.
     * @throws Exception If database query fails.
     */
    public function getFileVersions($fileId)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $file = $this->getFile($fileId);
            if (!$file) {
                throw new Exception('File not found or access denied.');
            }

            $conn = $this->dbService->getConnection('business');
            return $conn->select(
                'SELECT * FROM file_versions WHERE file_id = ? ORDER BY version_number DESC',
                [$fileId]
            );
        } catch (Exception $e) {
            \Log::error('Failed to get file versions: ' . $e->getMessage(), ['file_id' => $fileId]);
            throw new Exception('Unable to retrieve file versions.');
        }
    }

    /**
     * Get a specific file version.
     *
     * @param string $fileId File ID.
     * @param int $versionNumber Version number.
     * @return object|null Version object or null if not found.
     * @throws Exception If database query fails.
     */
    public function getFileVersion($fileId, $versionNumber)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            $file = $this->getFile($fileId);
            if (!$file) {
                throw new Exception('File not found or access denied.');
            }

            $conn = $this->dbService->getConnection('business');
            return $conn->selectOne(
                'SELECT * FROM file_versions WHERE file_id = ? AND version_number = ?',
                [$fileId, $versionNumber]
            );
        } catch (Exception $e) {
            \Log::error('Failed to get file version: ' . $e->getMessage(), ['file_id' => $fileId, 'version_number' => $versionNumber]);
            throw new Exception('Unable to retrieve file version.');
        }
    }

    /**
     * Get activity logs for a target.
     *
     * @param string $targetId Target ID (file or folder).
     * @param string $targetType Type (file or folder).
     * @return array List of log objects.
     * @throws Exception If database query fails.
     */
    public function getActivityLog($targetId, $targetType)
    {
        try {
            $user = auth()->user();
            if (!$user) {
                throw new Exception('Unauthorized access.');
            }

            if ($targetType === 'file') {
                $file = $this->getFile($targetId);
                if (!$file) {
                    throw new Exception('File not found or access denied.');
                }
            } else {
                $folder = $this->getFolder($targetId);
                if (!$folder) {
                    throw new Exception('Folder not found or access denied.');
                }
            }

            $conn = $this->dbService->getConnection('business');
            return $conn->select(
                'SELECT * FROM activity_logs WHERE target_id = ? AND target_type = ?',
                [$targetId, $targetType]
            );
        } catch (Exception $e) {
            \Log::error('Failed to get activity log: ' . $e->getMessage(), ['target_id' => $targetId, 'target_type' => $targetType]);
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Log an activity.
     *
     * @param string $targetId Target ID (file or folder).
     * @param string $targetType Type (file or folder).
     * @param string $action Action performed.
     * @param string $userId User ID.
     * @param array $additionalData Additional data for the log.
     * @return void
     * @throws Exception If logging fails.
     */
    protected function logActivity($targetId, $targetType, $action, $userId, array $additionalData = [])
    {
        try {
            $conn = $this->dbService->getConnection('business');
            $conn->insert(
                'INSERT INTO activity_logs (log_id, target_id, target_type, action, user_id, additional_data, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [
                    (string) Str::uuid(),
                    $targetId,
                    $targetType,
                    $action,
                    $userId,
                    json_encode($additionalData),
                ]
            );
        } catch (Exception $e) {
            \Log::error('Failed to log activity: ' . $e->getMessage(), [
                'target_id' => $targetId,
                'target_type' => $targetType,
                'action' => $action,
                'user_id' => $userId,
            ]);
            throw new Exception('Failed to log activity.');
        }
    }
}