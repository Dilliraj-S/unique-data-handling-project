<?php
namespace App\Services;
use App\Facades\{Data, Random, Skeleton};
use Illuminate\Support\Facades\{Config, File, Log};
use Illuminate\Support\Str;
use InvalidArgumentException;
/**
 * Service for conditional, environment-based logging with support for custom log levels
 * and structure generation for modules, sections, items, and permissions.
 */
class DeveloperService
{
    /**
     * Enabled log levels from configuration.
     *
     * @var array<string>
     */
    protected $enabledLevels;
    /**
     * Standard PSR-3 log levels supported by Monolog.
     *
     * @var array<string>
     */
    protected $standardLevels = [
        'emergency',
        'alert',
        'critical',
        'error',
        'warning',
        'notice',
        'info',
        'debug',
    ];
    /**
     * Default log level for custom (non-standard) log levels.
     *
     * @var string
     */
    protected $defaultCustomLevel = 'debug';
    /**
     * Initialize the service with enabled log levels.
     */
    public function __construct()
    {
        $this->enabledLevels = $this->loadEnabledLevels();
    }
    /**
     * Handle dynamic method calls for custom log levels.
     *
     * @param string $method The called method name (log level)
     * @param array $arguments Arguments passed to the method
     * @return void
     * @throws InvalidArgumentException If the message is missing
     */
    public function __call(string $method, array $arguments): void
    {
        $message = $arguments[0] ?? '';
        $context = $arguments[1] ?? [];
        if (!is_array($context)) {
            $context = ['context' => $context];
        }
        $this->log($method, $message, $context);
    }
    /**
     * Logs a message at the specified level if enabled.
     *
     * @param string $level The log level (standard or custom)
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     * @throws InvalidArgumentException If the log level is invalid
     */
    public function log(string $level, $message, array $context = []): void
    {
        if (empty($level) || !is_string($level)) {
            throw new InvalidArgumentException('Log level must be a non-empty string');
        }
        $level = strtolower($level);
        if (!$this->isLevelEnabled($level)) {
            return;
        }
        // Map custom log levels to debug
        $effectiveLevel = in_array($level, $this->standardLevels, true) ? $level : $this->defaultCustomLevel;
        // Add original level to context for custom levels
        if ($effectiveLevel !== $level) {
            $context['original_level'] = $level;
        }
        $message = $this->normalizeMessage($message);
        try {
            Log::channel()->log($effectiveLevel, $message, $context);
        } catch (\Exception $e) {
            // Log fallback error to default channel
            Log::error('Failed to log message', [
                'level' => $effectiveLevel,
                'message' => $message,
                'context' => $context,
                'error' => $e->getMessage(),
            ]);
        }
    }
    /**
     * Log an emergency message.
     *
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     */
    public function emergency($message, array $context = []): void
    {
        $this->log('emergency', $message, $context);
    }
    /**
     * Log an alert message.
     *
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     */
    public function alert($message, array $context = []): void
    {
        $this->log('alert', $message, $context);
    }
    /**
     * Log a critical message.
     *
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     */
    public function critical($message, array $context = []): void
    {
        $this->log('critical', $message, $context);
    }
    /**
     * Log an error message.
     *
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     */
    public function error($message, array $context = []): void
    {
        $this->log('error', $message, $context);
    }
    /**
     * Log a warning message.
     *
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     */
    public function warning($message, array $context = []): void
    {
        $this->log('warning', $message, $context);
    }
    /**
     * Log a notice message.
     *
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     */
    public function notice($message, array $context = []): void
    {
        $this->log('notice', $message, $context);
    }
    /**
     * Log an info message.
     *
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     */
    public function info($message, array $context = []): void
    {
        $this->log('info', $message, $context);
    }
    /**
     * Log a debug message.
     *
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     */
    public function debug($message, array $context = []): void
    {
        $this->log('debug', $message, $context);
    }
    /**
     * Log a query message (mapped to debug).
     *
     * @param mixed $message The message to log
     * @param array<string, mixed> $context Additional context for the log
     * @return void
     */
    public function query($message, array $context = []): void
    {
        $this->log('query', $message, $context);
    }
    /**
     * Normalizes a message to a string.
     *
     * @param mixed $message The message to normalize
     * @return string The normalized message
     */
    protected function normalizeMessage($message): string
    {
        if (is_null($message)) {
            return 'null';
        }
        if (is_string($message)) {
            return $message;
        }
        if (is_scalar($message)) {
            return (string) $message;
        }
        if (is_object($message) && method_exists($message, '__toString')) {
            return (string) $message;
        }
        try {
            $encoded = json_encode($message, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            return $encoded ?: 'Unserializable message';
        } catch (\Exception $e) {
            return 'Failed to serialize message: ' . $e->getMessage();
        }
    }
    /**
     * Loads enabled log levels from configuration.
     *
     * @return array<string> The enabled log levels
     */
    protected function loadEnabledLevels(): array
    {
        $rawLevels = Config::get('skeleton.developer_logs', 'all');
        if ($rawLevels === 'all' || empty($rawLevels)) {
            return $this->standardLevels;
        }
        $levels = array_map('strtolower', array_map('trim', explode(',', $rawLevels)));
        return array_values(array_unique(array_filter($levels, fn($level) => !empty($level))));
    }
    /**
     * Checks if a log level is enabled.
     *
     * @param string $level The log level to check
     * @return bool True if the level is enabled, false otherwise
     */
    protected function isLevelEnabled(string $level): bool
    {
        return in_array(strtolower($level), $this->enabledLevels, true) || $this->enabledLevels === ['all'];
    }
    /**
     * Generates a structure (controller, blade, or permission) based on type and ID.
     *
     * @param string $structure The structure to generate (controller, blade, permission)
     * @param string $type The type of entity (module, section, item)
     * @param string $id The ID of the entity
     * @param string|null $system The system to query (default: 'central')
     * @return void
     */
    public function generateStructure(string $structure, string $type, string $id, ?string $system = 'central'): void
    {
        $joins = [];
        $where = [];
        $columns = [];
        $baseTable = '';
        // Determine table, columns, and joins based on type
        $map = [
            'module' => [
                'table' => 'skeleton_modules',
                'where' => ['module_id' => $id],
                'columns' => ['skeleton_modules.name as module', 'skeleton_modules.system as system', 'skeleton_modules.icon as module_icon'],
            ],
            'section' => [
                'table' => 'skeleton_sections',
                'where' => ['section_id' => $id],
                'columns' => [
                    'skeleton_modules.name as module',
                    'skeleton_sections.name as section',
                    'skeleton_sections.icon as section_icon',
                    'skeleton_modules.system as system',
                ],
                'joins' => [[
                    'type' => 'left',
                    'table' => 'skeleton_modules',
                    'on' => ['skeleton_sections.module_id', 'skeleton_modules.module_id'],
                ]],
            ],
            'item' => [
                'table' => 'skeleton_items',
                'where' => ['item_id' => $id],
                'columns' => [
                    'skeleton_modules.name as module',
                    'skeleton_sections.name as section',
                    'skeleton_items.name as item',
                    'skeleton_items.icon as item_icon',
                    'skeleton_modules.system as system',
                ],
                'joins' => [
                    [
                        'type' => 'left',
                        'table' => 'skeleton_sections',
                        'on' => ['skeleton_items.section_id', 'skeleton_sections.section_id'],
                    ],
                    [
                        'type' => 'left',
                        'table' => 'skeleton_modules',
                        'on' => ['skeleton_sections.module_id', 'skeleton_modules.module_id'],
                    ],
                ],
            ],
        ];
        // Validate type
        if (!isset($map[$type])) {
            $this->warning("Unsupported type '{$type}' provided.");
            return;
        }
        // Set configuration
        $config = $map[$type];
        $baseTable = $config['table'];
        $where = $config['where'];
        $columns = $config['columns'];
        $joins = $config['joins'] ?? [];
        // Construct query parameters
        $params = compact('columns', 'where');
        if ($joins) {
            $params['joins'] = $joins;
        }
        try {
            // Fetch data using Data facade
            $data = Data::get($system, $baseTable, $params);
            // Check if data was retrieved
            if (empty($data['data'][0])) {
                $this->warning("No record found for type '{$type}' and id '{$id}' in system '{$system}'.");
                return;
            }
            // Convert first data item to object
            $record = (object) $data['data'][0];
            // Validate record has required module property
            if (!isset($record->module) || !is_string($record->module)) {
                $this->warning("Record is missing or has invalid 'module' property.", [
                    'structure' => $structure,
                    'type' => $type,
                    'id' => $id,
                    'system' => $system,
                    'record' => (array) $record,
                ]);
                return;
            }
            // Generate structure based on type
            match ($structure) {
                'controller' => $this->generateController($type, $record),
                'blade' => $this->generateBlade($type, $record),
                'permission' => $this->generatePermission($type, $record),
                default => $this->warning("Unsupported structure '{$structure}' provided."),
            };
        } catch (\Throwable $e) {
            $this->error('Failed to fetch data or generate structure', [
                'structure' => $structure,
                'type' => $type,
                'id' => $id,
                'system' => $system,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
    /**
     * Generates controller files for the specified type and record data.
     *
     * @param string $type The type of entity (module, section, item)
     * @param \stdClass $record The record data containing module, section, or item names
     * @return void
     */
    protected function generateController(string $type, \stdClass $record): void
    {
        $moduleName = Str::studly($record->module); // Ensures PascalCase like StudentManagement
        $system = strtolower($record->system ?? 'central');
        $basePath = app_path("Http/Controllers/System/" . ucfirst($system) . "/{$moduleName}");
        try {
            if (!File::exists($basePath)) {
                File::makeDirectory($basePath, 0755, true);
            }
            $templates = [
                'NavCtrl.php'       => 'navCtrlTemplate',
                'TableCtrl.php'     => 'tableCtrlTemplate',
                'CardCtrl.php'      => 'cardCtrlTemplate',
                'FormCtrl.php'      => 'formCtrlTemplate',
                'ShowAddCtrl.php'   => 'showAddCtrlTemplate',
                'SaveAddCtrl.php'   => 'saveAddCtrlTemplate',
                'ShowEditCtrl.php'  => 'showEditCtrlTemplate',
                'SaveEditCtrl.php'  => 'saveEditCtrlTemplate',
                'ViewCtrl.php'      => 'viewCtrlTemplate',
                'CustomCtrl.php'    => 'customCtrlTemplate',
            ];
            $createdFiles = [];
            foreach ($templates as $file => $method) {
                $filePath = "{$basePath}/{$file}";
                if (!File::exists($filePath)) {
                    $content = $this->$method($system, $moduleName);
                    File::put($filePath, $content);
                    $createdFiles[] = $file;
                }
            }
            $message = empty($createdFiles)
                ? 'No new controller files created; all files already exist'
                : 'Controller files created';
            $this->info($message, [
                'module' => $moduleName,
                'system' => $system,
                'files' => $createdFiles,
            ]);
        } catch (\Exception $e) {
            $this->error('Failed to create controller files', [
                'system' => $system,
                'module' => $moduleName,
                'error' => $e->getMessage(),
            ]);
        }
    }
    /**
     * Generates Blade view files for the specified type and record data.
     *
     * @param string $type The type of entity (module, section, item)
     * @param \stdClass $record The record data containing module, section, or item names
     * @return void
     */
    protected function generateBlade(string $type, \stdClass $record): void
    {
        try {
            $system = strtolower($record->system ?? 'central');
            $moduleSlug = Str::kebab($record->module);
            $sectionSlug = isset($record->section) ? Str::kebab($record->section) : null;
            $itemSlug = isset($record->item) ? Str::kebab($record->item) : null;
            $basePath = resource_path("views/system/{$system}/{$moduleSlug}");
            $bladeFileName = 'index.blade.php';
            if ($type === 'section' && $sectionSlug) {
                $bladeFileName = "{$sectionSlug}.blade.php";
            } elseif ($type === 'item' && $sectionSlug && $itemSlug) {
                $basePath .= "/{$sectionSlug}";
                $bladeFileName = "{$itemSlug}.blade.php";
            }
            if (!File::exists($basePath)) {
                File::makeDirectory($basePath, 0755, true);
            }
            $viewMap = [
                $bladeFileName => $this->specificBladeTemplate($type, $record),
            ];
            $createdFiles = [];
            foreach ($viewMap as $fileName => $content) {
                $filePath = "{$basePath}/{$fileName}";
                if (!File::exists($filePath)) {
                    File::put($filePath, $content);
                    $createdFiles[] = $fileName;
                }
            }
            $this->info(
                empty($createdFiles)
                    ? 'No new Blade view files created; all files already exist'
                    : 'Blade view files created',
                [
                    'system' => $system,
                    'module' => $moduleSlug,
                    'type' => $type,
                    'files' => $createdFiles,
                ]
            );
        } catch (\Exception $e) {
            $this->error('Failed to create Blade view files', [
                'system' => $record->system ?? 'unknown',
                'module' => $record->module ?? 'unknown',
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
    /**
     * Generates permissions for the specified type and record data.
     *
     * @param string $type The type of entity (module, section, item)
     * @param \stdClass $record The record data containing module, section, or item names
     * @return void
     */
    protected function generatePermission(string $type, \stdClass $record): void
    {
        $system = strtolower($record->system ?? 'central');
        $moduleName = $record->module;
        $sectionName = $record->section ?? null;
        $itemName = $record->item ?? null;
        try {
            $permissionBase = match ($type) {
                'module' => $moduleName,
                'section' => "{$moduleName}::{$sectionName}",
                'item' => "{$moduleName}::{$sectionName}::{$itemName}",
                default => throw new InvalidArgumentException("Unsupported type '{$type}' provided."),
            };
            $actions = ['create', 'edit', 'delete', 'view', 'import', 'export'];
            $createdPermissions = [];
            $userId = Skeleton::getAuthenticatedUser()?->user_id ?? null;
            $now = now();
            foreach ($actions as $action) {
                $permissionName = "{$action}:{$permissionBase}";
                $exists = Data::get($system, 'permissions', [
                    'columns' => ['permission_id'],
                    'where' => ['name' => $permissionName],
                ]);
                if (empty($exists['data'])) {
                    Data::create($system, 'permissions', [
                        'permission_id' => Random::unique(6, 'PRMS'),
                        'name' => $permissionName,
                        'is_approved' => 1,
                        'is_skeleton' => 1,
                        'created_by' => $userId,
                        'updated_by' => $userId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $createdPermissions[] = $permissionName;
                }
            }
            $this->info(
                empty($createdPermissions)
                    ? 'No new permissions created; all permissions already exist'
                    : 'Permissions created',
                [
                    'system' => $system,
                    'module' => $moduleName,
                    'type' => $type,
                    'permissions' => $createdPermissions,
                ]
            );
        } catch (\Exception $e) {
            $this->error('Failed to create permissions', [
                'system' => $system,
                'module' => $moduleName,
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
    /**
     * Template for NavCtrl controller.
     *
     * @param string $system The system name
     * @param string $moduleName The module name
     * @return string The controller file content
     */
    protected function navCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        $moduleCapitalized = ucfirst($moduleName);
        $moduleFolder = Str::kebab(ucfirst($moduleName));
        return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Http\Controllers\Controller;
use App\Facades\Skeleton;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, View};
/**
 * Controller for rendering navigation views for the {$moduleCapitalized} module.
 */
class NavCtrl extends Controller
{
    /**
     * Renders dashboard-related views based on route parameters.
     *
     * @param Request \$request HTTP request object
     * @param array \$params Route parameters (module, section, item, token)
     * @return \Illuminate\View\View|JsonResponse
     */
    public function index(Request \$request, array \$params)
    {
        try {
            // Extract route parameters
            \$baseView = 'system.' . strtolower('{$system}') . '.' . strtolower('{$moduleFolder}');
            \$module = \$params['module'] ?? '{$moduleName}';
            \$section = \$params['section'] ?? null;
            \$item = \$params['item'] ?? null;
            \$token = \$params['token'] ?? null;
            // Build view path
            \$viewPath = \$baseView;
            if (\$section) {
                \$viewPath .= ".\\\" . \$section;
                if (\$item) {
                    \$viewPath .= "\\\" . \$item;
                }
            } else {
                \$viewPath .= '.index';
            }
            // Extract view name and normalize path
            \$viewName = str_replace("\{\$baseView}.", '', \$viewPath);
            \$viewPath = strtolower(str_replace(' ', '-', \$viewPath));
            // Initialize base data
            \$data = [
                'status' => true,
                'module' => \$module,
                'section' => \$section,
                'item' => \$item,
                'token' => \$token,
                'title' => 'Page Loaded',
                'message' => '{$moduleCapitalized} module page loaded successfully.'
            ];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different view names
            switch (\$viewName) {
                case 'index':
                    \$data['dashboard_list'] = [];
                    break;
                default:
                    break;
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add authenticated user data
            \$data['user'] = Skeleton::getAuthenticatedUser();
            // Render view if it exists
            if (View::exists(\$viewPath)) {
                return view(\$viewPath, \$data);
            }
            // Return 404 view if view does not exist
            return response()->view('errors.404', ['status' => false, 'title' => 'Page Not Found', 'message' => 'The requested page does not exist.'], 404);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while loading the page.', 500);
        }
    }
}
PHP;
    }
    /**
     * Template for TableCtrl controller.
     *
     * @param string $system The system name
     * @param string $moduleName The module name
     * @return string The controller file content
     */
    protected function tableCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        $moduleCapitalized = ucfirst($moduleName);
        return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{TableHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
/**
 * Controller for handling AJAX table data requests in the {$moduleCapitalized} module.
 */
class TableCtrl extends Controller
{
    /**
     * Handles AJAX requests for table data processing.
     *
     * @param Request \$request HTTP request object containing filters and view settings
     * @param array \$params Route parameters (module, section, item, token)
     * @return JsonResponse Processed table data or error response
     */
    public function index(Request \$request, array \$params): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$params['token'] ?? \$request->input('skeleton_token');
            if (empty(\$token)) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token and validate configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key']) || !isset(\$reqSet['table'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid or lacks required configuration.', 400);
            }
            // Set view to table and parse filters
            \$reqSet['view'] = 'table';
            \$reqSet['draw'] = (int) \$request->input('draw', 1);
            \$filters = \$request->input('skeleton_filters', []);
            \$reqSet['filters'] = [
                'search' => \$filters['search'] ?? [],
                'dateRange' => \$filters['dateRange'] ?? [],
                'columns' => \$filters['columns'] ?? [],
                'sort' => \$filters['sort'] ?? [],
                'pagination' => \$filters['pagination'] ?? ['page' => 1, 'limit' => 10],
            ];
            // Validate filters format
            if (!is_array(\$reqSet['filters'])) {
                return ResponseHelper::moduleError('Invalid Filters', 'The filters format is invalid.', 400);
            }
            // Initialize configuration arrays
            \$columns = \$conditions = \$joins = \$custom = [];
            \$title = 'Data Retrieved';
            \$message = '{$moduleCapitalized} data retrieved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$columns = [
                        'id' => ['entities.id', true],
                        'name' => ['entities.name', true],
                        'type' => ['entities.type', true],
                        'status' => ['entities.status', true],
                        'created_at' => ['entities.created_at', true],
                        'updated_at' => ['entities.updated_at', true],
                    ];
                    \$custom = [
                        ['type' => 'modify', 'column' => 'status', 'view' => '::((status = 1) ~ <span class="badge bg-success">Active</span> || <span class="badge bg-danger">Inactive</span>)::', 'renderHtml' => true],
                    ];
                    \$title = 'Entities Retrieved';
                    \$message = '{$moduleCapitalized} entity data retrieved successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate parameters and fetch data using DataService
            \$params = TableHelper::generateParams(\$columns, \$joins, \$conditions, \$reqSet);
            \$result = Data::filter('central', \$reqSet['table'], \$params);
            // Check if data retrieval was successful
            if (!\$result['status']) {
                return ResponseHelper::moduleError('Data Fetch Failed', \$result['message'], 500);
            }
            // Generate and return response using TableHelper
            return response()->json(array_merge(TableHelper::generateResponse(\$result, \$columns, \$custom, \$reqSet), ['title' => \$title, 'message' => \$message]));
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'Failed to retrieve table data.', 500);
        }
    }
}
PHP;
    }
    /**
     * Template for CardCtrl controller.
     *
     * @param string $system The system name
     * @param string $moduleName The module name
     * @return string The controller file content
     */
    protected function cardCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        $moduleCapitalized = ucfirst($moduleName);
        return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{CardHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
/**
 * Controller for handling AJAX card data requests in the {$moduleCapitalized} module with clean UI.
 */
class CardCtrl extends Controller
{
    /**
     * Handles AJAX requests for card data processing for modules, sections, and items.
     *
     * @param Request \$request HTTP request object containing filters and view settings
     * @param array \$params Route parameters (module, section, item, token)
     * @return JsonResponse Processed card data or error response
     */
    public function index(Request \$request, array \$params): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$params['token'] ?? \$request->input('skeleton_token');
            if (empty(\$token)) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token and validate configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key']) || !isset(\$reqSet['table'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid or lacks required configuration.', 400);
            }
            // Set view to card and parse filters
            \$reqSet['view'] = 'card';
            \$reqSet['draw'] = (int) \$request->input('draw', 1);
            \$filters = \$request->input('skeleton_filters', []);
            \$reqSet['filters'] = [
                'search' => \$filters['search'] ?? '',
                'dateRange' => \$filters['dateRange'] ?? [],
                'sort' => \$filters['sort'] ?? [],
                'pagination' => \$filters['pagination'] ?? ['page' => 1, 'limit' => 12],
            ];
            // Validate filters format
            if (!is_array(\$reqSet['filters'])) {
                return ResponseHelper::moduleError('Invalid Filters', 'The filters format is invalid.', 400);
            }
            // Initialize configuration arrays
            \$columns = \$conditions = \$joins = \$custom = [];
            \$view = '';
            \$title = 'Success';
            \$message = '{$moduleCapitalized} card data retrieved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$columns = [
                        'id' => 'entities.id',
                        'name' => 'entities.name',
                        'description' => 'entities.description',
                        'is_active' => 'entities.is_active',
                        'created_at' => 'entities.created_at',
                        'updated_at' => 'entities.updated_at',
                    ];
                    \$custom = [
                        [
                            'type' => 'modify',
                            'column' => 'is_active',
                            'view' => '::(is_active == 1 ~ "<span class=\"text-green-600 font-semibold\">Active</span>" || "<span class=\"text-red-600 font-semibold\">Inactive</span>")::',
                            'renderHtml' => true
                        ]
                    ];
                    \$view = '<div class="card h-100 bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow duration-300"><div class="card-body p-4"><h5 class="card-title text-lg font-bold text-gray-800 mb-2">::name::</h5><p class="card-text text-gray-600 text-sm mb-3">Description: ::description::<br>Status: ::is_active::<br>Created: ::created_at::<br>Updated: ::updated_at::</p><a href="#" class="btn bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200">View Entity ::id::</a></div></div>';
                    \$title = 'Entities Retrieved';
                    \$message = '{$moduleCapitalized} entity card data retrieved successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate parameters and fetch data using DataService
            \$params = CardHelper::generateParams(\$columns, \$joins, \$conditions, \$reqSet);
            \$result = Data::filter('central', \$reqSet['table'], \$params);
            // Check if data retrieval was successful
            if (!\$result['status']) {
                return ResponseHelper::moduleError('Data Fetch Failed', \$result['message'], 500);
            }
            // Generate and return response using CardHelper
            return response()->json(array_merge(CardHelper::generateResponse(\$result, \$columns, \$custom, \$reqSet, \$view), ['title' => \$title, 'message' => \$message]));
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'Failed to retrieve card data.', 500);
        }
    }
}
PHP;
    }
    /**
     * Template for FormCtrl controller.
     *
     * @param string $system The system name
     * @param string $moduleName The module name
     * @return string The controller file content
     */
    protected function formCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        $moduleCapitalized = ucfirst($moduleName);
        return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
/**
 * Controller for saving new {$moduleCapitalized} entities.
 */
class FormCtrl extends Controller
{
    /**
     * Saves new {$moduleCapitalized} entity data based on validated input.
     *
     * @param Request \$request HTTP request with form data and token
     * @return JsonResponse Success or error message
     */
    public function index(Request \$request): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$request->input('save_token');
            if (!\$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Initialize variables
            \$byMeta = \$timestampMeta = true;
            \$reloadTable = \$reloadCard = \$reloadPage = \$holdPopup = false;
            \$validated = [];
            \$title = 'Success';
            \$message = '{$moduleCapitalized} data saved successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$validator = Validator::make(\$request->all(), [
                        'name' => 'required|string|max:255',
                        'type' => 'required|in:data,unique,select,other',
                        'status' => 'required|in:active,inactive',
                    ]);
                    if (\$validator->fails()) {
                        return ResponseHelper::moduleError('Validation Failed', \$validator->errors()->first(), 422);
                    }
                    \$validated = \$validator->validated();
                    \$validated['entity_id'] = Random::unique(6, 'ENT');
                    \$title = 'Entity Added';
                    \$message = '{$moduleCapitalized} entity configuration added successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
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
            // Generate response
            return response()->json(['status' => \$result['status'], 'reload_table' => \$reloadTable, 'reload_card' => \$reloadCard, 'reload_page' => \$reloadPage, 'hold_popup' => \$holdPoup, 'token' => \$reqSet['token'], 'affected' => \$result['status'] ? \$result['data']['id'] : '-', 'title' => \$result['status'] ? \$title : 'Failed', 'message' => \$result['status'] ? \$message : \$result['message']]);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while saving the data.', 500);
        }
    }
}
PHP;
    }
    /**
     * Template for ShowAddCtrl controller.
     *
     * @param string $system The system name
     * @param string $moduleName The module name
     * @return string The controller file content
     */
    protected function showAddCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        $moduleCapitalized = ucfirst($moduleName);
        return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
