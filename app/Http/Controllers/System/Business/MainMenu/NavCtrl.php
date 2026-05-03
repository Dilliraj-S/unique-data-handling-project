<?php

namespace App\Http\Controllers\System\Business\MainMenu;

use App\Http\Controllers\Controller;
use Illuminate\Http\{Request, Response};
use Illuminate\Support\Facades\{Auth, Cache, Crypt, DB, Log, Session, Storage, Validator, View};
/* Exceptions */
use Exception;
use App\Exceptions\ExceptionHelper;
/* Helpers */
use App\Http\Helpers\{
    UserHelper,
    SelectHelper,
    SkeletonHelper
};
/* Models */
use App\Models\User;

/**
 * Navigation controller for supreme Dashboard module
 * Handles rendering of all dashboard-related views
 */
class NavCtrl extends Controller
{
    /**
     * Renders views for Dashboard module based on route parameters
     *
     * @param Request $request
     * @param array $params Route parameters (module, section, item, token)
     * @return \Illuminate\View\View|\Illuminate\Http\JsonResponse
     */
    public function index(Request $request, array $params)
    {
        try {
            $baseView = 'system.business.main-menu';
            $module = $params['module'] ?? 'main-menu';
            $section = $params['section'] ?? null;
            $item = $params['item'] ?? null;
            $token = $params['token'] ?? null;

            // Build view path
            $viewPath = $baseView;
            if ($section) {
                $viewPath .= ".{$section}";
                if ($item) {
                    $viewPath .= ".{$item}";
                }
            } else {
                $viewPath .= '.index';
            }

            // Extract view name without base path
            $viewName = str_replace("{$baseView}.", '', $viewPath);

            // Base data
            $data = [
                'status' => true,
                'module' => $module,
                'section' => $section,
                'item' => $item,
                'token' => $token,
            ];

            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($viewName) {
                case 'index':
                    $data['dashboard_list'] = [];
                    break;
                default:
                    $data['default_message'] = 'Dashboard section loaded';
                    break;
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                              >>> MODIFY THIS SECTION (END) <<<                                   *
             *                                                                                                  *
             ****************************************************************************************************/

            if (View::exists($viewPath)) {
                return view($viewPath, $data);
            }

            return $this->handleError($request, 'Page not found.', Response::HTTP_NOT_FOUND);
        } catch (Exception $e) {
            Log::error('Error in NavCtrl.', ['error' => $e->getMessage(), 'path' => $request->path()]);
            return $this->handleError($request, config('developer.mode') ? $e->getMessage() : 'Internal server error.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Handles errors with developer mode support.
     *
     * @param Request $request
     * @param string $message
     * @param int $statusCode
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\Response
     */
    private function handleError(Request $request, string $message, int $statusCode)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => $message,
            ], $statusCode);
        }

        // Render error view based on status code
        $errorView = "errors.{$statusCode}";
        if (View::exists($errorView)) {
            return response()->view($errorView, ['error' => $message], $statusCode);
        }

        // Fallback to generic error view
        return response()->view('errors.generic', ['error' => $message, 'status' => $statusCode], $statusCode);
    }
}
