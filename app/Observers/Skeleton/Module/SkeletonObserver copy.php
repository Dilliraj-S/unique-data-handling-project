<?php

namespace App\Observers\Skeleton\Module;

use App\Facades\{CentralDB, Developer, Skeleton, Data};
use App\Http\Helpers\RandomHelper; 
use Illuminate\Support\Facades\{Cache, Config, File,Auth};

/**
 * Observer class for managing skeleton-related cache and permissions.
 */
class SkeletonObserver
{
    public static function manageSkeletonAction(string $system, string $table, string $operation, array $condition, array $preVal): void
    {
        try {
            if (!$system || !$table || !$operation) {
                return;
            }
            if ($table === 'skeleton_tokens' && Config::get('skeleton.token_reload')) {
                Cache::forget('skeleton_tokens_data');
                session()->forget('skeleton_token_map');
                Developer::info('Cleared skeleton_tokens cache and session', compact('table', 'system'));
            }
            if ($operation === 'create' && in_array($table, ['skeleton_modules', 'skeleton_sections', 'skeleton_items'])) {
                $permissions = self::generatePermissions($table, $condition);
                if ($permissions) {
                    self::storePermissions($system, $table, $permissions);
                    Developer::info("Permissions created for {$table}", compact('table', 'permissions', 'system'));
                }
                if($table === 'skeleton_modules'){
                    $module = CentralDB::table('skeleton_modules')->where('id',$condition[0])->first();
                    if ($module && $module->name) {
                        Developer::error($module->name);
                        self::generateController($module->system, $module->name);
                    }
                }
            }
            if (($operation === 'update' || $operation === 'delete') && in_array($table, ['skeleton_modules', 'skeleton_sections', 'skeleton_items'])) {
                self::updateOrdeletePermissions($system, $table, $condition, $preVal, $operation);
            } 
            Skeleton::clearSkeletonCache();
            Skeleton::clearUserCache(Skeleton::getAuthenticatedUser()->id, Skeleton::getAuthenticatedUser()->business_id);
            Skeleton::reloadSkeleton(); 
        } catch (\Exception $e) {
            Developer::error('Failed to process skeleton action', [
                'table' => $table,
                'system' => $system,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private static function generatePermissions(string $table, array $condition): array
    {
        $actions = ['create', 'edit', 'delete', 'view', 'import', 'export'];
        $permissions = [];

        $queries = [
            'skeleton_modules' => [
                'select' => ['m.name as module_name'],
                'table' => 'skeleton_modules as m',
                'where' => ['m.id' => $condition[0]],
            ],
            'skeleton_sections' => [
                'select' => ['m.name as module_name', 's.name as section_name'],
                'table' => 'skeleton_modules as m',
                'join' => [['skeleton_sections as s', 's.module_id', '=', 'm.module_id']],
                'where' => ['s.id' => $condition[0]],
            ],
            'skeleton_items' => [
                'select' => ['m.name as module_name', 's.name as section_name', 'i.name as item_name'],
                'table' => 'skeleton_modules as m',
                'join' => [
                    ['skeleton_sections as s', 's.module_id', '=', 'm.module_id'],
                    ['skeleton_items as i', 'i.section_id', '=', 's.section_id'],
                ],
                'where' => ['i.id' => $condition[0]],
            ],
        ];

        if (!isset($queries[$table])) {
            return [];
        }

        $query = CentralDB::table($queries[$table]['table'])
            ->select($queries[$table]['select'])
            ->whereNull('m.deleted_at');

        if (!empty($queries[$table]['join'])) {
            foreach ($queries[$table]['join'] as $join) {
                $alias = explode(' ', $join[0])[2] ?? explode(' ', $join[0])[0];
                $query->join($join[0], $join[1], $join[2], $join[3]);
                $query->whereNull("{$alias}.deleted_at");
            }
        }

        $data = $query->where($queries[$table]['where'])->first();

        if (!$data) {
            return [];
        }

        switch ($table) {
            case 'skeleton_modules':
                $module = trim($data->module_name);
                foreach ($actions as $action) {
                    $permissions[] = "{$action}:{$module}";
                }
                break;
            case 'skeleton_sections':
                $module = trim($data->module_name);
                $section = trim($data->section_name);
                foreach ($actions as $action) {
                    $permissions[] = "{$action}:{$module}::{$section}";
                }
                break;
            case 'skeleton_items':
                $module = trim($data->module_name);
                $section = trim($data->section_name);
                $item = trim($data->item_name);
                foreach ($actions as $action) {
                    $permissions[] = "{$action}:{$module}::{$section}::{$item}";
                }
                break;
        }

        return $permissions;
    }

    private static function storePermissions(string $system, string $table, array $permissions): void
    {
        $userId = Skeleton::getAuthenticatedUser()->user_id;
        $timestamp = now();

        foreach ($permissions as $permission) {
            Data::create($system, 'permissions', [
                'permission_id'=>RandomHelper::generateUniqueId(3),
                'name' => $permission,
                'created_by' => $userId,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);
        }
    }

    private static function updateOrdeletePermissions(string $system, string $table, array $condition, array $preVal, string $operation): void
    {
        Developer::info("Start permission {$operation}");

        $preValue = $preVal[0]->name ?? null;
        if (!$preValue) return;

        $newValue = null;
        if ($operation === 'update') {
            $newRecord = CentralDB::table($table)->where('id', $condition['id'])->first();
            $newValue = $newRecord->name ?? null;
            if (!$newValue || $newValue === $preValue) return;
        }

        $baseQuery = CentralDB::table('permissions')->where(function ($query) use ($table, $preValue) {
            switch ($table) {
                case 'skeleton_modules':
                    $query->whereRaw(
                        "SUBSTRING_INDEX(REPLACE(name, CONCAT(SUBSTRING_INDEX(name, ':', 1), ':'), ''), '::', 1) = ?",
                        [$preValue]
                    );
                    break;

                case 'skeleton_sections':
                    $query->whereRaw(
                        "SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(name, CONCAT(SUBSTRING_INDEX(name, ':', 1), ':'), ''), '::', 2), '::', -1) = ?",
                        [$preValue]
                    );
                    break;

                case 'skeleton_items':
                    $query->whereRaw(
                        "SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(name, CONCAT(SUBSTRING_INDEX(name, ':', 1), ':'), ''), '::', 3), '::', -1) = ?",
                        [$preValue]
                    );
                    break;
            }
        });

        $records = $baseQuery->get();

        if ($operation === 'delete') {
            Developer::info("Comming TO Delete");
            $idsToDelete = $records->pluck('id')->toArray();
            if (!empty($idsToDelete)) {
                CentralDB::table('permissions')->whereIn('id', $idsToDelete)->delete();
                Developer::info("Deleted permissions for {$table}", compact('table', 'system', 'preValue', 'condition'));
            }
            return;
        }

        // Update operation
        foreach ($records as $record) {
            $oldName = $record->name;
            $action = substr($oldName, 0, strpos($oldName, ':'));
            $newName = '';
            switch ($table) {
                case 'skeleton_modules':
                    $rest = preg_replace("/^{$action}:[^:]+/", "{$action}:{$newValue}", $oldName);
                    $newName = $rest;
                    break;

                case 'skeleton_sections':
                    $parts = explode('::', preg_replace("/^{$action}:/", '', $oldName));
                    if (count($parts) >= 2) {
                        $newName = "{$action}:{$parts[0]}::{$newValue}";
                        if (isset($parts[2])) {
                            $newName .= "::{$parts[2]}";
                        }
                    }
                    break;

                case 'skeleton_items':
                    $parts = explode('::', preg_replace("/^{$action}:/", '', $oldName));
                    if (count($parts) >= 3) {
                        $newName = "{$action}:{$parts[0]}::{$parts[1]}::{$newValue}";
                    }
                    break;
            }

            if (!empty($newName)) {
                CentralDB::table('permissions')->where('id', $record->id)->update(['name' => $newName]);
            }
        }

        Developer::info("Updated permissions for {$table}", compact('table', 'system', 'preValue', 'newValue', 'condition'));
    }

    private static function generateController(string $system, string $moduleName): void
    {
        try {
            $basePath = app_path("Http/Controllers/System/" . ucfirst($system) . "/" . $moduleName);

            if (!File::exists($basePath)) {
                File::makeDirectory($basePath, 0755, true);
            }

            $classMap = [
                'NavCtrl.php' => self::navCtrlTemplate($system, $moduleName),
                'TableCtrl.php' => self::tableCtrlTemplate($system, $moduleName),
                'CardCtrl.php' => self::cardCtrlTemplate($system, $moduleName),
                'FormCtrl.php' => self::formCtrlTemplate($system, $moduleName),
                'ShowAddCtrl.php' =>self::showAddCtrlTemplate($system, $moduleName),
                'SaveAddCtrl.php' => self::saveAddCtrlTemplate($system, $moduleName),
                'ShowEditCtrl.php' => self::showEditCtrlTemplate($system, $moduleName),
                'SaveEditCtrl.php' => self::saveEditCtrlTemplate($system, $moduleName),
                'ViewCtrl.php' => self::viewCtrlTemplate($system, $moduleName),
            ];
            foreach ($classMap as $fileName => $content) {
                $filePath = "{$basePath}/{$fileName}";
                File::put($filePath, $content);
            }

            Developer::info('Controller files created', [
                'module' => $moduleName,
                'system' => $system,
            ]);
        } catch (\Exception $e) {
            Developer::error('Failed to create controller files', [
                'system' => $system,
                'module' => $moduleName,
                'error' => $e->getMessage(),
            ]);
        }
    }
    private static function fetchCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        return <<<PHP
            <?php
            namespace App\Http\Controllers\System\\$systemCapitalized\\$moduleName;

            use App\Facades\{Data, Developer, Skeleton};
            use App\Http\Controllers\Controller;
            use App\Http\Helpers\DataHelper;
            use Exception;
            use Illuminate\Http\{JsonResponse, Request};
            use Illuminate\Support\Facades\Config;

            /**
             * Controller for handling data requests for table, grid, and list views.
             */
            class FetchCtrl extends Controller
            {
                /**
                 * Handles AJAX requests for data processing based on view type.
                 *
                 * @param Request \$request HTTP request object
                 * @param array \$params Route parameters (module, section, item, token)
                 * @return JsonResponse Data response or error message
                 */
                public function index(Request \$request, array \$params): JsonResponse
                {
                    try {
                        // Extract and validate token
                        \$token = \$params['token'] ?? \$request->input('skeleton_token');
                        if (empty(\$token)) {
                            Developer::warning('FetchCtrl: No token provided', ['params' => \$params, 'request' => \$request->input()]);
                            return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
                        }

                        // Resolve token and validate configuration
                        \$reqSet = Skeleton::resolveToken(\$token);
                        if (!isset(\$reqSet['key']) || !isset(\$reqSet['table'])) {
                            Developer::warning('FetchCtrl: Invalid token configuration', ['token' => \$token, 'reqSet' => \$reqSet]);
                            return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid or lacks required configuration.']);
                        }

                        // Validate view type and filters
                        \$filters = \$request->input('skeleton_filters', []);
                        \$reqSet['view'] = \$request->input('skeleton_view', 'table');
                        \$reqSet['draw'] = (int) \$request->input('draw', 1);
                        \$reqSet['filters'] = [
                            'search'     => \$filters['search'] ?? [],
                            'dateRange'  => \$filters['dateRange'] ?? [],
                            'columns'    => \$filters['columns'] ?? [],
                            'sort'       => \$filters['sort'] ?? [],
                            'pagination' => \$filters['pagination'] ?? ['page' => 1, 'limit' => 10],
                        ];

                        if (!in_array(\$reqSet['view'], ['table', 'grid', 'list'])) {
                            Developer::warning('FetchCtrl: Invalid view type', ['view_type' => \$reqSet['view'], 'token' => \$token]);
                            return response()->json(['status' => false, 'title' => 'Invalid View Type', 'message' => 'The specified view type is not supported.']);
                        }

                        if (!is_array(\$reqSet['filters'])) {
                            Developer::warning('FetchCtrl: Invalid filters format', ['filters' => \$reqSet['filters'], 'token' => \$token]);
                            return response()->json(['status' => false, 'title' => 'Invalid Filters', 'message' => 'The filters format is invalid.']);
                        }

                        // Configure columns, joins, conditions, and customizations
                        \$columns = \$conditions = \$joins = \$custom = [];
                        switch (\$reqSet['key']) {
                            case 'example_entity':
                                \$columns = [
                                    'id' => ['entities.id', true],
                                    'name' => ['entities.name', true],
                                    'type' => ['entities.type', true],
                                    'status' => ['entities.status', true],
                                    'created_at' => ['entities.created_at', true],
                                    'updated_at' => ['entities.updated_at', true],
                                ];
                                \$conditions = [
                                    ['column' => 'entities.is_active', 'operator' => '=', 'value' => 1],
                                    ['column' => 'entities.system', 'operator' => '=', 'value' => '$system'],
                                ];
                                \$custom = [
                                    [
                                        'type' => 'modify',
                                        'column' => 'status',
                                        'view' => '::(status = 1 ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::',
                                        'renderHtml' => true
                                    ]
                                ];
                                break;
                            default:
                                Developer::warning('FetchCtrl: Unknown configuration key', ['key' => \$reqSet['key'], 'token' => \$token]);
                                return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
                        }

                        // Fetch data using Data facade with joins and filters
                        \$params = DataHelper::generateParams(\$columns, \$joins, \$conditions, \$reqSet);
                        \$result = Data::filter('central', \$reqSet['table'], \$params);

                        // Check if data retrieval was successful
                        if (!\$result['status']) {
                            Developer::warning('FetchCtrl: Data fetch failed', ['message' => \$result['message'], 'token' => \$token]);
                            return response()->json([
                                'status' => false,
                                'title' => 'Data Fetch Failed',
                                'message' => \$result['message']
                            ]);
                        }

                        // Generate response using DataHelper
                        \$response = DataHelper::generateResponse(\$result['data'], \$columns, \$custom, \$reqSet);

                        return response()->json([
                            'status' => true,
                            'draw' => \$result['draw'],
                            'data' => \$response['data'],
                            'columns' => \$response['columns'] ?? [],
                            'recordsTotal' => \$response['recordsTotal'],
                            'recordsFiltered' => \$response['recordsFiltered']
                        ]);
                    } catch (Exception \$e) {
                        Developer::error('FetchCtrl: Exception occurred', [
                            'error' => \$e->getMessage(),
                            'trace' => \$e->getTraceAsString(),
                            'token' => \$token ?? 'unknown'
                        ]);
                        return response()->json([
                            'status' => false,
                            'title' => 'Error',
                            'message' => Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'Failed to retrieve data.'
                        ]);
                    }
                }
            }
            PHP;
    }
    private static function navCtrlTemplate(string $system, string $moduleName): string
    {
            $systemCapitalized = ucfirst($system);
            return <<<PHP
        <?php
        namespace App\Http\Controllers\System\\$systemCapitalized\\$moduleName;

        use App\Facades\{Developer, Skeleton};
        use App\Http\Controllers\Controller;
        use Exception;
        use Illuminate\Http\{JsonResponse, Request};
        use Illuminate\Support\Facades\{Config, View};

        /**
         * Controller for rendering navigation views for the $moduleName module.
         */
        class NavCtrl extends Controller
        {
            /**
             * Renders dashboard-related views based on route parameters.
             *
             * @param Request \$request HTTP request object.
             * @param array \$params Route parameters (module, section, item, token).
             * @return \Illuminate\View\View|JsonResponse
             */
            public function index(Request \$request, array \$params)
            {
                try {
                    // Extract route parameters
                    \$baseView = 'system.' . strtolower('$system') . '.' . strtolower('$moduleName');
                    \$module = \$params['module'] ?? '$moduleName';
                    \$section = \$params['section'] ?? null;
                    \$item = \$params['item'] ?? null;
                    \$token = \$params['token'] ?? null;

                    // Build view path
                    \$viewPath = \$baseView;
                    if (\$section) {
                        \$viewPath .= ".\{\$section}";
                        if (\$item) {
                            \$viewPath .= ".\{\$item}";
                        }
                    } else {
                        \$viewPath .= '.index';
                    }

                    // Extract view name and normalize path
                    \$viewName = str_replace("\{\$baseView}.", '', \$viewPath);
                    \$viewPath = strtolower(\$viewPath);
                    \$viewPath = str_replace(' ', '-', \$viewPath);

                    // Base data
                    \$data = ['status' => true, 'module' => \$module, 'section' => \$section, 'item' => \$item, 'token' => \$token];

                    switch (\$viewName) {
                        case 'index':
                            \$data['dashboard_list'] = ['sample' => 'Example Data'];
                            break;
                        default:
                            \$data['default_message'] = '$moduleName section loaded';
                            break;
                    }

                    // Render view if it exists
                    if (View::exists(\$viewPath)) {
                        return view(\$viewPath, \$data);
                    }

                    // Return 404 view if view does not exist
                    return response()->view('view.errors.404', []);

                } catch (Exception \$e) {
                    return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while loading the page.']);
                }
            }
        }
        PHP;
    }
    private static function formCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        return <<<PHP
        <?php
        namespace App\Http\Controllers\System\\$systemCapitalized\\$moduleName;

        use App\Facades\{Data, Random, Skeleton};
        use App\Http\Controllers\Controller;
        use Exception;
        use Illuminate\Http\{JsonResponse, Request};
        use Illuminate\Support\Facades\{Config, Validator};

        /**
         * Controller for saving new $moduleName entities.
         */
        class FormCtrl extends Controller
        {
            /**
             * Saves new $moduleName entity data based on validated input.
             *
             * @param Request \$request HTTP request with form data and token.
             * @return JsonResponse Success or error message.
             */
            public function index(Request \$request): JsonResponse
            {
                try {
                    // Extract and validate token
                    \$token = \$request->input('save_token');
                    if (!\$token) {
                        return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
                    }

                    // Resolve token to configuration
                    \$reqSet = Skeleton::resolveToken(\$token);
                    if (!isset(\$reqSet['key'])) {
                        return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
                    }

                    \$byMeta = \$timestampMeta = \$reloadTable = true;

                    switch (\$reqSet['key']) {
                        case 'example_entity':
                            \$validator = Validator::make(\$request->all(), [
                                'name' => 'required|string|max:100',
                                'type' => 'required|in:primary,secondary',
                                'status' => 'required|in:active,inactive',
                            ]);
                            if (\$validator->fails()) {
                                return response()->json(['status' => false, 'title' => 'Validation Error', 'message' => \$validator->errors()->first()]);
                            }
                            \$validated = \$validator->validated();
                            \$validated['entity_id'] = Random::unique(6, 'ENT');
                            break;
                        default:
                            return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
                    }

                    // Add metadata
                    if (\$byMeta || \$timestampMeta) {
                        if (\$byMeta) {
                            \$validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
                        }
                        if (\$timestampMeta) {
                            \$validated['created_at'] = \$validated['updated_at'] = now();
                        }
                    }

                    // Insert data
                    \$result = Data::create('central', \$reqSet['table'], \$validated);

                    return response()->json(['status' => \$result['status'], 'reload_table' => \$reloadTable, 'token' => \$reqSet['token'], 'affected' => \$result['status'] ? \$result['data']['id'] : '-', 'title' => \$result['status'] ? 'Success' : 'Failed', 'message' => \$result['status'] ? 'Entity added successfully' : \$result['message']]);

                } catch (Exception \$e) {
                    return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while saving the data.']);
                }
            }
        }
        PHP;
    }
    private static function showAddCtrlTemplate(string $system, string $moduleName): string
    {
            $systemCapitalized = ucfirst($system);
            return <<<PHP
        <?php
        namespace App\Http\Controllers\System\\$systemCapitalized\\$moduleName;

        use App\Facades\{Select, CentralDB, Skeleton};
        use App\Http\Controllers\Controller;
        use App\Http\Helpers\PopupHelper;
        use Exception;
        use Illuminate\Http\{JsonResponse, Request};
        use Illuminate\Support\Facades\Config;

        /**
         * Controller for rendering the add form for $moduleName entities.
         */
        class ShowAddCtrl extends Controller
        {
            /**
             * Renders a popup form for adding new $moduleName entities.
             *
             * @param Request \$request HTTP request object.
             * @param array \$params Route parameters with token.
             * @return JsonResponse Form configuration or error message.
             */
            public function index(Request \$request, array \$params): JsonResponse
            {
                try {
                    // Extract and validate token
                    \$token = \$params['token'] ?? \$request->input('skeleton_token');
                    if (!\$token) {
                        return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
                    }

                    // Resolve token to configuration
                    \$reqSet = Skeleton::resolveToken(\$token);
                    if (!isset(\$reqSet['key'])) {
                        return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
                    }

                    \$popup = [];
                    switch (\$reqSet['key']) {
                        case 'example_entity':
                            \$popup = [
                                'form' => 'builder',
                                'labelType' => 'floating',
                                'fields' => [
                                    ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['maxlength' => '100']],
                                    ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['primary' => 'Primary', 'secondary' => 'Secondary'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                                    ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                                ],
                                'type' => 'modal',
                                'size' => 'modal-md',
                                'position' => 'end',
                                'label' => '<i class="fa-regular fa-folder me-1"></i> Add Entity',
                                'button' => 'Save Entity',
                                'script' => 'window.skeleton.select();window.skeleton.unique();'
                            ];
                            break;
                        default:
                            return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
                    }

                    // Generate content based on form type
                    \$content = \$popup['form'] === 'builder' ? PopupHelper::generateBuildForm(\$token, \$popup['fields'], \$popup['labelType']) : \$popup['content'];

                    // Generate response
                    return response()->json([
                        'token' => \$token,
                        'type' => \$popup['type'],
                        'size' => \$popup['size'],
                        'position' => \$popup['position'],
                        'label' => \$popup['label'],
                        'content' => \$content,
                        'script' => \$popup['script'],
                        'button_class' => \$popup['button_class'] ?? '',
                        'button' => \$popup['button'] ?? '',
                        'footer' => \$popup['footer'] ?? '',
                        'header' => \$popup['header'] ?? '',
                        'validate' => \$reqSet['validate'] ?? '0',
                        'status' => true
                    ]);

                } catch (Exception \$e) {
                    return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while processing the request.']);
                }
            }
        }
        PHP;
    }
    private static function showEditCtrlTemplate(string $system, string $moduleName): string
    {
            $systemCapitalized = ucfirst($system);
            return <<<PHP
        <?php
        namespace App\Http\Controllers\System\\$systemCapitalized\\$moduleName;

        use App\Facades\{CentralDB, Data, Skeleton, Select};
        use App\Http\Controllers\Controller;
        use App\Http\Helpers\PopupHelper;
        use Exception;
        use Illuminate\Http\{JsonResponse, Request};
        use Illuminate\Support\Facades\{Config, Log};

        /**
         * Controller for rendering the edit form for $moduleName entities.
         */
        class ShowEditCtrl extends Controller
        {
            /**
             * Renders a popup form for editing $moduleName entities.
             *
             * @param Request \$request HTTP request object.
             * @param array \$params Route parameters with token.
             * @return JsonResponse Form configuration or error message.
             */
            public function index(Request \$request, array \$params): JsonResponse
            {
                try {
                    // Extract and validate token
                    \$token = \$params['token'] ?? \$request->input('skeleton_token');
                    if (!\$token) {
                        return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
                    }

                    // Resolve token to configuration
                    \$reqSet = Skeleton::resolveToken(\$token);
                    if (!isset(\$reqSet['key']) || !isset(\$reqSet['act']) || !isset(\$reqSet['id'])) {
                        return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
                    }

                    // Fetch existing data
                    \$result = Data::get(\$reqSet['system'], \$reqSet['table'], ['where' => [\$reqSet['act'] => \$reqSet['id']]]);
                    \$data = \$result['data'][0] ?? null;
                    if (!\$data) {
                        return response()->json(['status' => false, 'title' => 'Record Not Found', 'message' => 'The requested record was not found.']);
                    }

                    \$popup = [];
                    switch (\$reqSet['key']) {
                        case 'example_entity':
                            \$popup = [
                                'form' => 'builder',
                                'labelType' => 'floating',
                                'fields' => [
                                    ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'value' => \$data->name, 'required' => true, 'col' => '12', 'attr' => ['maxlength' => '100']],
                                    ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['primary' => 'Primary', 'secondary' => 'Secondary'], 'value' => \$data->type, 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                                    ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'value' => \$data->status, 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                                ],
                                'type' => 'modal',
                                'size' => 'modal-md',
                                'position' => 'end',
                                'label' => '<i class="fa-regular fa-edit me-1"></i> Edit Entity',
                                'button' => 'Update Entity',
                                'script' => 'window.skeleton.select();window.skeleton.unique();'
                            ];
                            break;
                        default:
                            return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
                    }

                    // Generate content based on form type
                    \$content = \$popup['form'] === 'builder' ? PopupHelper::generateBuildForm(\$token, \$popup['fields'], \$popup['labelType']) : \$popup['content'];

                    // Generate response
                    return response()->json([
                        'token' => \$token,
                        'type' => \$popup['type'],
                        'size' => \$popup['size'],
                        'position' => \$popup['position'],
                        'label' => \$popup['label'],
                        'content' => \$content,
                        'script' => \$popup['script'],
                        'button_class' => \$popup['button_class'] ?? '',
                        'button' => \$popup['button'] ?? '',
                        'footer' => \$popup['footer'] ?? '',
                        'header' => \$popup['header'] ?? '',
                        'validate' => \$reqSet['validate'] ?? '0',
                        'status' => true
                    ]);

                } catch (Exception \$e) {
                    return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while processing the request.']);
                }
            }
        }
        PHP;
    }
    private static function saveAddCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
                return <<<PHP
            <?php
            namespace App\Http\Controllers\System\\$systemCapitalized\\$moduleName;

            use App\Facades\{Data, Random, Skeleton};
            use App\Http\Controllers\Controller;
            use Exception;
            use Illuminate\Http\{JsonResponse, Request};
            use Illuminate\Support\Facades\{Config, Validator};

            /**
             * Controller for saving new $moduleName entities.
             */
            class SaveAddCtrl extends Controller
            {
                /**
                 * Saves new $moduleName entity data based on validated input.
                 *
                 * @param Request \$request HTTP request with form data and token.
                 * @return JsonResponse Success or error message.
                 */
                public function index(Request \$request): JsonResponse
                {
                    try {
                        // Extract and validate token
                        \$token = \$request->input('save_token');
                        if (!\$token) {
                            return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
                        }

                        // Resolve token to configuration
                        \$reqSet = Skeleton::resolveToken(\$token);
                        if (!isset(\$reqSet['key'])) {
                            return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
                        }

                        \$byMeta = \$timestampMeta = \$reloadTable = true;

                        switch (\$reqSet['key']) {
                            case 'example_entity':
                                \$validator = Validator::make(\$request->all(), [
                                    'name' => 'required|string|max:100',
                                    'type' => 'required|in:primary,secondary',
                                    'status' => 'required|in:active,inactive',
                                ]);
                                if (\$validator->fails()) {
                                    return response()->json(['status' => false, 'title' => 'Validation Error', 'message' => \$validator->errors()->first()]);
                                }
                                \$validated = \$validator->validated();
                                \$validated['entity_id'] = Random::unique(6, 'ENT');
                                break;
                            default:
                                return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
                        }

                        // Add metadata
                        if (\$byMeta || \$timestampMeta) {
                            if (\$byMeta) {
                                \$validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
                            }
                            if (\$timestampMeta) {
                                \$validated['created_at'] = \$validated['updated_at'] = now();
                            }
                        }

                        // Insert data
                        \$result = Data::create('central', \$reqSet['table'], \$validated);

                        return response()->json(['status' => \$result['status'], 'reload_table' => \$reloadTable, 'token' => \$reqSet['token'], 'affected' => \$result['status'] ? \$result['data']['id'] : '-', 'title' => \$result['status'] ? 'Success' : 'Failed', 'message' => \$result['status'] ? 'Entity added successfully' : \$result['message']]);

                    } catch (Exception \$e) {
                        return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while saving the data.']);
                    }
                }
            }
            PHP;
    }
    private static function saveEditCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        return <<<PHP
        <?php
        namespace App\Http\Controllers\System\\$systemCapitalized\\$moduleName;

        use App\Facades\{Data, Developer, Skeleton};
        use App\Http\Controllers\Controller;
        use Exception;
        use Illuminate\Http\{JsonResponse, Request};
        use Illuminate\Support\Facades\{Config, Validator};

        /**
         * Controller for saving updated $moduleName entities.
         */
        class SaveEditCtrl extends Controller
        {
            /**
             * Saves updated $moduleName entity data based on validated input.
             *
             * @param Request \$request HTTP request with form data and token.
             * @return JsonResponse Success or error message.
             */
            public function index(Request \$request): JsonResponse
            {
                try {
                    // Extract and validate token
                    \$token = \$request->input('save_token');
                    if (!\$token) {
                        return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
                    }

                    // Resolve token to configuration
                    \$reqSet = Skeleton::resolveToken(\$token);
                    if (!isset(\$reqSet['key']) || !isset(\$reqSet['act']) || !isset(\$reqSet['id'])) {
                        return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
                    }

                    \$byMeta = \$timestampMeta = \$reloadTable = true;

                    switch (\$reqSet['key']) {
                        case 'example_entity':
                            \$validator = Validator::make(\$request->all(), [
                                'name' => 'required|string|max:100',
                                'type' => 'required|in:primary,secondary',
                                'status' => 'required|in:active,inactive',
                            ]);
                            if (\$validator->fails()) {
                                return response()->json(['status' => false, 'title' => 'Validation Error', 'message' => \$validator->errors()->first()]);
                            }
                            \$validated = \$validator->validated();
                            break;
                        default:
                            return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
                    }

                    // Add metadata
                    if (\$byMeta || \$timestampMeta) {
                        if (\$byMeta) {
                            \$validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                        }
                        if (\$timestampMeta) {
                            \$validated['updated_at'] = now();
                        }
                    }

                    // Update data
                    \$affected = Data::update('central', \$reqSet['table'], \$validated, [\$reqSet['act'] => \$reqSet['id']]);

                    return response()->json(['status' => \$affected > 0, 'reload_table' => \$reloadTable, 'token' => \$reqSet['token'], 'affected' => \$affected, 'title' => \$affected > 0 ? 'Success' : 'Failed', 'message' => \$affected > 0 ? 'Entity updated successfully' : 'No changes were made.']);

                } catch (Exception \$e) {
                    return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while saving the data.']);
                }
            }
        }
        PHP;
    }
    private static function viewCtrlTemplate(string $system, string $moduleName): string
    {
            $systemCapitalized = ucfirst($system);
            return <<<PHP
        <?php
        namespace App\Http\Controllers\System\\$systemCapitalized\\$moduleName;

        use App\Facades\{Data, CentralDB, Developer, Skeleton};
        use App\Http\Controllers\Controller;
        use App\Http\Helpers\PopupHelper;
        use Exception;
        use Illuminate\Http\{JsonResponse, Request};
        use Illuminate\Support\Facades\{Config, Log};

        /**
         * Controller for rendering detailed view for $moduleName entities.
         */
        class ViewCtrl extends Controller
        {
            /**
             * Renders a popup form for viewing $moduleName entities.
             *
             * @param Request \$request HTTP request object.
             * @param array \$params Route parameters with token.
             * @return JsonResponse Form configuration or error message.
             */
            public function index(Request \$request, array \$params): JsonResponse
            {
                try {
                    // Extract and validate token
                    \$token = \$params['token'] ?? \$request->input('skeleton_token');
                    if (!\$token) {
                        return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
                    }

                    // Resolve token to configuration
                    \$reqSet = Skeleton::resolveToken(\$token);
                    if (!isset(\$reqSet['key']) || !isset(\$reqSet['act']) || !isset(\$reqSet['id'])) {
                        return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid.']);
                    }

                    // Fetch existing data
                    \$result = Data::get(\$reqSet['system'], \$reqSet['table'], ['where' => [\$reqSet['act'] => \$reqSet['id']]]);
                    \$data = \$result['data'][0] ?? null;
                    if (!\$data) {
                        return response()->json(['status' => false, 'title' => 'Record Not Found', 'message' => 'The requested record was not found.']);
                    }

                    \$popup = [];
                    switch (\$reqSet['key']) {
                        case 'example_entity':
                            \$popup = [
                                'form' => 'builder',
                                'labelType' => 'floating',
                                'fields' => [
                                    ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'value' => \$data->name, 'required' => true, 'col' => '12', 'attr' => ['disabled' => 'disabled']],
                                    ['type' => 'text', 'name' => 'type', 'label' => 'Type', 'value' => \$data->type, 'required' => true, 'col' => '6', 'attr' => ['disabled' => 'disabled']],
                                    ['type' => 'text', 'name' => 'status', 'label' => 'Status', 'value' => \$data->status, 'required' => true, 'col' => '6', 'attr' => ['disabled' => 'disabled']],
                                ],
                                'type' => 'modal',
                                'size' => 'modal-md',
                                'position' => 'end',
                                'label' => '<i class="fa-regular fa-eye me-1"></i> View Entity',
                                'button' => 'Close',
                                'script' => 'window.skeleton.select();window.skeleton.unique();'
                            ];
                            break;
                        default:
                            return response()->json(['status' => false, 'title' => 'Invalid Configuration', 'message' => 'The configuration key is not supported.']);
                    }

                    // Generate content based on form type
                    \$content = \$popup['form'] === 'builder' ? PopupHelper::generateBuildForm(\$token, \$popup['fields'], \$popup['labelType']) : \$popup['content'];

                    // Generate response
                    return response()->json([
                        'token' => \$token,
                        'type' => \$popup['type'],
                        'size' => \$popup['size'],
                        'position' => \$popup['position'],
                        'label' => \$popup['label'],
                        'content' => \$content,
                        'script' => \$popup['script'],
                        'button_class' => \$popup['button_class'] ?? '',
                        'button' => \$popup['button'] ?? '',
                        'footer' => \$popup['footer'] ?? '',
                        'header' => \$popup['header'] ?? '',
                        'validate' => \$reqSet['validate'] ?? '0',
                        'status' => true
                    ]);

                } catch (Exception \$e) {
                    return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while processing the request.']);
                }
            }
        }
        PHP;
    }
}