/**
 * Controller for rendering the add form for {$moduleCapitalized} entities.
 */
class ShowAddCtrl extends Controller
{
    /**
     * Renders a popup form for adding new {$moduleCapitalized} entities.
     *
     * @param Request \$request HTTP request object
     * @param array \$params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request \$request, array \$params): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$params['token'] ?? \$request->input('skeleton_token');
            if (!\$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Initialize popup configuration and system options
            \$popup = [];
            \$holdPopup = false;
            \$system = ['central' => 'Central', 'business' => 'Business'];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'name', 'maxlength' => '255', 'data-unique' => Skeleton::skeletonToken('{$moduleName}_entities_unique') . '_u', 'data-unique-msg' => 'This name is already registered']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Add {$moduleCapitalized} Entity',
                        'button' => 'Save Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate content based on form type
            \$content = \$popup['form'] === 'builder' ? PopupHelper::generateBuildForm(\$token, \$popup['fields'], \$popup['labelType']) : \$popup['content'];
            // Generate response
            return response()->json(['token' => \$token, 'type' => \$popup['type'], 'size' => \$popup['size'], 'position' => \$popup['position'], 'label' => \$popup['label'], 'content' => \$content, 'script' => \$popup['script'], 'button_class' => \$popup['button_class'] ?? '', 'button' => \$popup['button'] ?? '', 'footer' => \$popup['footer'] ?? '', 'header' => \$popup['header'] ?? '', 'validate' => \$reqSet['validate'] ?? '0', 'hold_popup' => \$holdPopup, 'status' => true]);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
PHP;
    }
    /**
     * Template for SaveAddCtrl controller.
     *
     * @param string $system The system name
     * @param string $moduleName The module name
     * @return string The controller file content
     */
    protected function saveAddCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        $moduleCapitalized = ucfirst($moduleName);
        return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};
