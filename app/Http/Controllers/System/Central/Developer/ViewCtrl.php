<?php
namespace App\Http\Controllers\System\Central\Developer;
use App\Facades\{Data, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};
/**
 * Controller for rendering the view form for Developer entities.
 */
class ViewCtrl extends Controller
{
    /**
     * Columns to exclude from the details table globally.
     *
     * @var array
     */
    protected $excludedColumns = ['id', 'unique_id', 'content', 'password', 'deleted_at', 'deleted_on'];
    /**
     * Renders a popup form for viewing Developer entities.
     *
     * @param Request $request HTTP request object
     * @param array $params Route parameters with token
     * @return JsonResponse Form configuration or error message
     */
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
            $message = 'View form loaded successfully.';
            $allowDefault = true;
            $detailsHtml = '';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            
            switch ($reqSet['key']) {
                case 'Developer_entities':
                    $popup = [
                        'type' => 'modal',
                        'size' => 'lg',
                        'position' => 'center',
                        'label' => 'View Developer Entity',
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
                    $message = 'Developer entity view form loaded successfully.';
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
            
            return response()->json(['token' => $token, 'type' => $popup['type'], 'size' => $popup['size'], 'position' => $popup['position'], 'label' => $popup['label'], 'content' => $popup['content'], 'script' => $popup['script'] ?? '', 'button_class' => $popup['button_class'] ?? 'd-none', 'button' => $popup['button'] ?? '', 'footer' => $popup['footer'] ?? '', 'header' => $popup['header'] ?? '', 'validate' => $reqSet['validate'] ?? '0', 'status' => true, 'title' => $title, 'message' => $message]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.', 500);
        }
    }
}