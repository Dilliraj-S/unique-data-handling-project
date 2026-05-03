<?php
namespace App\Http\Helpers;

use App\Facades\{Data, Developer, Skeleton};
use Illuminate\Support\Facades\{DB, Log};
use Exception;

/**
 * Helper for handling common data.
 */
class Helper
{
    /**
     * Fetch data from a specified table with selected columns and conditions.
     *
     * @param string $table Table name
     * @param array|string $columns Columns to select ('all' or array of column names)
     * @param array $condition Where conditions (e.g., ['where' => ['status' => 'active'], 'search' => 'term'])
     * @param string $output Output format ('array' or 'json')
     * @return array|string Fetched data in the specified format
     * @throws Exception
     */
    public function fetch(string $table, $columns, array $condition, string $output)
    {
        try {
            if (empty($table)) {
                throw new Exception('Table name is required.');
            }
            if (!in_array($output, ['array', 'json'], true)) {
                throw new Exception('Invalid output format. Must be "array" or "json".');
            }
            if (!is_array($columns) && $columns !== 'all') {
                throw new Exception('Columns must be "all" or an array of column names.');
            }
            $system = Skeleton::getUserSystem();
            $data = Data::get($system, $table, $condition);
            $results = [];
            foreach ($data['data'] ?? [] as $row) {
                $item = [];
                if ($columns === 'all') {
                    foreach ((array)$row as $key => $value) {
                        $item[$key] = htmlspecialchars((string)$value);
                    }
                } else {
                    foreach ($columns as $col) {
                        $item[$col] = property_exists($row, $col) ? htmlspecialchars((string)$row->$col) : '';
                    }
                }
                $results[] = $item;
            }
            if (config('skeleton.developer_mode')) {
                Developer::debug('SelectCtrl: Fetch data', [
                    'system' => $system,
                    'table' => $table,
                    'columns' => $columns,
                    'condition' => $condition,
                    'results_count' => count($results),
                    'sample_result' => $results ? array_slice($results, 0, 3) : [],
                ]);
            }
            return $output === 'json' ? json_encode($results) : $results;
        } catch (Exception $e) {
            Developer::error('SelectCtrl: Error fetching data', [
                'table' => $table,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get folder paths recursively.
     *
     * @param array|null $folders List of folders (optional for recursive calls)
     * @param int|null $parentId Parent folder ID (optional for recursive calls)
     * @param string $prefix Path prefix (optional for recursive calls)
     * @param array|null $paths Accumulated paths (optional for recursive calls)
     * @return array Array of folder paths keyed by folder ID
     */
    public function getFolderPaths(?array $folders = null, $parentId = null, string $prefix = '', ?array &$paths = null): array
    {
        if ($folders === null) {
            $folders = $this->fetch('skeleton_folders', ['folder_id', 'name', 'parent_folder_id'], [
                'where' => ['deleted_at' => null, 'is_active' => 1]
            ], 'array');
            if (config('skeleton.developer_mode')) {
                Developer::debug('getFolderPaths: Fetched folders', [
                    'folder_count' => count($folders),
                    'folders' => $folders ? array_slice($folders, 0, 3) : [],
                ]);
            }
        }
        if ($paths === null) {
            $paths = [];
        }
        foreach ($folders as $folder) {
            if (!isset($folder['folder_id'], $folder['name'], $folder['parent_folder_id'])) {
                Developer::debug('getFolderPaths: Invalid folder data', ['folder' => $folder]);
                continue;
            }
            $folderParentId = $folder['parent_folder_id'] === '' ? null : $folder['parent_folder_id'];
            if ($folderParentId === $parentId) {
                $folderName = strtolower(str_replace(' ', '-', trim($folder['name'])));
                $fullPath = $prefix !== '' ? $prefix . '\\' . $folderName : $folderName;
                $paths[$folder['folder_id']] = '\\' . $fullPath;
                Developer::debug('getFolderPaths: Path created', [
                    'folder_id' => $folder['folder_id'],
                    'path' => '\\' . $fullPath,
                ]);
                $this->getFolderPaths($folders, $folder['folder_id'], $fullPath, $paths);
            }
        }
        return $paths;
    }

    /**
     * Fetch all permissions in a hierarchical JSON structure from permissions table.
     *
     * @return array Hierarchical structure of all permissions
     * @throws Exception
     */
    public function getPermissionsStructure()
    {
        try {
            // Define valid permissions
            $validPermissions = ['create', 'view', 'edit', 'delete', 'import', 'export'];

            // Fetch all permissions
            $permissions = $this->fetch('permissions', ['permission_id', 'name', 'is_skeleton'], [], 'array');
            $allPermissions = ['skeleton' => [], 'custom' => []];
            $skippedPermissions = [];
            $seenNames = []; // Track unique permission names (normalized)

            foreach ($permissions as $perm) {
                $name = trim($perm['name'] ?? '');
                $permissionId = $perm['permission_id'] ?? '';
                $isSkeleton = isset($perm['is_skeleton']) ? (bool) $perm['is_skeleton'] : false;

                // Normalize name for deduplication
                $normalizedName = strtolower($name);
                if (isset($seenNames[$normalizedName])) {
                    Log::warning('Skipping duplicate permission name', [
                        'name' => $name,
                        'permission_id' => $permissionId,
                        'existing_id' => $seenNames[$normalizedName]
                    ]);
                    $skippedPermissions[] = $perm;
                    continue;
                }
                $seenNames[$normalizedName] = $permissionId;

                // Validate permission name
                if (empty($name) || !strpos($name, ':')) {
                    Log::warning('Skipping invalid permission name', ['perm' => $perm]);
                    $skippedPermissions[] = $perm;
                    continue;
                }

                // Split action and path
                [$action, $path] = explode(':', $name, 2);
                $action = trim($action);
                $path = trim($path);

                // Validate action
                if (!in_array($action, $validPermissions)) {
                    Log::warning('Skipping invalid permission action', [
                        'action' => $action,
                        'perm' => $perm
                    ]);
                    $skippedPermissions[] = $perm;
                    continue;
                }

                // Determine type
                $type = $isSkeleton ? 'skeleton' : 'custom';
                $current = &$allPermissions[$type];

                // Handle custom permissions with empty path
                if ($type === 'custom' && empty($path)) {
                    $part = $action;
                    if (!isset($current[$part])) {
                        $current[$part] = ['permissions' => []];
                    }
                    $current[$part]['permissions'][$action] = $permissionId;
                    Log::debug('Added custom permission', [
                        'part' => $part,
                        'action' => $action,
                        'permission_id' => $permissionId
                    ]);
                    continue;
                }

                // Split path into parts
                $pathParts = explode('::', $path);
                $pathParts = array_map('trim', array_filter($pathParts));

                if (empty($pathParts)) {
                    Log::warning('Skipping permission with empty path', ['perm' => $perm]);
                    $skippedPermissions[] = $perm;
                    continue;
                }

                // Build hierarchy
                foreach ($pathParts as $index => $part) {
                    if (empty($part)) {
                        Log::warning('Skipping empty path part', ['perm' => $perm, 'part_index' => $index]);
                        continue 2; // Skip entire permission
                    }
                    if ($index === count($pathParts) - 1) {
                        if (!isset($current[$part])) {
                            $current[$part] = ['permissions' => []];
                        }
                        $current[$part]['permissions'][$action] = $permissionId;
                        Log::debug('Added permission', [
                            'type' => $type,
                            'part' => $part,
                            'action' => $action,
                            'permission_id' => $permissionId
                        ]);
                    } else {
                        if (!isset($current[$part])) {
                            $current[$part] = ['permissions' => []];
                        }
                    }
                    $current = &$current[$part];
                }
            }

            $allPermissions = $this->cleanEmptyArrays($allPermissions);

            // Ensure custom is present
            if (!isset($allPermissions['custom'])) {
                $allPermissions['custom'] = [];
            }

            if (config('skeleton.developer_mode')) {
                Developer::debug('PermissionsCtrl: Fetch permissions structure', [
                    'permissions_count' => count($permissions),
                    'skipped_count' => count($skippedPermissions),
                    'skeleton_count' => count($allPermissions['skeleton']),
                    'custom_count' => count($allPermissions['custom']),
                    'structure' => $allPermissions,
                    'skipped_permissions' => $skippedPermissions
                ]);
            }

            return $allPermissions;
        } catch (Exception $e) {
            Developer::error('PermissionsCtrl: Error fetching permissions structure', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Fetch preselected permissions for a role or user in a hierarchical JSON structure.
     *
     * @param string $table Table name ('role_permissions' or 'user_permissions')
     * @param int $id Role ID or User ID
     * @return array Hierarchical structure of preselected permissions
     * @throws Exception
     */
    public function getPermissions(string $table, int $id)
    {
        try {
            if (!in_array($table, ['role_permissions', 'user_permissions'])) {
                throw new Exception('Invalid table name. Must be "role_permissions" or "user_permissions".');
            }

            // Define valid permissions
            $validPermissions = ['create', 'view', 'edit', 'delete', 'import', 'export'];

            // Fetch permissions and selected permissions
            $permissions = $this->fetch('permissions', ['permission_id', 'name', 'is_skeleton'], [], 'array');
            $condition = $table === 'role_permissions' ? ['where' => ['role_id' => $id]] : ['where' => ['user_id' => $id]];
            $selectedPermissions = $this->fetch($table, ['permission_id'], $condition, 'array');

            $preselectedPermissions = ['skeleton' => [], 'custom' => []];
            $rolePermissionIds = array_column($selectedPermissions, 'permission_id');
            $seenNames = []; // Track unique permission names (normalized)

            foreach ($permissions as $perm) {
                if (!in_array($perm['permission_id'], $rolePermissionIds)) {
                    continue;
                }
                $name = trim($perm['name'] ?? '');
                $permissionId = $perm['permission_id'] ?? '';
                $isSkeleton = (bool) $perm['is_skeleton'];

                // Normalize name for deduplication
                $normalizedName = strtolower($name);
                if (isset($seenNames[$normalizedName])) {
                    Log::warning('Skipping duplicate preselected permission name', [
                        'name' => $name,
                        'permission_id' => $permissionId,
                        'existing_id' => $seenNames[$normalizedName]
                    ]);
                    continue;
                }
                $seenNames[$normalizedName] = $permissionId;

                // Validate permission
                if (empty($name) || !strpos($name, ':')) {
                    Log::warning('Skipping invalid preselected permission', ['perm' => $perm]);
                    continue;
                }

                // Split action and path
                [$action, $path] = explode(':', $name, 2);
                $action = trim($action);
                $path = trim($path);

                // Validate action
                if (!in_array($action, $validPermissions)) {
                    Log::warning('Skipping invalid preselected permission action', [
                        'action' => $action,
                        'perm' => $perm
                    ]);
                    continue;
                }

                // Determine type
                $type = $isSkeleton ? 'skeleton' : 'custom';
                $current = &$preselectedPermissions[$type];

                // Handle custom permissions with empty path
                if ($type === 'custom' && empty($path)) {
                    $part = $action;
                    if (!isset($current[$part])) {
                        $current[$part] = ['permissions' => []];
                    }
                    $current[$part]['permissions'][$action] = $permissionId;
                    Log::debug('Added preselected custom permission', [
                        'part' => $part,
                        'action' => $action,
                        'permission_id' => $permissionId
                    ]);
                    continue;
                }
                $pathParts = explode('::', $path);
                $pathParts = array_map('trim', array_filter($pathParts));

                if (empty($pathParts)) {
                    Log::warning('Skipping preselected permission with empty path', ['perm' => $perm]);
                    continue;
                }

                // Build hierarchy
                foreach ($pathParts as $index => $part) {
                    if (empty($part)) {
                        Log::warning('Skipping empty preselected path part', ['perm' => $perm, 'part_index' => $index]);
                        continue 2; // Skip entire permission
                    }
                    if ($index === count($pathParts) - 1) {
                        if (!isset($current[$part])) {
                            $current[$part] = ['permissions' => []];
                        }
                        $current[$part]['permissions'][$action] = $permissionId;
                        Log::debug('Added preselected permission', [
                            'type' => $type,
                            'part' => $part,
                            'action' => $action,
                            'permission_id' => $permissionId
                        ]);
                    } else {
                        if (!isset($current[$part])) {
                            $current[$part] = ['permissions' => []];
                        }
                    }
                    $current = &$current[$part];
                }
            }

            $preselectedPermissions = $this->cleanEmptyArrays($preselectedPermissions);
            if (!isset($preselectedPermissions['custom'])) {
                $preselectedPermissions['custom'] = [];
            }

            if (config('skeleton.developer_mode')) {
                Developer::debug('PermissionsCtrl: Fetch preselected permissions', [
                    'table' => $table,
                    'id' => $id,
                    'permissions_count' => count($selectedPermissions),
                    'structure' => $preselectedPermissions
                ]);
            }

            return $preselectedPermissions;
        } catch (Exception $e) {
            Developer::error('PermissionsCtrl: Error fetching preselected permissions', [
                'table' => $table,
                'id' => $id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Recursively clean empty arrays from the permissions structure, preserving nodes with permissions or children.
     *
     * @param array $array The array to clean
     * @return array The cleaned array
     */
    private function cleanEmptyArrays(array $array)
    {
        $result = [];
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $cleaned = $this->cleanEmptyArrays($value);
                if (!empty($cleaned) || 
                    (isset($value['permissions']) && !empty($value['permissions'])) || 
                    in_array($key, ['skeleton', 'custom'])) {
                    $result[$key] = $cleaned;
                }
            } else {
                $result[$key] = $value;
            }
        }
        return $result;
    }
}