<?php
namespace App\Http\Controllers\System\Central\QueryNest;
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};
/**
 * Controller for rendering the view form for QueryNest entities.
 */
class ViewCtrl extends Controller
{
    /**
     * 
     * 
     * 
     * Renders a popup form for viewing QueryNest entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
     protected $excludedColumns = ['id', 'unique_id', 'content', 'password', 'deleted_at', 'deleted_on'];
     
    public function index(Request $request, array $params): JsonResponse
    {
        try {
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.', 400);
            }
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key']) || !isset($reqSet['act']) || !isset($reqSet['id'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.', 400);
            }
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => [$reqSet['act'] => $reqSet['id']]]);
            $data = $result['data'][0] ?? null;
            if (!$data) {
                return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
            }
            $popup = [];
            $title = 'View Form Loaded';
            $allowDefault = true;
            $message = 'View form loaded successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                case 'QueryNest_entities':
                    $popup = [
                        'type' => 'modal',
                        'size' => 'lg',
                        'position' => 'center',
                        'label' => 'View QueryNest Entity',
                        'form' => 'builder',
                        'labelType' => 'above',
                        'content' => '
                            <div class="mb-3"><label class="font-bold">Name:</label> <input type="text" name="name" value="' . htmlspecialchars($data->name) . '" readonly class="form-control"></div>
                            <div class="mb-3"><label class="font-bold">Type:</label> <input type="text" name="type" value="' . htmlspecialchars($data->type) . '" readonly class="form-control"></div>
                            <div class="mb-3"><label class="font-bold">Status:</label> <input type="text" name="status" value="' . htmlspecialchars($data->status) . '" readonly class="form-control"></div>
                        ',
                        'button' => 'Close',
                        'button_class' => 'btn btn-secondary',
                        'footer' => true,
                        'header' => true
                    ];
                    $title = 'View Entity Form';
                    $message = 'QueryNest entity view form loaded successfully.';
                    break;

                 case 'central_unique_unq_tables':

    try {
        if (empty($data['table_id'])) {
            throw new \Exception("Table ID is required.");
        }

        // Get headers JSON from DB
        $record = \DB::table('unique.unq_tables')
            ->where('table_id', $data['table_id'])
            ->select('headers')
            ->first();

        if (!$record || empty($record->headers)) {
            throw new \Exception("No headers found for table_id: " . $data['table_id']);
        }

        // Decode JSON to array
        $headersArray = json_decode($record->headers, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception("Invalid JSON in headers column.");
        }

        // HTML table formatting
        $formattedOutput = '<table class="table table-bordered table-sm"><thead><tr>
            <th>Column Name</th>
            <th>Type</th>
            <th>Nullable</th>
            <th>Default Value</th>
        </tr></thead><tbody>';

        // Loop through each column metadata
        foreach ($headersArray as $columnMeta) {
            $columnName = $columnMeta['name'] ?? 'Unnamed';
            $type = $columnMeta['type'] ?? 'unknown';

            // ✅ FIXED Nullable Logic
            $nullableFlag = $columnMeta['validation'][0] ?? 1;
            $nullable = ($nullableFlag == 0) ? 'Yes' : 'No';

            // ✅ FIXED Default Logic
            if (!array_key_exists('default', $columnMeta)) {
                $defaultValue = '<i class="text-muted">Not set</i>';
            } elseif (is_null($columnMeta['default'])) {
                $defaultValue = '<span class="text-warning">null</span>';
            } elseif (strtolower((string)$columnMeta['default']) === 'none') {
                $defaultValue = '<span class="text-danger">none</span>';
            } else {
                $defaultValue = htmlspecialchars((string) $columnMeta['default']);
            }

            $formattedOutput .= '<tr>
                <td>' . htmlspecialchars($columnName) . '</td>
                <td>' . htmlspecialchars($type) . '</td>
                <td>' . htmlspecialchars($nullable) . '</td>
                <td>' . $defaultValue . '</td>
            </tr>';
        }

        $formattedOutput .= '</tbody></table>';

        // Final popup configuration
        $popup = [
            'type' => 'modal',
            'size' => 'lg',
            'position' => 'center',
            'label' => 'Table Columns & Types',
            'form' => 'builder',
            'labelType' => 'above',
            'content' => '
                <div class="mb-3"><label class="font-bold">Columns Overview:</label>
                    <div class="form-control" style="height:auto; min-height:100px;">' . $formattedOutput . '</div>
                </div>
            ',
            'button_class' => 'd-none',
            'footer' => true,
            'header' => true
        ];

        $title = 'View Columns';
        $message = 'Successfully loaded column metadata.';

    } catch (\Exception $e) {

        $popup = [
            'type' => 'modal',
            'size' => 'sm',
            'position' => 'center',
            'label' => 'Error',
            'content' => '<div class="text-danger">' . htmlspecialchars($e->getMessage()) . '</div>',
            'button_class' => 'btn btn-danger',
            'footer' => true,
            'header' => true
        ];

        $title = 'Error';
        $message = 'Failed to load columns: ' . $e->getMessage();
    }
    break;


                default:
                    $detailsHtml = '';
                    if ($allowDefault) {
                        $excludedColumns = property_exists($this, 'excludedColumns') ? $this->excludedColumns : [];
                        $filteredRecord = array_diff_key((array) $data, array_flip($excludedColumns));
                        $detailsHtml = '<div class="table-responsive"><table class="table table-sm table-borderless table-striped table-hover mb-0"><thead><tr class="bg-light"><th>Field</th><th>Value</th></tr></thead><tbody>';
                        if (!empty($filteredRecord)) {
                            foreach ($filteredRecord as $key => $value) {
                                $detailsHtml .= '<tr><td>' . htmlspecialchars(ucwords(str_replace('_', ' ', $key))) . '</td><td><b>' . htmlspecialchars($value ?? '') . '</b></td></tr>';
                            }
                        } else {
                            $detailsHtml .= '<tr><td colspan="2">No displayable details available</td></tr>';
                        }
                        $detailsHtml .= '</tbody></table></div>';
                    } else {
                        $detailsHtml = '<div class="d-flex flex-column align-items-center justify-content-center text-center w-100 h-100 p-3"><img src="' . asset('errors/empty.svg') . '" alt="No Details Available" class="img-fluid mb-2" style="max-width: 150px;"><h3 class="h5 mb-2 fw-bold">No Details Available</h3><p class="text-muted mb-2" style="max-width: 400px;">No displayable details are available for this record.</p><div class="d-flex flex-wrap justify-content-center gap-2 mt-2"><button type="button" class="btn btn-outline-primary btn-sm rounded-pill" data-bs-dismiss="offcanvas">View Another Entry</button></div></div>';
                    }
                    $popup = ['type' => 'offcanvas', 'size' => '', 'position' => 'end', 'label' => 'Record Details', 'form' => 'builder', 'labelType' => 'above', 'content' => $detailsHtml, 'button' => 'View', 'button_class' => 'd-none'];
                    $title = 'View Record';
                    $message = 'Record details loaded successfully.';
            }
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/
            return response()->json([
                'token' => $token,
                'type' => $popup['type'],
                'size' => $popup['size'],
                'position' => $popup['position'],
                'label' => $popup['label'],
                'content' => $popup['content'],
                'script' => $popup['script'] ?? '',
                'button_class' => $popup['button_class'] ?? '',
                'button' => $popup['button'] ?? '',
                'footer' => $popup['footer'] ?? '',
                'header' => $popup['header'] ?? '',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true,
                'title' => $title,
                'message' => $message
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}