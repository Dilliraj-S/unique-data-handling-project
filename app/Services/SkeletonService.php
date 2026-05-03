<?php
namespace App\Services;
use App\Facades\{BusinessDB, CentralDB, Database, Developer};
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\{Auth, Cache, Config, Session, DB};
use Illuminate\Database\Connection;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Throwable;
use Exception;
/**
 * Manages skeleton-related data, permissions, roles, and navigation for authenticated users.
 */
class SkeletonService
{
    // ----------------------------------- User-Related Functions -----------------------------------
    /**
     * Retrieves the authenticated user with comprehensive user-related data.
     *
     * @param User|null $user The user object to use (optional, defaults to Auth guard).
     * @param bool $throwIfUnauthenticated Whether to throw an exception if no user is authenticated.
     * @param string|null $roleId The role ID to set as active (optional).
     * @param bool $forceReload Whether to force a full database reload, bypassing session data (default: false).
     * @return User|null The enriched user object or null if not authenticated and not required to throw.
     * @throws AuthenticationException If unauthenticated and $throwIfUnauthenticated is true.
     * @throws RuntimeException If critical data retrieval fails.
     * @throws InvalidArgumentException If invalid roleId or user data is provided.
     */
    public function getAuthenticatedUser(?User $user = null, bool $throwIfUnauthenticated = false, ?string $roleId = null, bool $forceReload = false): ?User
    {
        try {
            // Step 1: Authenticate user
            $user = $user ?? (Auth::guard('web')->check()
                ? Auth::guard('web')->user()
                : (Auth::guard('sanctum')->check() ? Auth::guard('sanctum')->user() : null));
            if (!$user) {
                if ($throwIfUnauthenticated) {
                    throw new AuthenticationException('No authenticated user found.');
                }
                return null;
            }
            // Step 2: Load from session if available and not forced to reload
            $sessionKey = 'auth_user_data_' . $user->user_id;
            $cachedData = !$forceReload ? session($sessionKey) : null;
            if ($cachedData) {
                $user->system = $cachedData['system'];
                $user->connection = $this->getConnection($cachedData['system'], $user->business_id);
                $user->role = $cachedData['role'];
                $user->roles = $cachedData['roles'];
                $user->employee = $cachedData['employee'];
                $user->permissions = $cachedData['permissions'];
                $user->sidebar = $cachedData['sidebar'];
                return $user;
            }
            // Step 3: Determine system
            try {
                $system = CentralDB::table('systems')
                    ->where('business_id', $user->business_id)
                    ->value('system') ?: 'business';
            } catch (Throwable $e) {
                Developer::error('Failed to determine user system', [
                    'user_id' => $user->user_id,
                    'business_id' => $user->business_id,
                    'error' => $e->getMessage(),
                ]);
                $system = 'business';
            }
            // Step 4: Get connection
            try {
                $connection = $this->getConnection($system, $user->business_id);
            } catch (Throwable $e) {
                throw new RuntimeException('Failed to establish database connection: ' . $e->getMessage());
            }
            // Step 5: Get roles
            try {
                $roles = [];
                $roleQuery = $connection->table('user_roles')
                    ->join('roles', 'user_roles.role_id', '=', 'roles.role_id')
                    ->where('user_roles.user_id', $user->user_id)
                    ->whereNull('user_roles.deleted_at')
                    ->where('user_roles.is_active', 1)
                    ->where('roles.is_active', 1)
                    ->whereNull('roles.deleted_at')
                    ->select('roles.id', 'roles.role_id', 'roles.name', 'user_roles.is_active');
                foreach ($roleQuery->cursor() as $role) {
                    if (!isset($role->role_id, $role->id, $role->name)) {
                        Developer::warning('Skipping invalid role record', [
                            'user_id' => $user->user_id,
                            'role_data' => json_encode($role),
                        ]);
                        continue;
                    }
                    $roles[trim($role->role_id)] = [
                        'id' => $role->id,
                        'role_id' => trim($role->role_id),
                        'name' => trim($role->name),
                        'active' => (int) $role->is_active,
                    ];
                }
                if (empty($roles)) {
                    Developer::error('No active roles found for user', [
                        'user_id' => $user->user_id,
                    ]);
                    throw new RuntimeException('No active roles found for user.');
                }
            } catch (Throwable $e) {
                Developer::error('Failed to fetch user roles', [
                    'user_id' => $user->user_id,
                    'error' => $e->getMessage(),
                ]);
                throw new RuntimeException('Failed to fetch user roles: ' . $e->getMessage());
            }
            // Step 6: Resolve active role
            try {
                $activeRoleId = $roleId ?? null;
                if ($activeRoleId && !isset($roles[$activeRoleId])) {
                    throw new InvalidArgumentException('Invalid role ID provided.');
                }
                if (!$activeRoleId) {
                    // Find first explicitly active role
                    foreach ($roles as $role) {
                        if ($role['active'] === 1) {
                            $activeRoleId = $role['role_id'];
                            break;
                        }
                    }
                    // If no active role was found, fall back to the first role
                    if (!$activeRoleId) {
                        $firstRole = reset($roles);
                        $activeRoleId = $firstRole['role_id'];
                    }
                }
                $activeRole = $roles[$activeRoleId];
            } catch (Throwable $e) {
                Developer::error('Failed to resolve active role', [
                    'user_id' => $user->user_id,
                    'error' => $e->getMessage(),
                ]);
                throw new RuntimeException('Failed to resolve active role: ' . $e->getMessage());
            }
            // Step 7: Get employee (if not central)
            $employee = null;
            if ($user->business_id !== 'CENTRAL') {
                try {
                    $employee = BusinessDB::table('employees')
                        ->where('user_id', $user->user_id)
                        ->select(['id', 'company_id', 'branch_id', 'role_id', 'phone', 'email'])
                        ->first();
                    if (!$employee) {
                        Developer::error('Employee data not found', [
                            'user_id' => $user->user_id,
                        ]);
                        throw new RuntimeException('Employee data not found for user.');
                    }
                } catch (Throwable $e) {
                    Developer::error('Failed to fetch employee data', [
                        'user_id' => $user->user_id,
                        'error' => $e->getMessage(),
                    ]);
                    throw new RuntimeException('Failed to fetch employee data: ' . $e->getMessage());
                }
            }
            // Step 8: Fetch permissions
            try {
                $rolePermissions = $connection->table('role_permissions')
                    ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.permission_id')
                    ->where('permissions.is_approved', 1)
                    ->where('role_permissions.is_active', 1)
                    ->where('role_permissions.role_id', $activeRoleId)
                    ->pluck('permissions.name')
                    ->map(fn($name) => is_string($name) ? trim($name) : null)
                    ->filter()
                    ->toArray();
                $userPermissionsData = $connection->table('user_permissions')
                    ->join('permissions', 'user_permissions.permission_id', '=', 'permissions.permission_id')
                    ->where('permissions.is_approved', 1)
                    ->where('user_permissions.is_active', 1)
                    ->where('user_permissions.user_id', $user->user_id)
                    ->select(['permissions.name', 'user_permissions.is_restricted'])
                    ->get();
                $userPermissions = [];
                $restrictedPermissions = [];
                foreach ($userPermissionsData as $perm) {
                    if (!isset($perm->name) || !is_string($perm->name)) {
                        continue;
                    }
                    $permName = trim($perm->name);
                    if ($perm->is_restricted) {
                        $restrictedPermissions[] = $permName;
                    } else {
                        $userPermissions[] = $permName;
                    }
                }
                $permissions = array_values(array_unique(array_diff(
                    array_merge($rolePermissions, $userPermissions),
                    $restrictedPermissions
                )));
            } catch (Throwable $e) {
                throw new RuntimeException('Failed to fetch permissions data: ' . $e->getMessage());
            }
            // Step 9: Build sidebar navigation based on permissions
            try {
                $skeletonData = $this->getSkeletonData();
                $modules = collect($skeletonData['modules'] ?? []);
                $sections = collect($skeletonData['sections'] ?? []);
                $items = collect($skeletonData['items'] ?? []);
                $navigation = [];
                foreach ($modules as $module) {
                    $moduleName = $module['name'] ?? null;
                    if (!$moduleName || ($module['navigable'] ?? 0) != 1 || !in_array("view:{$moduleName}", $permissions)) {
                        continue;
                    }
                    $moduleSections = [];
                    foreach ($sections->where('module_id', $module['module_id']) as $section) {
                        $sectionName = $section['name'] ?? null;
                        if (!$sectionName || ($section['navigable'] ?? 0) != 1 || !in_array("view:{$moduleName}::{$sectionName}", $permissions)) {
                            continue;
                        }
                        $sectionItems = [];
                        foreach ($items->where('section_id', $section['section_id']) as $item) {
                            $itemName = $item['name'] ?? null;
                            if (!$itemName || ($item['navigable'] ?? 0) != 1 || !in_array("view:{$moduleName}::{$sectionName}::{$itemName}", $permissions)) {
                                continue;
                            }
                            $sectionItems[] = [
                                'name' => $itemName,
                                'route' => url('/') . '/' .
                                    Str::kebab($moduleName) . '/' .
                                    Str::kebab($sectionName) . '/' .
                                    Str::kebab($itemName),
                                'icon' => $item['icon'] ?? null,
                            ];
                        }
                        $moduleSections[] = [
                            'name' => $sectionName,
                            'route' => url('/') . '/' .
                                Str::kebab($moduleName) . '/' .
                                Str::kebab($sectionName),
                            'icon' => $section['icon'] ?? null,
                            'items' => $sectionItems,
                        ];
                    }
                    if (!empty($moduleSections)) {
                        $navigation[] = [
                            'name' => $moduleName,
                            'icon' => $module['icon'] ?? 'bi bi-grid',
                            'sections' => $moduleSections,
                        ];
                    }
                }
            } catch (Throwable $e) {
                $navigation = [];
            }
            // Step 10: Attach all data to user object
            $user->system = $system;
            $user->connection = $connection;
            $user->role = $activeRole;
            $user->roles = $roles;
            $user->employee = $employee;
            $user->permissions = $permissions;
            $user->sidebar = $navigation;
            $user->profile = is_string($user->profile)? $user->profile : json_encode($user->profile ?? []);
            // Step 11: Store in session (optional)
            try {
                session()->put($sessionKey, [
                    'system' => $system,
                    'role' => $activeRole,
                    'roles' => $roles,
                    'employee' => $employee,
                    'permissions' => $permissions,
                    'sidebar' => $navigation,
                ]);

            } catch (Throwable $e) {
            }
            //  \Log::info($user);
            return $user;
        } catch (AuthenticationException | InvalidArgumentException $e) {
            throw $e;
        } catch (Throwable $e) {
            throw new RuntimeException('Failed to retrieve authenticated user data: ' . $e->getMessage());
        }
    }
    /**
     * Validates cached session data for completeness and integrity.
     *
     * @param mixed $data The cached session data.
     * @return bool True if valid, false otherwise.
     */
    protected function isValidCachedData($data): bool
    {
        if (!is_array($data)) {
            return false;
        }
        $requiredKeys = ['system', 'connection', 'roles', 'employee', 'permissions', 'role'];
        foreach ($requiredKeys as $key) {
            if (!array_key_exists($key, $data)) {
                return false;
            }
        }
        // Validate critical fields
        if (!is_string($data['system']) || empty($data['system'])) {
            return false;
        }
        if (!$data['connection'] instanceof Connection) {
            return false;
        }
        if (!is_array($data['roles']) || empty($data['roles'])) {
            return false;
        }
        if (!is_array($data['permissions']) || !is_array($data['role_data'])) {
            return false;
        }
        if (!isset($data['role_data']['id'], $data['role_data']['name'])) {
            return false;
        }
        return true;
    }
    /**
     * Determines the user's system based on their role.
     * 
     *
     * @return string
     */
    public function getUserSystem(): string
    {
        try {
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                return 'business';
            }
            return CentralDB::table('systems')
                ->where('business_id', $user->business_id)
                ->value('system') ?? 'business';
        } catch (Exception $e) {
            Developer::error('Failed to determine user system', ['error' => $e->getMessage()]);
            return 'business';
        }
    }
    // ----------------------------------- Permissions-Related Functions -----------------------------------
    /**
     * Checks if a user has specific permission(s).
     *
     * @param string|array $permissions
     * @param User|null $user
     * @return bool
     */
    public function hasPermission($permissions, ?User $user = null): bool
    {
        try {
            $user = $this->getAuthenticatedUser($user);
            if (!$user) {
                return false;
            }
            $permissions = (array) $permissions;
            if (is_string($permissions[0])) {
                $permissions = array_map('trim', explode(',', str_replace(' ', '', implode(',', $permissions))));
            }
            $permissions = array_map(fn($p) => strtolower(str_replace(' ', '', $p)), $permissions);

            if (empty($permissions)) {
                return false;
            }
            $userPermissions = $user['permissions'] ?? [];
            $userPermissions = array_map(fn($p) => strtolower(str_replace(' ', '', $p)), $userPermissions);

            return !array_diff($permissions, $userPermissions);
        } catch (Exception) {
            return false;
        }
    }
    /**
     * Alias for hasPermission for Blade consistency.
     *
     * @param string|array $permissions
     * @param User|null $user
     * @return bool
     */
    public function can($permissions, ?User $user = null): bool
    {
        return $this->hasPermission($permissions, $user);
    }
    /**
     * Checks if a user has any of the specified permissions for resources.
     *
     * @param string|array $actions
     * @param string|array $resources
     * @param User|null $user
     * @return bool
     */
    public function hasAnyPermission($actions, $resources, ?User $user = null): bool
    {
        try {
            $user = $this->getAuthenticatedUser($user);
            if (!$user) {
                return false;
            }
            $actions = is_string($actions) ? array_map('trim', explode(',', $actions)) : (array) $actions;
            $resources = is_string($resources) ? array_map('trim', explode(',', $resources)) : (array) $resources;
            if (empty($actions) || empty($resources)) {
                return false;
            }
            $userPermissions = $user['permissions'] ?? [];
            foreach ($resources as $resource) {
                $formattedPermissions = array_map(fn($action) => trim($action) . ':' . $resource, $actions);
                if (!empty(array_intersect($formattedPermissions, $userPermissions))) {
                    return true;
                }
            }
            return false;
        } catch (Exception $e) {
            Developer::error('Any permission check failed', [
                'actions' => $actions,
                'resources' => $resources,
                'user_id' => $user?->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
    /**
     * Checks if a user has all specified permissions for resources.
     *
     * @param string|array $actions
     * @param string|array $resources
     * @param User|null $user
     * @return bool
     */
    public function hasAllPermissions($actions, $resources, ?User $user = null): bool
    {
        try {
            $user = $this->getAuthenticatedUser($user);
            if (!$user) {
                return false;
            }
            $actions = is_string($actions) ? array_map('trim', explode(',', $actions)) : (array) $actions;
            $resources = is_string($resources) ? array_map('trim', explode(',', $resources)) : (array) $resources;
            if (empty($actions) || empty($resources)) {
                return false;
            }
            $userPermissions = $user['permissions'] ?? [];
            foreach ($resources as $resource) {
                $formattedPermissions = array_map(fn($action) => trim($action) . ':' . $resource, $actions);
                if (empty(array_diff($formattedPermissions, $userPermissions))) {
                    return true;
                }
            }
            return false;
        } catch (Exception $e) {
            Developer::error('All permissions check failed', [
                'actions' => $actions,
                'resources' => $resources,
                'user_id' => $user?->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
    /**
     * Loads permissions in a grouped JSON structure.
     *
     * @param string $set Scope of permissions: 'all', 'self', 'all-<business_id>'
     * @param string|null $type Type of permissions: 'all', 'user', 'role', null
     * @param string|null $specific Type of ID: 'user-id', 'role-id', null
     * @param string|null $id User_id or role_id
     * @return array JSON-compatible array of grouped permissions
     * @throws InvalidArgumentException If parameters are invalid
     * @throws AuthenticationException If authentication is required
     * @throws RuntimeException If database queries fail
     */
    public function loadPermissions(string $set, ?string $type = null, ?string $specific = null, ?string $id = null): array
    {
        try {
            // Validate parameters
            $validTypes = ['all', 'user', 'role', null];
            $validSpecifics = ['user-id', 'role-id', null];
            if (!in_array($type, $validTypes)) {
                throw new InvalidArgumentException("Invalid type parameter. Must be one of: " . implode(', ', array_filter($validTypes)));
            }
            if (!in_array($specific, $validSpecifics)) {
                throw new InvalidArgumentException("Invalid specific parameter. Must be one of: " . implode(', ', array_filter($validSpecifics)));
            }
            if (($specific === null) !== ($id === null)) {
                throw new InvalidArgumentException("Specific and id must both be null or both provided.");
            }
            if ($id && empty(trim($id))) {
                throw new InvalidArgumentException("ID cannot be empty when provided.");
            }
            if ($set === 'self' && $type !== null && !$specific) {
                throw new InvalidArgumentException("Specific is required when type is provided for set 'self'.");
            }
            // Determine database connection and business_id
            $businessId = 'CENTRAL';
            $connection = null;
            $isBusinessSet = false;
            if ($set === 'all') {
                $connection = Database::getConnection('central');
            } elseif ($set === 'self') {
                $user = $this->getAuthenticatedUser();
                $businessId = $user->business_id ?? 'CENTRAL';
                $connection = Database::getConnection($businessId === 'CENTRAL' ? 'central' : 'business', $businessId);
            } elseif (strpos($set, 'all-') === 0) {
                $businessId = substr($set, 4);
                if (empty($businessId)) {
                    throw new InvalidArgumentException("Invalid business_id in set '$set'.");
                }
                $connection = Database::getConnection('business', $businessId);
                $isBusinessSet = true;
            } else {
                throw new InvalidArgumentException("Invalid set parameter. Must be 'all', 'self', or 'all-<business_id>'.");
            }
            // Verify connection
            if (!$connection->getPdo() || !$connection->getDatabaseName()) {
                throw new RuntimeException("Database connection not properly initialized for business_id: {$businessId}.");
            }
            // Initialize variables
            $authUser = $this->getAuthenticatedUser();
            $authUserId = $authUser->user_id;
            $targetId = $id ?? ($set === 'self' ? $authUserId : null);
            $checkType = $type ?? 'all';
            $checkTargetId = $targetId;
            // Step 1: Fetch permissions based on set
            $permissionDetails = [];
            $allPermissions = [];
            $userPermissions = [];
            $rolePermissions = [];
            $restrictedPermissions = [];
            if ($set === 'self') {
                // For self, fetch authenticated user's permissions
                $authUserPermissions = [];
                $authRolePermissions = [];
                $authRestrictedPermissions = [];
                // Fetch authenticated user's user permissions
                $authUserPermissionsData = $connection->table('user_permissions')
                    ->join('permissions', 'user_permissions.permission_id', '=', 'permissions.permission_id')
                    ->where('user_permissions.user_id', $authUserId)
                    ->where('permissions.is_approved', 1)
                    ->select('permissions.name', 'permissions.permission_id', 'permissions.is_skeleton', 'user_permissions.is_restricted')
                    ->get();
                foreach ($authUserPermissionsData as $perm) {
                    if (!is_string($perm->name)) {
                        continue;
                    }
                    $permName = trim($perm->name);
                    $permData = [
                        'is_skeleton' => $perm->is_skeleton,
                        'permission_id' => $perm->permission_id,
                        'type' => 'user',
                    ];
                    if ($perm->is_restricted) {
                        $authRestrictedPermissions[$permName] = $permData;
                    } else {
                        $authUserPermissions[$permName] = $permData;
                    }
                }
                // Fetch authenticated user's role permissions
                $authRoleQuery = $connection->table('role_permissions')
                    ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.permission_id')
                    ->join('user_roles', 'role_permissions.role_id', '=', 'user_roles.role_id')
                    ->where('user_roles.user_id', $authUserId)
                    ->where('role_permissions.is_active', 1)
                    ->where('user_roles.is_active', 1)
                    ->where('permissions.is_approved', 1)
                    ->select('permissions.name', 'permissions.permission_id', 'permissions.is_skeleton');
                $authRolePermissions = $authRoleQuery->get()
                    ->map(function ($perm) {
                        return [
                            'name' => is_string($perm->name) ? trim($perm->name) : null,
                            'permission_id' => $perm->permission_id,
                            'is_skeleton' => $perm->is_skeleton,
                            'type' => 'role',
                        ];
                    })
                    ->filter(fn($perm) => !is_null($perm['name']))
                    ->keyBy('name')
                    ->toArray();
                // Combine authenticated user's permissions
                $permissionDetails = array_merge($authRolePermissions, $authUserPermissions);
                $allPermissions = array_unique(array_merge(
                    array_keys($authRolePermissions),
                    array_keys($authUserPermissions)
                ));
                $allPermissions = array_diff($allPermissions, array_keys($authRestrictedPermissions));
                // If checking another user/role, fetch their permissions for check status
                if ($id && $id !== $authUserId) {
                    $userPermissions = [];
                    $rolePermissions = [];
                    $restrictedPermissions = [];
                    if (in_array($checkType, ['all', 'user'])) {
                        $userPermissionsData = $connection->table('user_permissions')
                            ->join('permissions', 'user_permissions.permission_id', '=', 'permissions.permission_id')
                            ->where('user_permissions.user_id', $checkTargetId)
                            ->where('permissions.is_approved', 1)
                            ->select('permissions.name', 'permissions.permission_id', 'permissions.is_skeleton', 'user_permissions.is_restricted')
                            ->get();
                        foreach ($userPermissionsData as $perm) {
                            if (!is_string($perm->name)) {
                                continue;
                            }
                            $permName = trim($perm->name);
                            $permData = [
                                'is_skeleton' => $perm->is_skeleton,
                                'permission_id' => $perm->permission_id,
                                'type' => 'user',
                            ];
                            if ($perm->is_restricted) {
                                $restrictedPermissions[$permName] = $permData;
                            } else {
                                $userPermissions[$permName] = $permData;
                            }
                        }
                    }
                    if (in_array($checkType, ['all', 'role'])) {
                        $roleQuery = $connection->table('role_permissions')
                            ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.permission_id')
                            ->where('role_permissions.is_active', 1)
                            ->where('permissions.is_approved', 1);
                        if ($specific === 'user-id') {
                            $roleQuery->join('user_roles', 'role_permissions.role_id', '=', 'user_roles.role_id')
                                ->where('user_roles.user_id', $checkTargetId)
                                ->where('user_roles.is_active', 1);
                        } elseif ($specific === 'role-id') {
                            $roleQuery->where('role_permissions.role_id', $checkTargetId);
                        }
                        $rolePermissions = $roleQuery->select('permissions.name', 'permissions.permission_id', 'permissions.is_skeleton')
                            ->get()
                            ->map(function ($perm) {
                                return [
                                    'name' => is_string($perm->name) ? trim($perm->name) : null,
                                    'permission_id' => $perm->permission_id,
                                    'is_skeleton' => $perm->is_skeleton,
                                    'type' => 'role',
                                ];
                            })
                            ->filter(fn($perm) => !is_null($perm['name']))
                            ->keyBy('name')
                            ->toArray();
                    }
                }
                // For type-specific checks, filter permissions
                if ($checkType === 'user') {
                    $allPermissions = array_keys($authUserPermissions);
                    $allPermissions = array_diff($allPermissions, array_keys($authRestrictedPermissions));
                } elseif ($checkType === 'role') {
                    $allPermissions = array_keys($authRolePermissions);
                }
                if (empty($allPermissions)) {
                    return [];
                }
            } else {
                // For all and all-<business_id>, fetch all permissions
                $permissionDetails = $connection->table('permissions')
                    ->where('is_approved', 1)
                    ->select('name', 'is_skeleton', 'permission_id')
                    ->get()
                    ->keyBy('name')
                    ->map(function ($perm) {
                        return [
                            'is_skeleton' => $perm->is_skeleton,
                            'permission_id' => $perm->permission_id,
                            'type' => 'business',
                        ];
                    })
                    ->toArray();
                $allPermissions = array_keys($permissionDetails);
                // Fetch assigned permissions if id is provided
                if ($id && $specific) {
                    if (in_array($checkType, ['all', 'user'])) {
                        $userPermissionsData = $connection->table('user_permissions')
                            ->join('permissions', 'user_permissions.permission_id', '=', 'permissions.permission_id')
                            ->where('user_permissions.user_id', $checkTargetId)
                            ->where('permissions.is_approved', 1)
                            ->select('permissions.name', 'permissions.permission_id', 'permissions.is_skeleton', 'user_permissions.is_restricted')
                            ->get();
                        foreach ($userPermissionsData as $perm) {
                            if (!is_string($perm->name)) {
                                continue;
                            }
                            $permName = trim($perm->name);
                            $permData = [
                                'is_skeleton' => $perm->is_skeleton,
                                'permission_id' => $perm->permission_id,
                                'type' => 'user',
                            ];
                            if ($perm->is_restricted) {
                                $restrictedPermissions[$permName] = $permData;
                            } else {
                                $userPermissions[$permName] = $permData;
                            }
                        }
                    }
                    if (in_array($checkType, ['all', 'role'])) {
                        $roleQuery = $connection->table('role_permissions')
                            ->join('permissions', 'role_permissions.permission_id', '=', 'permissions.permission_id')
                            ->where('role_permissions.is_active', 1)
                            ->where('permissions.is_approved', 1);
                        if ($specific === 'user-id') {
                            $roleQuery->join('user_roles', 'role_permissions.role_id', '=', 'user_roles.role_id')
                                ->where('user_roles.user_id', $checkTargetId)
                                ->where('user_roles.is_active', 1);
                        } elseif ($specific === 'role-id') {
                            $roleQuery->where('role_permissions.role_id', $checkTargetId);
                        }
                        $rolePermissions = $roleQuery->select('permissions.name', 'permissions.permission_id', 'permissions.is_skeleton')
                            ->get()
                            ->map(function ($perm) {
                                return [
                                    'name' => is_string($perm->name) ? trim($perm->name) : null,
                                    'permission_id' => $perm->permission_id,
                                    'is_skeleton' => $perm->is_skeleton,
                                    'type' => 'role',
                                ];
                            })
                            ->filter(fn($perm) => !is_null($perm['name']))
                            ->keyBy('name')
                            ->toArray();
                    }
                    // Update permission details with assigned permissions
                    $permissionDetails = array_merge($permissionDetails, $rolePermissions, $userPermissions);
                }
            }
            // Step 2: Parse and group permissions
            $grouped = [];
            $allActions = ['create', 'view', 'edit', 'delete', 'import', 'export', 'update'];
            foreach ($allPermissions as $permName) {
                if (!isset($permissionDetails[$permName]) || !is_string($permName)) {
                    continue;
                }
                $permId = $permissionDetails[$permName]['permission_id'];
                $isSkeleton = $permissionDetails[$permName]['is_skeleton'];
                $permType = $permissionDetails[$permName]['type'];
                // Split permission name into action and path
                $parts = explode(':', $permName, 2);
                if (count($parts) < 2) {
                    continue;
                }
                $action = trim($parts[0]);
                $pathString = trim($parts[1]);
                if (!in_array($action, $allActions)) {
                    continue;
                }
                // Split path into module, section, item
                $path = array_map('trim', explode('::', $pathString));
                $module = $path[0] ?? null;
                $section = $path[1] ?? null;
                $item = $path[2] ?? null;
                if (!$module) {
                    continue;
                }
                // Initialize module
                if (!isset($grouped[$module])) {
                    $grouped[$module] = ['permissions' => array_fill_keys($allActions, [])];
                }
                // Determine permission status
                $status = 0;
                if ($set === 'self') {
                    if ($id === null || $id === $authUserId) {
                        // For authenticated user or no id, check = 1 for assigned permissions
                        if ($checkType === 'user' && isset($authUserPermissions[$permName]) && !isset($authRestrictedPermissions[$permName])) {
                            $status = 1;
                        } elseif ($checkType === 'role' && isset($authRolePermissions[$permName])) {
                            $status = 1;
                        } elseif ($checkType === 'all' && (isset($authUserPermissions[$permName]) || isset($authRolePermissions[$permName])) && !isset($authRestrictedPermissions[$permName])) {
                            $status = 1;
                        }
                    } else {
                        // For other user/role, check target id's permissions
                        if ($checkType === 'user' && isset($userPermissions[$permName]) && !isset($restrictedPermissions[$permName])) {
                            $status = 1;
                        } elseif ($checkType === 'role' && isset($rolePermissions[$permName])) {
                            $status = 1;
                        } elseif ($checkType === 'all' && (isset($userPermissions[$permName]) || isset($rolePermissions[$permName])) && !isset($restrictedPermissions[$permName])) {
                            $status = 1;
                        }
                    }
                } else {
                    if ($id && $specific) {
                        if ($checkType === 'user' && isset($userPermissions[$permName]) && !isset($restrictedPermissions[$permName])) {
                            $status = 1;
                        } elseif ($checkType === 'role' && isset($rolePermissions[$permName])) {
                            $status = 1;
                        } elseif ($checkType === 'all' && (isset($userPermissions[$permName]) || isset($rolePermissions[$permName])) && !isset($restrictedPermissions[$permName])) {
                            $status = 1;
                        }
                    }
                }
                $permissionData = [
                    'check' => $status,
                    'is_skeleton' => $isSkeleton,
                    'type' => $permType,
                ];
                if (!$section) {
                    // Module-level permission
                    $grouped[$module]['permissions'][$action][$permId] = $permissionData;
                    continue;
                }
                // Initialize section
                if (!isset($grouped[$module][$section])) {
                    $grouped[$module][$section] = ['permissions' => array_fill_keys($allActions, [])];
                }
                if (!$item) {
                    // Section-level permission
                    $grouped[$module][$section]['permissions'][$action][$permId] = $permissionData;
                    continue;
                }
                // Initialize item
                if (!isset($grouped[$module][$section][$item])) {
                    $grouped[$module][$section][$item] = ['permissions' => array_fill_keys($allActions, [])];
                }
                // Item-level permission
                $grouped[$module][$section][$item]['permissions'][$action][$permId] = $permissionData;
            }
            // Step 3: Ensure all levels have permissions initialized
            foreach ($grouped as $module => &$moduleData) {
                if (!isset($moduleData['permissions'])) {
                    $moduleData['permissions'] = array_fill_keys($allActions, []);
                }
                foreach ($moduleData as $section => &$sectionData) {
                    if ($section === 'permissions') {
                        continue;
                    }
                    if (!isset($sectionData['permissions'])) {
                        $sectionData['permissions'] = array_fill_keys($allActions, []);
                    }
                    foreach ($sectionData as $item => &$itemData) {
                        if ($item === 'permissions') {
                            continue;
                        }
                        if (!isset($itemData['permissions'])) {
                            $itemData['permissions'] = array_fill_keys($allActions, []);
                        }
                    }
                }
            }
            return $grouped;
        } catch (AuthenticationException $e) {
            Developer::error('Authentication error in loadPermissions', [
                'set' => $set,
                'type' => $type,
                'specific' => $specific,
                'id' => $id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        } catch (Exception $e) {
            Developer::error('Failed to load permissions', [
                'set' => $set,
                'type' => $type,
                'specific' => $specific,
                'id' => $id,
                'error' => $e->getMessage(),
            ]);
            throw new RuntimeException("Failed to load permissions: " . $e->getMessage());
        }
    }
    /**
     * Creates or updates permissions for a user or role.
     *
     * @param string $type Type of permission: 'user' or 'role'
     * @param string $id User_id or role_id
     * @param array $permissions Array of permission_id values
     * @param string|null $business_id Business ID for database connection, null for self
     * @return bool True on success
     * @throws InvalidArgumentException If parameters are invalid
     * @throws AuthenticationException If authentication is required for self
     * @throws RuntimeException If database queries fail
     */
    public function managePermissions(string $type, string $id, array $permissions, ?string $business_id = null): bool
    {
        try {
            // Validate parameters
            if (!in_array($type, ['user', 'role'])) {
                throw new InvalidArgumentException("Invalid type parameter. Must be 'user' or 'role'.");
            }
            if (empty(trim($id))) {
                throw new InvalidArgumentException("ID cannot be empty.");
            }
            if (empty($permissions)) {
                throw new InvalidArgumentException("Permissions array cannot be empty.");
            }
            foreach ($permissions as $permId) {
                if (!is_string($permId) || empty(trim($permId))) {
                    throw new InvalidArgumentException("All permission IDs must be non-empty strings.");
                }
            }
            // Determine database connection
            $connection = null;
            if ($business_id !== null) {
                if (empty(trim($business_id))) {
                    throw new InvalidArgumentException("Business ID cannot be empty when provided.");
                }
                $connection = Database::getConnection('business', $business_id);
            } else {
                $user = $this->getAuthenticatedUser();
                $businessId = $user->business_id ?? 'CENTRAL';
                $connection = Database::getConnection($businessId === 'CENTRAL' ? 'central' : 'business', $businessId);
            }
            // Verify connection
            if (!$connection->getPdo() || !$connection->getDatabaseName()) {
                throw new RuntimeException("Database connection not properly initialized for business_id: " . ($business_id ?? 'self'));
            }
            // Validate permission IDs
            $validPermissionIds = $connection->table('permissions')
                ->whereIn('permission_id', $permissions)
                ->where('is_approved', 1)
                ->pluck('permission_id')
                ->toArray();
            $invalidPermissionIds = array_diff($permissions, $validPermissionIds);
            if (!empty($invalidPermissionIds)) {
                throw new InvalidArgumentException("Invalid permission IDs: " . implode(', ', $invalidPermissionIds));
            }
            // Begin transaction
            $connection->beginTransaction();
            // Determine table and key
            $table = $type === 'user' ? 'user_permissions' : 'role_permissions';
            $key = $type === 'user' ? 'user_id' : 'role_id';
            // Fetch existing permissions for the id
            $existingPermissions = $connection->table($table)
                ->where($key, $id)
                ->pluck('permission_id')
                ->toArray();
            // Permissions to activate
            $permissionsToActivate = array_intersect($permissions, $validPermissionIds);
            // Permissions to deactivate (existing but not in input)
            $permissionsToDeactivate = array_diff($existingPermissions, $permissions);
            // Update or insert permissions
            foreach ($permissionsToActivate as $permId) {
                $exists = in_array($permId, $existingPermissions);
                if ($exists) {
                    // Update existing permission
                    $connection->table($table)
                        ->where($key, $id)
                        ->where('permission_id', $permId)
                        ->update(['is_active' => 1]);
                } else {
                    // Insert new permission
                    $data = [
                        $key => $id,
                        'permission_id' => $permId,
                        'is_active' => 1,
                    ];
                    if ($type === 'user') {
                        $data['is_restricted'] = 0;
                    }
                    $connection->table($table)->insert($data);
                }
            }
            // Deactivate other permissions
            if (!empty($permissionsToDeactivate)) {
                $connection->table($table)
                    ->where($key, $id)
                    ->whereIn('permission_id', $permissionsToDeactivate)
                    ->update(['is_active' => 0]);
            }
            // Commit transaction
            $connection->commit();
            return true;
        } catch (Exception $e) {
            // Rollback transaction on error
            if (isset($connection) && $connection->getPdo()) {
                $connection->rollBack();
            }
            Developer::error('Failed to manage permissions', [
                'type' => $type,
                'id' => $id,
                'permissions' => $permissions,
                'business_id' => $business_id,
                'error' => $e->getMessage(),
            ]);
            throw new RuntimeException("Failed to manage permissions: " . $e->getMessage());
        }
    }
    /**
     * Checks if a user has a specific role.
     *
     * @param string $role
     * @param User|null $user
     * @return bool
     */
    public function hasRole(string $role, ?User $user = null): bool
    {
        try {
            $user = $this->getAuthenticatedUser($user);
            if (!$user) {
                return false;
            }
            return $user['role']['name'] === $role;
        } catch (Exception $e) {
            Developer::error('Role check failed', [
                'role' => $role,
                'user_id' => $user?->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
    // ----------------------------------- Token-Related Functions -----------------------------------
    /**
     * Initializes the skeleton token map for the user's system.
     *
     * @return array
     */
    public function init(): array
    {
        try {
            $user = $this->getAuthenticatedUser(null, true);
            $sessionKey = 'skeleton_tokens_for_' . $user->user_id;
            if (session()->has($sessionKey) && !empty(session($sessionKey))) {
                return $this->formatResponse(true, [], 'Token map already initialized.');
            }
            $system = $this->getUserSystem();
            $this->validateSystem($system);
            $tokens = $this->getSkeletonData()['tokens'];
            $map = [];
            $usedTokens = [];
            foreach ($tokens as $config) {
                if (isset($config['key']) && !collect($map)->contains('key', $config['key'])) {
                    $token = $this->generateUniqueToken($usedTokens);
                    $map[$token] = [
                        'key' => $config['key'],
                        'module' => $config['module'],
                        'system' => $config['system'],
                        'type' => $config['type'],
                        'table' => $config['table'],
                        'column' => $config['column'],
                        'value' => $config['value'],
                        'validate' => $config['validate'],
                        'act' => $config['act'],
                        'actions' => $config['actions'],
                    ];
                    $usedTokens[] = $token;
                }
            }
            $this->storeTokenMap($map, $user->user_id);
            return $this->formatResponse(true, [], 'Token map initialized successfully.');
        } catch (Exception $e) {
            Developer::error('Failed to initialize token map', [
                'system' => $system ?? null,
                'error' => $e->getMessage(),
            ]);
            return $this->formatResponse(false, [], 'Failed to initialize token map: ' . $e->getMessage());
        }
    }
    /**
     * Retrieves or generates a token for a configuration key.
     *
     * @param string $key
     * @return array
     */
    public function getTokenForKey(string $key): array
    {
        try {
            $this->validateKey($key);
            $user = $this->getAuthenticatedUser(null, true);
            $sessionKey = 'skeleton_tokens_for_' . $user->user_id;
            $map = session($sessionKey, []);
            $entry = collect($map)->firstWhere('key', $key);
            $token = $entry ? array_search($entry, $map, true) : null;
            if ($token) {
                return $this->formatResponse(true, ['token' => $token], 'Token retrieved successfully.');
            }
            return $this->generateNewTokenForToken($key);
        } catch (Exception $e) {
            Developer::error('Failed to retrieve token', [
                'key' => $key,
                'error' => $e->getMessage(),
            ]);
            return $this->formatResponse(false, [], 'Failed to retrieve token: ' . $e->getMessage());
        }
    }
    /**
     * Retrieves an existing token for a configuration key.
     *
     * @param string $key
     * @return string
     */
    public function skeletonToken(string $key): string
    {
        try {
            $this->validateKey($key);
            $user = $this->getAuthenticatedUser(null, true);
            $map = session('skeleton_tokens_for_' . $user->user_id, []);
            $entry = collect($map)->firstWhere('key', $key);
            if (!$entry) {
                throw new Exception('No token found for key: ' . $key);
            }
            $token = $entry ? array_search($entry, $map, true) : null;
            return $token;
        } catch (Exception $e) {
            Developer::error('Failed to retrieve token', [
                'error' => $e->getMessage(),
                'key' => $key,
                'trace' => $e->getTraceAsString(),
            ]);
            return '';
        }
    }
    /**
     * Generates a new token for a configuration key.
     *
     * @param string $key
     * @return array
     */
    public function generateNewTokenForToken(string $key): array
    {
        try {
            $this->validateKey($key);
            $user = $this->getAuthenticatedUser(null, true);
            // Retrieve token configuration
            $config = collect($this->getTokens());
            if ($config->isEmpty()) {
                Developer::info('Configuration not found for key and system.', [
                    'user_id' => $user?->user_id,
                    'key' => $key,
                ]);
                return $this->formatResponse(false, [], 'Configuration not found for key and system.');
            }
            $sessionKey = 'skeleton_tokens_for_' . $user->user_id;
            $map = session($sessionKey, []);
            $token = $this->generateUniqueToken(array_keys($map));
            $map[$token] = [
                'key'      => $config->get('key'),
                'module'   => $config->get('module'),
                'system'   => $config->get('system'),
                'type'     => $config->get('type'),
                'table'    => $config->get('table'),
                'column'   => $config->get('column'),
                'value'    => $config->get('value'),
                'validate' => $config->get('validate'),
                'act'      => $config->get('act'),
                'actions'  => $config->get('actions'),
            ];
            $this->storeTokenMap($map, $user->user_id);
            return $this->formatResponse(true, ['token' => $token], 'New token generated successfully.');
        } catch (Exception $e) {
            Developer::error('Failed to generate token', [
                'key' => $key,
                'error' => $e->getMessage(),
            ]);
            return $this->formatResponse(false, [], 'Failed to generate token: ' . $e->getMessage());
        }
    }
    /**
     * Regenerates a token for a configuration key.
     *
     * @param string $key
     * @return array
     */
    public function regenerate(string $key): array
    {
        try {
            $this->validateKey($key);
            $user = $this->getAuthenticatedUser(null, true);
            $config = collect($this->getSkeletonData()['tokens'])->firstWhere('key', $key);
            if (!$config) {
                return $this->formatResponse(false, [], 'Configuration not found for key and system.');
            }
            $sessionKey = 'skeleton_tokens_for_' . $user->user_id;
            $map = session($sessionKey, []);
            $entry = collect($map)->firstWhere('key', $key);
            if ($entry) {
                unset($map[array_search($entry, $map, true)]);
            }
            $token = $this->generateUniqueToken(array_keys($map));
            $map[$token] = [
                'key' => $config['key'],
                'module' => $config['module'],
                'system' => $config['system'],
                'type' => $config['type'],
                'table' => $config['table'],
                'column' => $config['column'],
                'value' => $config['value'],
                'validate' => $config['validate'],
                'act' => $config['act'],
                'actions' => $config['actions'],
            ];
            $this->storeTokenMap($map, $user->user_id);
            return $this->formatResponse(true, ['token' => $token], 'Token regenerated successfully.');
        } catch (Exception $e) {
            Developer::error('Failed to regenerate token', [
                'key' => $key,
                'error' => $e->getMessage(),
            ]);
            return $this->formatResponse(false, [], 'Failed to regenerate token: ' . $e->getMessage());
        }
    }
    /**
     * Resolves a generated token to its configuration data.
     *
     * @param string $generatedToken
     * @return array
     */
    public function resolveToken(string $generatedToken): array
    {
        try {
            $tokenLength = Config::get('skeleton.token_length', 27);
            $token = substr($generatedToken, 0, $tokenLength);
            if (strlen($token) !== $tokenLength) {
                throw new InvalidArgumentException("Token must be exactly {$tokenLength} characters.");
            }
            $user = $this->getAuthenticatedUser(null, true);
            $map = session('skeleton_tokens_for_' . $user->user_id, []);
            $config = $map[$token] ?? null;
            if (!$config) {
                return $this->formatResponse(false, [], 'No configuration found for token.');
            }
            $config['token'] = $token;
            $tokenParts = explode('_', $generatedToken);
            if (count($tokenParts) >= 5) {
                $config['for'] = $tokenParts[4];
                if (count($tokenParts) >= 6) {
                    $config['id'] = $tokenParts[5];
                    if (count($tokenParts) > 6) {
                        $config['param'] = implode('_', array_slice($tokenParts, 6));
                    }
                }
            }
            return $config ?? [];
        } catch (Exception $e) {
            Developer::error('Failed to resolve token', [
                'token' => $generatedToken,
                'error' => $e->getMessage(),
            ]);
            return $this->formatResponse(false, [], 'Failed to resolve token: ' . $e->getMessage());
        }
    }
    /**
     * Generates a unique token with exactly three underscores and a wrapped character.
     *
     * @param array $usedTokens
     * @return string
     * @throws InvalidArgumentException|RuntimeException
     */
    protected function generateUniqueToken(array $usedTokens): string
    {
        $maxAttempts = Config::get('skeleton.max_token_attempts', 15);
        $tokenLength = Config::get('skeleton.token_length', 27);
        $allowedWrappedChars = ['v', 'e', 'd', 'a'];
        if ($tokenLength < 4) {
            throw new InvalidArgumentException('Token length must be at least 4 for three underscores.');
        }
        if ($maxAttempts < 1) {
            throw new InvalidArgumentException('Max token attempts must be at least 1.');
        }
        $attempt = 0;
        do {
            if ($attempt++ >= $maxAttempts) {
                throw new RuntimeException("Unable to generate unique token after {$maxAttempts} attempts.");
            }
            $baseLength = $tokenLength - 4;
            $token = Str::random($baseLength);
            $tokenArray = str_split($token);
            // Insert _X_ (two underscores and one wrapped character)
            $wrappedChar = $allowedWrappedChars[array_rand($allowedWrappedChars)];
            $insertPos = random_int(0, max(0, count($tokenArray) - 1));
            array_splice($tokenArray, $insertPos, 0, ['_', $wrappedChar, '_']);
            // Insert third underscore at a distinct position
            $availablePositions = array_keys($tokenArray);
            $thirdUnderscorePos = $availablePositions[array_rand($availablePositions)];
            while (in_array($thirdUnderscorePos, [$insertPos, $insertPos + 1, $insertPos + 2])) {
                $thirdUnderscorePos = $availablePositions[array_rand($availablePositions)];
            }
            array_splice($tokenArray, $thirdUnderscorePos, 0, '_');
            $token = implode('', $tokenArray);
            // Adjust length while preserving three underscores
            if (strlen($token) > $tokenLength) {
                $underscorePositions = [];
                $count = 0;
                foreach (str_split($token) as $i => $char) {
                    if ($char === '_' && $count < 3) {
                        $underscorePositions[] = $i;
                        $count++;
                    }
                }
                $newToken = '';
                $currentLength = 0;
                $underscoresAdded = 0;
                foreach (str_split($token) as $i => $char) {
                    if ($currentLength >= $tokenLength) {
                        break;
                    }
                    if ($char === '_' && !in_array($i, $underscorePositions, true) && $underscoresAdded >= 3) {
                        continue;
                    }
                    if ($char === '_') {
                        $underscoresAdded++;
                    }
                    $newToken .= $char;
                    $currentLength++;
                }
                $token = $newToken;
            }
            if (strlen($token) < $tokenLength) {
                $token .= Str::random($tokenLength - strlen($token));
            }
        } while (in_array($token, $usedTokens, true) || substr_count($token, '_') !== 3);
        return $token;
    }
    /**
     * Stores the token map in session.
     *
     * @param array $map
     * @param string $user_id
     * @return void
     */
    protected function storeTokenMap(array $map, string $user_id): void
    {
        try {
            session()->put('skeleton_tokens_for_' . $user_id, $map);
        } catch (Exception $e) {
            Developer::error('Failed to store token map', ['error' => $e->getMessage()]);
        }
    }
    // ----------------------------------- Cache-Related Functions -----------------------------------
    /**
     * Generates a cache or session key for a user-specific resource.
     *
     * @param string $type
     * @param User|null $user
     * @return string
     * @throws AuthenticationException
     */
    protected function generateKey(string $type, ?User $user = null): string
    {
        $user = $this->getAuthenticatedUser($user, true);
        return "{$type}_{$user->user_id}_{$user->business_id}";
    }
    /**
     * Invalidates user-specific cache and session data.
     *
     * @return void
     */
    public function clearUserCache(): void
    {
        try {
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                Developer::warning('clearUserCache called with no authenticated user');
                return;
            }
            $userId = $user->user_id;
            $businessId = $user->business_id ?? 'unknown';
            $cacheKey = "navigation_data_" . $user->user_id;
            $navToken = session('nav_token');
            Cache::forget($cacheKey);
            if ($navToken) {
                Cache::forget("nav_{$navToken}");
            }
            session()->forget("skeleton_tokens_for_{$user->user_id}");
            session()->forget("auth_user_data_{$user->user_id}");
            session()->forget("user_role_{$user->user_id}");
            Developer::notice('User cache invalidated', compact('userId', 'businessId'));
        } catch (\Throwable $e) {
            Developer::error('Failed to invalidate user cache', [
                'user_id' => $user->user_id ?? 'unknown',
                'business_id' => $user->business_id ?? 'unknown',
                'error' => $e->getMessage(),
            ]);
        }
    }
    /**
     * Reloads all skeleton-related sessions, caches, and data for a user.
     *
     * @param User|null $user
     * @return array
     */
    public function reloadSkeleton(?User $user = null): array
    {
        try {
            // Step 1: Get authenticated user
            $user = $this->getAuthenticatedUser($user);
            $userId = $user?->id ?? 'guest';
            // Step 2: Clear user-specific cache
            if ($user) {
                $this->clearUserCache();
                foreach (Config::get('skeleton.allowed_systems', ['central', 'business']) as $system) {
                    $cacheKeys = [
                        "skeleton_global_data",
                        "skeleton_tokens_for_{$userId}",
                    ];
                    foreach ($cacheKeys as $key) {
                        Cache::forget($key);
                    }
                }
            }
            // Step 3: Reinitialize token map
            $initResult = $this->init();
            if (!$initResult['status']) {
                throw new RuntimeException('Failed to reinitialize token map: ' . $initResult['message']);
            }
            // Step 4: Refresh skeleton data
            $skeletonData = $this->getSkeletonData();
            if (empty($skeletonData)) {
                throw new RuntimeException('Failed to refresh skeleton data.');
            }
            // Step 5: Refresh user data if needed
            if ($user) {
                $userRefreshed = $this->getAuthenticatedUser($user, false, null, true);
                if (empty($userRefreshed)) {
                    throw new RuntimeException('Failed to refresh user data.');
                }
            }
            if (empty($navData) && $user) {
                throw new RuntimeException('Failed to refresh navigation data.');
            }
            return $this->formatResponse(true, [], 'Skeleton data, caches, and sessions reloaded successfully.');
        } catch (\Throwable $e) {
            return $this->formatResponse(false, [], 'Failed to reload skeleton: ' . $e->getMessage());
        }
    }
    // ----------------------------------- Skeleton Global Functions -----------------------------------
    /**
     * Fetches or builds cached global skeleton data.
     *
     * @return array
     */
    public function getSkeletonData(): array
    {
        return Cache::remember('skeleton_global_data', now()->addHours(5), function () {
            $data = ['modules' => [], 'sections' => [], 'items' => [], 'tokens' => []];
            try {
                CentralDB::table('skeleton_modules as m')
                    ->leftJoin('skeleton_sections as s', function ($join) {
                        $join->on('m.module_id', '=', 's.module_id')
                            ->where('s.is_approved', 1)
                            ->whereNull('s.deleted_at');
                    })
                    ->leftJoin('skeleton_items as i', function ($join) {
                        $join->on('s.section_id', '=', 'i.section_id')
                            ->where('i.is_approved', 1)
                            ->whereNull('i.deleted_at');
                    })
                    ->where('m.is_approved', 1)
                    ->whereNull('m.deleted_at')
                    ->select([
                        'm.module_id',
                        'm.name as module_name',
                        'm.icon as module_icon',
                        'm.order as module_order',
                        'm.is_navigable as module_navigable',
                        's.section_id',
                        's.name as section_name',
                        's.icon as section_icon',
                        's.order as section_order',
                        's.is_navigable as section_navigable',
                        'i.item_id',
                        'i.name as item_name',
                        'i.icon as item_icon',
                        'i.order as item_order',
                        'i.is_navigable as item_navigable',
                    ])
                    ->orderByRaw('COALESCE(m.order, 999999) ASC')
                    ->orderByRaw('COALESCE(s.order, 999999) ASC')
                    ->orderByRaw('COALESCE(i.order, 999999) ASC')
                    ->orderBy('m.order', 'asc')
                    ->orderBy('s.order', 'asc')
                    ->orderBy('i.order', 'asc')
                    ->chunk(100, function ($rows) use (&$data) {
                        $modules = [];
                        $sections = [];
                        $items = [];
                        foreach ($rows as $row) {
                            if (!isset($modules[$row->module_id])) {
                                $modules[$row->module_id] = [
                                    'module_id' => $row->module_id,
                                    'name' => trim($row->module_name),
                                    'icon' => trim($row->module_icon ?? ''),
                                    'order' => $row->module_order,
                                    'navigable' => $row->module_navigable,
                                ];
                            }
                            if ($row->section_id) {
                                if (!isset($sections[$row->section_id])) {
                                    $sections[$row->section_id] = [
                                        'section_id' => $row->section_id,
                                        'module_id' => $row->module_id,
                                        'name' => trim($row->section_name),
                                        'icon' => trim($row->section_icon ?? ''),
                                        'order' => $row->section_order,
                                        'navigable' => $row->section_navigable,
                                    ];
                                }
                                if ($row->item_id) {
                                    $items[] = [
                                        'item_id' => $row->item_id,
                                        'section_id' => $row->section_id,
                                        'name' => trim($row->item_name),
                                        'icon' => trim($row->item_icon ?? ''),
                                        'order' => $row->item_order,
                                        'navigable' => $row->item_navigable,
                                    ];
                                }
                            }
                        }
                        $data['modules'] = array_values($modules);
                        $data['sections'] = array_values($sections);
                        $data['items'] = $items;
                    });
                CentralDB::table('skeleton_tokens')
                    ->whereNull('deleted_at')
                    ->orderBy('id', 'asc')
                    ->select(['key', 'module', 'system', 'type', 'table', 'column', 'value', 'validate', 'act', 'actions'])
                    ->chunk(100, function ($tokens) use (&$data) {
                        $data['tokens'] = array_merge($data['tokens'], array_map(
                            fn($token) => array_map(
                                fn($value) => is_string($value) ? trim($value) : $value,
                                (array) $token
                            ),
                            $tokens->toArray()
                        ));
                    });
                return $data;
            } catch (Exception $e) {
                Developer::error('Failed to retrieve skeleton data', ['error' => $e->getMessage()]);
                return [];
            }
        });
    }
    /**
     * Retrieves cached skeleton modules.
     *
     * @return array
     */
    public function getModules(): array
    {
        return $this->getSkeletonData()['modules'] ?? [];
    }
    /**
     * Retrieves cached skeleton sections.
     *
     * @return array
     */
    public function getSections(): array
    {
        return $this->getSkeletonData()['sections'] ?? [];
    }
    /**
     * Retrieves cached skeleton items.
     *
     * @return array
     */
    public function getItems(): array
    {
        return $this->getSkeletonData()['items'] ?? [];
    }
    /**
     * Retrieves cached skeleton tokens.
     *
     * @return array
     */
    public function getTokens(): array
    {
        return $this->getSkeletonData()['tokens'] ?? [];
    }
    /**
     * Retrieves cached skeleton routes.
     *
     * @return array
     */
    public function getRoutes(): array
    {
        $modules = $this->getModules();
        $sections = $this->getSections();
        $items = $this->getItems();
        $routes = [];
        foreach ($modules as $module) {
            $moduleSlug = strtolower(str_replace(' ', '-', trim($module['name'])));
            $routes[] = $moduleSlug;
            foreach ($sections as $section) {
                $sectionSlug = strtolower(str_replace(' ', '-', trim($section['name'])));
                $sectionPath = "{$moduleSlug}/{$sectionSlug}";
                $routes[] = $sectionPath;
                foreach ($items as $item) {
                    $itemSlug = strtolower(str_replace(' ', '-', trim($item['name'])));
                    $itemPath = "{$sectionPath}/{$itemSlug}";
                    $routes[] = $itemPath;
                }
            }
        }
        return $routes;
    }
    // ----------------------------------- Utility Functions -----------------------------------
    /**
     * Formats a standardized JSON response.
     *
     * @param bool $status
     * @param array $data
     * @param string $message
     * @return array
     */
    public function formatResponse(bool $status, array $data, string $message): array
    {
        return compact('status', 'data', 'message');
    }
    /**
     * Validates a configuration key.
     *
     * @param string $key
     * @throws InvalidArgumentException
     */
    protected function validateKey(string $key): void
    {
        if (empty($key) || !preg_match('/^[a-zA-Z0-9_-]+$/', $key)) {
            throw new InvalidArgumentException('Invalid configuration key.');
        }
    }
    /**
     * Validates a system identifier.
     *
     * @param string $system
     * @throws InvalidArgumentException
     */
    protected function validateSystem(string $system): void
    {
        $allowedSystems = Config::get('skeleton.allowed_systems', ['central', 'business', 'open']);
        if (!in_array($system, $allowedSystems)) {
            throw new InvalidArgumentException('Invalid system provided.');
        }
    }
    /**
     * Gets the database connection for the specified system.
     *
     * @param string $system
     * @param string|null $businessId
     * @return Connection
     */
    protected function getConnection(string $system, ?string $businessId = null): Connection
    {
        if ($system === 'central') {
            return CentralDB::getFacadeRoot();
        }
        if ($businessId) {
            $connectionName = Database::setupBusinessConnection($businessId);
        }
        return BusinessDB::getFacadeRoot();
    }
}