/**
 * Controller for saving new {$moduleCapitalized} entities.
 */
class SaveAddCtrl extends Controller
{
    /**
     * Saves new {$moduleCapitalized} entity data based on validated input.
     *
     * @param Request \$request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function index(Request \$request): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$request->input('save_token');
            if (!\$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }
            // Resolve token to configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            // Initialize flags and variables
            \$byMeta = \$timestampMeta = true;
            \$reloadTable = \$reloadCard = \$reloadPage = \$holdPopup = false;
            \$validated = [];
            \$title = 'Success';
            \$message = '{$moduleCapitalized} record added successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$validator = Validator::make(\$request->all(), [
                        'name' => 'required|string|regex:/^[a-z_]{3,100}\$/|max:100',
                        'type' => 'required|in:data,unique,select,other',
                        'status' => 'required|in:active,inactive',
                    ]);
                    if (\$validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', \$validator->errors()->first());
                    }
                    \$validated = \$validator->validated();
                    \$validated['entity_id'] = Random::unique(6, 'ENT');
                    \$reloadTable = true;
                    \$title = 'Entity Added';
                    \$message = '{$moduleCapitalized} entity configuration added successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add metadata if required
            if (\$byMeta || \$timestampMeta) {
                if (\$byMeta) {
                    \$validated['created_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if (\$timestampMeta) {
                    \$validated['created_at'] = \$validated['updated_at'] = now();
                }
            }
            // Insert data into the database
            \$result = Data::create('central', \$reqSet['table'], \$validated, \$reqSet['key']);
            // Return response based on creation success
            return response()->json(['status' => \$result['status'], 'reload_table' => \$reloadTable, 'reload_card' => \$reloadCard, 'reload_page' => \$reloadPage, 'hold_popup' => \$holdPopup, 'token' => \$reqSet['token'], 'affected' => \$result['status'] ? \$result['data']['id'] : '-', 'title' => \$result['status'] ? \$title : 'Failed', 'message' => \$result['status'] ? \$message : \$result['message']]);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}
PHP;
    }
    /**
 * Template for ShowEditCtrl controller.
 *
 * @param string $system The system name
 * @param string $moduleName The module name
 * @return string The controller file content
 */
protected function showEditCtrlTemplate(string $system, string $moduleName): string
{
    $systemCapitalized = ucfirst($system);
    $moduleCapitalized = ucfirst($moduleName);
    return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{PopupHelper, ResponseHelper};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config};

/**
 * Controller for rendering the edit form for {$moduleCapitalized} entities.
 */
class ShowEditCtrl extends Controller
{
    /**
     * Renders a popup form for editing {$moduleCapitalized} entities.
     *
     * @param Request \$request HTTP request object
     * @param array \$params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request \$request, array \$params): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$params['token'] ?? \$request->input('skeleton_token');
            if (!\$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key']) || !isset(\$reqSet['act']) || !isset(\$reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Fetch existing data
            \$result = Data::get(\$reqSet['system'], \$reqSet['table'], ['where' => [\$reqSet['act'] => \$reqSet['id']]]);
            \$dataItem = \$result['data'][0] ?? null;
            \$data = is_array(\$dataItem) ? (object) \$dataItem : \$dataItem;
            if (!\$data) {
                return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
            }
            // Initialize popup configuration
            \$popup = [];
            \$holdPopup = false;
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'text', 'name' => 'name', 'label' => 'Name', 'value' => \$data->name, 'required' => true, 'col' => '12', 'attr' => ['data-validate' => 'name', 'maxlength' => '100', 'readonly' => 'readonly']],
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'value' => \$data->type, 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'value' => \$data->status, 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'modal',
                        'size' => 'modal-md',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Edit {$moduleCapitalized} Entity',
                        'button' => 'Update Entity',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate content based on form type
            \$content = \$popup['form'] === 'builder' ? PopupHelper::generateBuildForm(\$token, \$popup['fields'], \$popup['labelType']) : \$popup['content'];
            // Generate response
            return response()->json(['token' => \$token, 'type' => \$popup['type'], 'size' => \$popup['size'], 'position' => \$popup['position'], 'label' => \$popup['label'], 'content' => \$content, 'script' => \$popup['script'], 'button_class' => \$popup['button_class'] ?? '', 'button' => \$popup['button'] ?? '', 'footer' => \$popup['footer'] ?? '', 'header' => \$popup['header'] ?? '', 'validate' => \$reqSet['validate'] ?? '0','hold_popup' => \$holdPopup, 'status' => true]);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }

    /**
     * Renders a popup to confirm bulk update of records.
     *
     * @param Request \$request HTTP request object containing input data.
     * @param array \$params Route parameters including token.
     * @return JsonResponse Custom UI configuration for the popup or an error message.
     */
    public function bulk(Request \$request, array \$params = []): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$params['token'] ?? \$request->input('skeleton_token', '');
            if (empty(\$token)) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['system']) || !isset(\$reqSet['table']) || !isset(\$reqSet['act'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid or missing required data.', 400);
            }
            // Parse IDs
            \$ids = array_filter(explode('@', \$request->input('id', '')));
            if (empty(\$ids)) {
                return ResponseHelper::moduleError('Invalid Data', 'No records specified for update.', 400);
            }
            // Fetch records details
            \$result = Data::get(\$reqSet['system'], \$reqSet['table'], ['where' => [
                \$reqSet['act'] => ['operator' => 'IN', 'value' => \$ids],
            ]], 'all');
            if (!\$result['status'] || empty(\$result['data'])) {
                return ResponseHelper::moduleError('Records Not Found', \$result['message'] ?: 'The requested records were not found.', 404);
            }
            \$records = \$result['data'];
            // Initialize popup configuration
            \$popup = [];
            \$holdPopup = false;
            \$recordCount = count(\$records);
            \$maxDisplayRecords = 5;
            // Generate accordion for records
            \$detailsHtml = sprintf('<div class="alert alert-warning" role="alert"><div class="accordion" id="updateAccordion-%s"><div class="accordion-item border-0"><h2 class="accordion-header p-0 my-0"><button class="accordion-button collapsed p-2 text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-%s" aria-expanded="false" aria-controls="collapse-%s">Confirm Bulk Update of %d Record(s)</button></h2><div id="collapse-%s" class="accordion-collapse collapse" data-bs-parent="#updateAccordion-%s"><div class="accordion-body p-2 bg-light"><div class="accordion" id="updateRecords-%s">', \$token, \$token, \$token, \$recordCount, \$token, \$token, \$token);
            if (\$recordCount > \$maxDisplayRecords) {
                \$detailsHtml .= sprintf('<div class="d-flex justify-content-between align-items-center"><div class="text-muted">Updating <b>%d</b> records.</div><button class="btn btn-link btn-sm text-decoration-none text-primary sf-12" type="button" data-bs-toggle="collapse" data-bs-target="#details-%s" aria-expanded="false" aria-controls="details-%s">Details</button></div><div class="collapse mt-2" id="details-%s"><div class="table-responsive" style="max-height: 200px;">', \$recordCount, \$token, \$token, \$token);
            }
            \$detailsHtml .= '<table class="table table-sm table-bordered mb-0">';
            \$displayRecords = \$recordCount > \$maxDisplayRecords ? array_slice(\$records, 0, 5) : \$records;
            foreach (\$displayRecords as \$index => \$record) {
                \$recordArray = (array)\$record;
                \$recordId = htmlspecialchars(\$recordArray[\$reqSet['act']] ?? 'N/A');
                \$detailsHtml .= sprintf('<tr><td colspan="2"><b>Record %d (ID: %s)</b></td></tr>', \$index + 1, \$recordId);
                if (empty(\$recordArray)) {
                    \$detailsHtml .= '<tr><td colspan="2" class="text-muted">No displayable details available</td></tr>';
                } else {
                    foreach (\$recordArray as \$key => \$value) {
                        \$detailsHtml .= sprintf('<tr><td>%s</td><td><b>%s</b></td></tr>', htmlspecialchars(ucwords(str_replace('_', ' ', \$key))), htmlspecialchars(\$value ?? ''));
                    }
                }
            }
            \$detailsHtml .= \$recordCount > \$maxDisplayRecords ? sprintf('<tr><td colspan="2" class="text-muted">... and %d more records</td></tr></table></div></div>', \$recordCount - count(\$displayRecords)) : '</table>';
            \$detailsHtml .= sprintf('</div><div class="mt-2"><i class="sf-10"><span class="text-danger">Note: </span>Only non-unique fields can be updated in bulk. Changes will apply to all %d selected records. Ensure values are valid to avoid data conflicts.</i></div></div></div></div></div></div>', \$recordCount);
            // Initialize popup configuration
            \$popup = [];
            \$detailsHtmlPlacement = 'top';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$popup = [
                        'form' => 'builder',
                        'labelType' => 'floating',
                        'fields' => [
                            ['type' => 'select', 'name' => 'type', 'label' => 'Type', 'options' => ['data' => 'Data', 'unique' => 'Unique', 'select' => 'Select', 'other' => 'Other'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                            ['type' => 'select', 'name' => 'status', 'label' => 'Status', 'options' => ['active' => 'Active', 'inactive' => 'Inactive'], 'required' => true, 'col' => '6', 'attr' => ['data-select' => 'dropdown']],
                        ],
                        'type' => 'offcanvas',
                        'size' => '-',
                        'position' => 'end',
                        'label' => '<i class="fa-regular fa-folder me-1"></i> Bulk Edit {$moduleCapitalized} Entities',
                        'button' => 'Update Entities',
                        'script' => 'window.skeleton.select();window.skeleton.unique();'
                    ];
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate content based on form type
            \$content = '<input type="hidden" name="update_ids" value="' . \$request->input('id', '') . '">';
            \$content .= \$popup['form'] === 'builder' ? PopupHelper::generateBuildForm(\$token, \$popup['fields'], \$popup['labelType']) : \$popup['content'];
            \$content = \$detailsHtmlPlacement === 'top' ? \$detailsHtml . \$content : \$content . \$detailsHtml;
            // Generate response
            return response()->json(['token' => \$token,'type' => \$popup['type'],'size' => \$popup['size'],'position' => \$popup['position'],'label' => \$popup['label'],'content' => \$content,'script' => \$popup['script'],'button_class' => \$popup['button_class'] ?? '','button' => \$popup['button'] ?? '','footer' => \$popup['footer'] ?? '','header' => \$popup['header'] ?? '','validate' => \$reqSet['validate'] ?? '0','hold_popup' => \$holdPopup,'status' => true]);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
PHP;
}
    /**
     * Template for SaveEditCtrl controller.
     *
     * @param string $system The system name
     * @param string $moduleName The module name
     * @return string The controller file content
     */
    protected function saveEditCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        $moduleCapitalized = ucfirst($moduleName);
        return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator};

/**
 * Controller for saving updated {$moduleCapitalized} entities.
 */
class SaveEditCtrl extends Controller
{
    /**
     * Saves updated {$moduleCapitalized} entity data based on validated input.
     *
     * @param Request \$request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function index(Request \$request): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$request->input('save_token');
            if (!\$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }
            // Resolve token to configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key']) || !isset(\$reqSet['act']) || !isset(\$reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            // Initialize flags and variables
            \$byMeta = \$timestampMeta = true;
            \$reloadTable = \$reloadCard = \$reloadPage = \$holdPopup = false;
            \$validated = [];
            \$title = 'Success';
            \$message = '{$moduleCapitalized} record updated successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$validator = Validator::make(\$request->all(), [
                        'name' => 'required|string|regex:/^[a-z_]{3,100}\$/|max:100',
                        'type' => 'required|in:data,unique,select,other',
                        'status' => 'required|in:active,inactive',
                    ]);
                    if (\$validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', \$validator->errors()->first());
                    }
                    \$validated = \$validator->validated();
                    \$reloadTable = true;
                    \$title = 'Entity Updated';
                    \$message = '{$moduleCapitalized} entity configuration updated successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add metadata if required
            if (\$byMeta || \$timestampMeta) {
                if (\$byMeta) {
                    \$validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if (\$timestampMeta) {
                    \$validated['updated_at'] = now();
                }
            }
            // Update data in the database
            \$affected = Data::update('central', \$reqSet['table'], \$validated, [\$reqSet['act'] => \$reqSet['id']], \$reqSet['key']);
            // Return response based on update success
            return response()->json(['status' => \$affected > 0, 'reload_table' => \$reloadTable, 'reload_card' => \$reloadCard, 'reload_page' => \$reloadPage, 'hold_popup' => \$holdPopup, 'token' => \$reqSet['token'], 'affected' => \$affected, 'title' => \$affected > 0 ? \$title : 'Failed', 'message' => \$affected > 0 ? \$message : 'No changes were made.']);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while saving the data.');
        }
    }

    /**
     * Saves bulk updated {$moduleCapitalized} entity data based on validated input.
     *
     * @param Request \$request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function bulk(Request \$request): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$request->input('save_token');
            if (!\$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }
            // Resolve token to configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key']) || !isset(\$reqSet['act'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }
            // Split update_ids into individual IDs
            \$ids = array_filter(explode('@', \$request->input('update_ids', '')));
            if (empty(\$ids)) {
                return response()->json(['status' => false, 'title' => 'Invalid Data', 'message' => 'No valid IDs provided for update.']);
            }
            // Initialize flags and variables
            \$byMeta = \$timestampMeta = true;
            \$reloadTable = \$reloadCard = \$reloadPage = \$holdPopup = false;
            \$validated = [];
            \$title = 'Success';
            \$message = '{$moduleCapitalized} records updated successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$validator = Validator::make(\$request->all(), [
                        'type' => 'required|in:data,unique,select,other',
                        'status' => 'required|in:active,inactive',
                    ]);
                    if (\$validator->fails()) {
                        return ResponseHelper::moduleError('Validation Error', \$validator->errors()->first());
                    }
                    \$validated = \$validator->validated();
                    \$reloadTable = true;
                    \$title = 'Entities Updated';
                    \$message = '{$moduleCapitalized} entities configuration updated successfully.';
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add metadata if required
            if (\$byMeta || \$timestampMeta) {
                if (\$byMeta) {
                    \$validated['updated_by'] = Skeleton::getAuthenticatedUser()->user_id;
                }
                if (\$timestampMeta) {
                    \$validated['updated_at'] = now();
                }
            }
            // Update data in the database
            \$affected = Data::update('central', \$reqSet['table'], \$validated, [\$reqSet['act'] => ['operator' => 'IN', 'value' => \$ids]], \$reqSet['key']);
            // Return response based on update success
            return response()->json(['status' => \$affected > 0, 'reload_table' => \$reloadTable, 'reload_card' => \$reloadCard, 'reload_page' => \$reloadPage, 'hold_popup' => \$holdPopup, 'token' => \$reqSet['token'], 'affected' => \$affected, 'title' => \$affected > 0 ? \$title : 'Failed', 'message' => \$affected > 0 ? \$message : 'No changes were made.']);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}
PHP;
    }
    /**
     * Template for ViewCtrl controller.
     *
     * @param string $system The system name
     * @param string $moduleName The module name
     * @return string The controller file content
     */
    protected function viewCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        $moduleCapitalized = ucfirst($moduleName);
        return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Facades\{Data, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config};
/**
 * Controller for rendering the view form for {$moduleCapitalized} entities.
 */
class ViewCtrl extends Controller
{
    /**
     * Columns to exclude from the details table globally.
     *
     * @var array
     */
    protected \$excludedColumns = ['id', 'unique_id', 'content', 'password', 'deleted_at', 'deleted_on'];
    /**
     * Renders a popup form for viewing {$moduleCapitalized} entities.
     *
     * @param Request \$request HTTP request object
     * @param array \$params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
    public function index(Request \$request, array \$params): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$params['token'] ?? \$request->input('skeleton_token');
            if (!\$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key']) || !isset(\$reqSet['act']) || !isset(\$reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Fetch existing data
            \$result = Data::get(\$reqSet['system'], \$reqSet['table'], ['where' => [\$reqSet['act'] => \$reqSet['id']]]);
            \$data = \$result['data'][0] ?? null;
            if (!\$data) {
                return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
            }
            // Initialize popup configuration
            \$popup = [];
            \$holdPopup = false;
            \$title = 'View Form Loaded';
            \$message = 'View form loaded successfully.';
            \$allowDefault = false;
            \$detailsHtml = '';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Handle different configuration keys
            switch (\$reqSet['key']) {
                case '{$moduleName}_entities':
                    \$popup = [
                        'type' => 'modal',
                        'size' => 'lg',
                        'position' => 'center',
                        'label' => 'View {$moduleCapitalized} Entity',
                        'form' => 'builder',
                        'labelType' => 'above',
                        'content' => '
                            <div class="mb-3"><label class="font-bold">Name:</label> <input type="text" name="name" value="' . htmlspecialchars(\$data->name) . '" readonly class="form-control"></div>
                            <div class="mb-3"><label class="font-bold">Type:</label> <input type="text" name="type" value="' . htmlspecialchars(\$data->type) . '" readonly class="form-control"></div>
                            <div class="mb-3"><label class="font-bold">Status:</label> <input type="text" name="status" value="' . htmlspecialchars(\$data->status) . '" readonly class="form-control"></div>
                        ',
                        'button' => 'Close',
                        'button_class' => 'btn btn-secondary',
                        'footer' => true,
                        'header' => true
                    ];
                    \$title = 'View Entity Form';
                    \$message = '{$moduleCapitalized} entity view form loaded successfully.';
                    break;
                // Handle invalid configuration keys
                default:
                    \$detailsHtml = '';
                    if (\$allowDefault) {
                        \$excludedColumns = property_exists(\$this, 'excludedColumns') ? \$this->excludedColumns : [];
                        \$filteredRecord = array_diff_key((array) \$data, array_flip(\$excludedColumns));
                        \$detailsHtml = '<div class="table-responsive"><table class="table table-sm table-borderless table-striped table-hover mb-0"><thead><tr class="bg-light"><th>Field</th><th>Value</th></tr></thead><tbody>';
                        if (!empty(\$filteredRecord)) {
                            foreach (\$filteredRecord as \$key => \$value) {
                                \$detailsHtml .= '<tr><td>' . htmlspecialchars(ucwords(str_replace('_', ' ', \$key))) . '</td><td><b>' . htmlspecialchars(\$value ?? '') . '</b></td></tr>';
                            }
                        } else {
                            \$detailsHtml .= '<tr><td colspan="2">No displayable details available</td></tr>';
                        }
                        \$detailsHtml .= '</tbody></table></div>';
                    } else {
                        \$detailsHtml = '<div class="d-flex flex-column align-items-center justify-content-center text-center w-100 h-100 p-3"><img src="' . asset('errors/empty.svg') . '" alt="No Details Available" class="img-fluid mb-2" style="max-width: 150px;"><h3 class="h5 mb-2 fw-bold">No Details Available</h3><p class="text-muted mb-2" style="max-width: 400px;">No displayable details are available for this record.</p><div class="d-flex flex-wrap justify-content-center gap-2 mt-2"><button type="button" class="btn btn-outline-primary btn-sm px-4 rounded-pill" data-bs-dismiss="offcanvas">View Another Entry</button></div></div>';
                    }
                    \$popup = ['type' => 'offcanvas', 'size' => '', 'position' => 'end', 'label' => 'Record Details', 'form' => 'builder', 'labelType' => 'above', 'content' => \$detailsHtml, 'button' => 'View', 'button_class' => 'd-none'];
                    \$title = 'View Record';
                    \$message = 'Record details loaded successfully.';
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Generate response
            return response()->json(['token' => \$token, 'type' => \$popup['type'], 'size' => \$popup['size'], 'position' => \$popup['position'], 'label' => \$popup['label'], 'content' => \$popup['content'], 'script' => \$popup['script'] ?? '', 'button_class' => \$popup['button_class'] ?? 'd-none', 'button' => \$popup['button'] ?? '', 'footer' => \$popup['footer'] ?? '', 'header' => \$popup['header'] ?? '', 'validate' => \$reqSet['validate'] ?? '0', 'status' => true, 'hold_popup' => \$holdPopup]);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
PHP;
    }
    /**
     * Template for CustomCtrl controller.
     *
     * @param string $system The system name
     * @param string $moduleName The module name
     * @return string The controller file content
     */
    protected function customCtrlTemplate(string $system, string $moduleName): string
    {
        $systemCapitalized = ucfirst($system);
        $moduleCapitalized = ucfirst($moduleName);
        return <<<PHP
<?php
namespace App\Http\Controllers\System\\{$systemCapitalized}\\{$moduleCapitalized};
use App\Http\Controllers\Controller;
use App\Facades\Skeleton;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Config;
/**
 * Custom controller for handling specific {$moduleCapitalized} module operations.
 */
class CustomCtrl extends Controller
{
    /**
     * Handles custom operations for the {$moduleCapitalized} module.
     *
     * @param Request \$request HTTP request object
     * @param array \$params Route parameters
     * @return JsonResponse Response with operation result
     */
    public function index(Request \$request, array \$params): JsonResponse
    {
        try {
            // Extract and validate token
            \$token = \$params['token'] ?? \$request->input('skeleton_token');
            if (!\$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            // Resolve token to configuration
            \$reqSet = Skeleton::resolveToken(\$token);
            if (!isset(\$reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            // Initialize response data
            \$data = [
                'status' => true,
                'title' => 'Operation Successful',
                'message' => '{$moduleCapitalized} custom operation completed successfully.'
            ];
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            // Add custom logic here
            switch (\$reqSet['key']) {
                case '{$moduleName}_custom':
                    // Add custom operation logic
                    break;
                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            // Return response
            return response()->json(['status' => \$data['status'], 'title' => \$data['title'], 'message' => \$data['message']]);
        } catch (Exception \$e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? \$e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}
PHP;
    }
    /**
     * Generates the specific Blade template for the module, section, or item.
     *
     * @param string $type The type of entity (module, section, item)
     * @param \stdClass $record The record data
     * @return string The Blade template content
     */
    protected function specificBladeTemplate(string $type, \stdClass $record): string
    {
        $title = Str::title($record->item ?? $record->section ?? $record->module);
        $breadcrumb = $this->buildBreadcrumb($type, $record);
        return <<<BLADE
{{-- Template: {$title} Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', '{$title}')
@section('top-style')
@endsection
@section('bottom-script')
@endsection
@section('content')
<div class="content">
    <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
        <div class="my-auto mb-2">
            <h3 class="mb-1">{$title}</h3>
            <nav>
                <ol class="breadcrumb mb-0">
                    {$breadcrumb}
                </ol>
            </nav>
        </div>
        <div></div>
        <div class="d-flex my-xl-auto right-content align-items-center flex-wrap">
                <div class="live-time-container head-icons">
                    <span class="live-time-icon me-2"><i class="fa-thin fa-clock"></i></span>
                    <div class="live-time"></div>
                </div>
            <div class="ms-2 head-icons">
                <a href="javascript:void(0);" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-original-title="Collapse" id="collapse-header"><i class="ti ti-chevrons-up"></i></a>
            </div>
        </div>
    </div>
    <div class="col-xl-12">
        {{--************************************************************************************************
        *                                                                                                  *
        *                             >>> MODIFY THIS SECTION (START) <<<                                  *
        *                                                                                                  *
        ************************************************************************************************--}}
        <div class="d-flex flex-column align-items-center justify-content-center text-center w-100" style="height:calc(100vh - 200px) !important;">
            <img src="{{ asset('errors/empty.svg') }}" alt="Empty Page" class="img-fluid mb-2 w-25">
            <h1 class="h3 mb-2 fw-bold">Just a Display Page</h1>
            <p class="text-muted mb-2" style="max-width: 600px;">
                This page is intentionally left empty and serves only as a display case or placeholder.<br>
                There's no content here to interact with right now.
            </p>
            <p class="text-muted" style="max-width: 600px;">
                You can explore other sections of the application to find working features and full content.
            </p>
            <div class="d-flex flex-wrap justify-content-center gap-3 mt-2">
                <a href="{{ url()->previous() }}" class="btn btn-outline-secondary rounded-pill">Go Back</a>
                <a href="{{ url('/dashboard') }}" class="btn btn-primary rounded-pill">Explore Dashboard</a>
            </div>
        </div>
        {{--************************************************************************************************
        *                                                                                                  *
        *                             >>> MODIFY THIS SECTION (END) <<<                                    *
        *                                                                                                  *
        ************************************************************************************************--}}
    </div>
</div>
@endsection
BLADE;
    }
    /**
     * Builds the breadcrumb HTML for the Blade template.
     *
     * @param string $type The type of entity (module, section, item)
     * @param \stdClass $record The record data
     * @return string The breadcrumb HTML
     */
    protected function buildBreadcrumb(string $type, \stdClass $record): string
    {
        $segments = [];
        $moduleSlug = Str::kebab($record->module);
        $sectionSlug = isset($record->section) ? Str::kebab($record->section) : null;
        $itemSlug = isset($record->item) ? Str::kebab($record->item) : null;
        // Home breadcrumb (always included)
        $segments[] = '<li class="breadcrumb-item"><a href="{{ url(\'/dashboard\') }}"><i class="ti ti-smart-home"></i></a></li>';
        // Module breadcrumb
        if (!empty($record->module)) {
            $isActive = $type === 'module' ? 'active" aria-current="page' : '';
            $url = $type === 'module' ? '#' : "{{ url('/{$moduleSlug}') }}";
            $segments[] = "<li class=\"breadcrumb-item {$isActive}\"><a href=\"{$url}\">" . Str::title($record->module) . "</a></li>";
        }
        // Section breadcrumb
        if (!empty($record->section) && in_array($type, ['section', 'item'])) {
            $isActive = $type === 'section' ? 'active" aria-current="page' : '';
            $url = $type === 'section' ? '#' : "{{ url('/{$moduleSlug}/{$sectionSlug}') }}";
            $segments[] = "<li class=\"breadcrumb-item {$isActive}\"><a href=\"{$url}\">" . Str::title($record->section) . "</a></li>";
        }
        // Item breadcrumb
        if (!empty($record->item) && $type === 'item') {
            $segments[] = "<li class=\"breadcrumb-item active\" aria-current=\"page\"><a href=\"#\">" . Str::title($record->item) . "</a></li>";
        }
        return implode("\n                    ", $segments);
    }
}
