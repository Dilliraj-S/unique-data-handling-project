<?php
namespace App\Http\Controllers\System\Actions;

use App\Http\Controllers\Controller;
use App\Facades\{CentralDB, Data, Developer, Skeleton};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log, Schema};

/**
 * Controller for handling single and multiple record deletions with custom Bootstrap 5 accordion UI.
 */
class DeleteCtrl extends Controller
{
    /**
     * Columns to exclude from the details table globally.
     *
     * @var array
     */
    protected $excludedColumns = [
        'id',
        'unique_id',
        'password',
        'created_by',
        'updated_by',
        'deleted_at',
        'deleted_on',
    ];

    /**
     * Renders a popup to confirm single record deletion.
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters with token.
     * @return JsonResponse Custom UI configuration or error message.
     */
    public function single(Request $request, array $params = []): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token', '');
            if (empty($token)) {
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
            }

            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['system']) || !isset($reqSet['table']) || !isset($reqSet['id'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid or missing required data.']);
            }

            // Fetch record details
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => ['id' => $reqSet['id']]]);
            if (!$result['status'] || empty($result['data'])) {
                return response()->json(['status' => false, 'title' => 'Record Not Found', 'message' => 'The requested record was not found.']);
            }
            $record = $result['data'][0] ?? null;

            // Generate details table
            $detailsHtml = '<table class="table table-sm table-bordered mb-0">';
            if ($record) {
                $filteredRecord = array_diff_key((array)$record, array_flip($this->excludedColumns));
                if (empty($filteredRecord)) {
                    $detailsHtml .= '<tr><td colspan="2">No displayable details available</td></tr>';
                } else {
                    foreach ($filteredRecord as $key => $value) {
                        $detailsHtml .= sprintf('<tr><td>%s</td><td><b>%s</b></td></tr>', htmlspecialchars(ucwords(str_replace('_', ' ', $key))), htmlspecialchars($value));
                    }
                }
            } else {
                $detailsHtml .= '<tr><td colspan="2">No details available</td></tr>';
            }
            $detailsHtml .= '</table>';

            // Check table schema for deletion columns
            $hasDeletedOn = Schema::connection($reqSet['system'])->hasColumn($reqSet['table'], 'deleted_on');


            // Build checkbox HTML conditionally
            $checkboxHtml = '';
            if ($hasDeletedOn) {
                $checkboxHtml .= '<div class="mb-3 d-flex justify-content-center align-items-center">'.
                                '<div class="form-check">' .
                                '<input class="form-check-input" type="checkbox" name="delete_type" value="1" id="perm-delete-' . $token . '">' .
                                '<label class="form-check-label ms-2" for="perm-delete-' . $token . '">Permanent Delete</label>' .
                                '</div>'.
                                '</div>';
            }

            // Define custom content with Bootstrap 5 accordion
            $content = '<div class="alert alert-transparent mb-0" role="alert">' .
                       '<div class="accordion" id="deleteAccordion-' . $token . '">' .
                       '<div class="accordion-item border-0">' .
                       '<h2 class="accordion-header py-2 my-0">' .
                       '<button class="accordion-button bg-transparent collapsed py-2 text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-' . $token . '" aria-expanded="false" aria-controls="collapse-' . $token . '">' .
                       '<h6 class="m-0">Are you sure you want to delete this record?</h6>' .
                       '</button>' .
                       '</h2>' .
                       '<div id="collapse-' . $token . '" class="accordion-collapse collapse" data-bs-parent="#deleteAccordion-' . $token . '">' .
                       '<div class="accordion-body p-2">' .
                       '<input type="hidden" name="delete_token" value="' . $token . '">' .
                       $checkboxHtml .
                       $detailsHtml .
                       '<div class="mt-2"><i class="sf-9"><span class="text-danger">Note: </span>Permanent deletion schedules the data for removal after 30 days. Temporary deleted data can be retrieved before then.</i></div>'.
                       '</div>' .
                       '</div>' .
                       '</div>' .
                       '</div>' .
                       '</div>';

            // Generate response
            return response()->json([
                'token' => $token,
                'type' => 'modal',
                'size' => 'modal-md',
                'position' => 'end',
                'label' => '<i class="fa-regular fa-trash-can me-1"></i> Delete Record',
                'content' => $content,
                'script' => '',
                'button_class' => 'btn-danger',
                'button' => 'Confirm Delete',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true
            ]);
        } catch (Exception $e) {
            Developer::error('DeleteCtrl@single: Error rendering delete UI', ['token' => $token ?? 'undefined', 'error' => $e->getMessage()]);
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.']);
        }
    }

    /**
     * Processes the confirmed single record deletion.
     *
     * @param Request $request HTTP request object.
     * @return JsonResponse Success or error message.
     */
    public function delete_single(Request $request): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $request->input('delete_token', '');
            if (empty($token)) {
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
            }

            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['table']) || !isset($reqSet['id'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid or missing required data.']);
            }

            // Determine deletion type
            $deleteType = $request->input('delete_type', 0);
            // Perform deletion using Data facade
            $updateData = [
                'deleted_at' => $deleteType ? now()->addDays(30) : now(),
                'updated_by' => Skeleton::getAuthenticatedUser()->user_id
            ];
            $result = Data::update($reqSet['system'], $reqSet['table'], $updateData, ['id' => $reqSet['id']]);
            $affected = $result['status'] ? ($result['data']['affected_rows'] ?? 0) : 0;

            return response()->json([
                'status' => $affected > 0,
                'token' => $reqSet['token'],
                'reload_table' => true,
                'title' => $affected > 0 ? 'Success' : 'Failed',
                'message' => $affected > 0 ? ($deleteType ? 'Record permanently deleted.' : 'Record temporarily deleted.') : 'No changes were made.',
            ]);
        } catch (Exception $e) {
            
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while deleting the record.']);
        }
    }

    /**
     * Renders a popup to confirm multiple record deletion.
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters with token.
     * @return JsonResponse Custom UI configuration or error message.
     */
    public function multiple(Request $request, array $params = []): JsonResponse
    {
        try {
            // Extract and validate token
            $token = $params['token'] ?? $request->input('skeleton_token', '');
            if (empty($token)) {
                return response()->json(['status' => false, 'title' => 'Token Missing', 'message' => 'No token was provided.']);
            }

            // Resolve token to configuration
            $reqSet = Skeleton::resolveToken($token);
            $reqSet['param']=$request->input('id');
            if (!isset($reqSet['system']) || !isset($reqSet['table']) || !isset($reqSet['param'])) {
                return response()->json(['status' => false, 'title' => 'Invalid Token', 'message' => 'The provided token is invalid or missing required data.']);
            }

            // Parse IDs
            $ids = array_filter(explode('@', $reqSet['param']));
            if (empty($ids)) {
                return response()->json(['status' => false, 'title' => 'Invalid Data', 'message' => 'No records specified for deletion.']);
            }
            // Fetch records details
            $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => ['id'=>$ids]]);
            if (!$result['status']) {
                return response()->json(['status' => false, 'title' => 'Records Not Found', 'message' => $result['message'] ?: 'The requested records were not found.']);
            }
            $records = $result['data'];

            // Generate details table
            $detailsHtml = '<table class="table table-sm table-bordered mb-0">';
            if (!empty($records)) {
                foreach ($records as $index => $record) {
                    $filteredRecord = array_diff_key((array)$record, array_flip($this->excludedColumns));
                    $detailsHtml .= sprintf('<tr><td>Record %d</td><td>%s</td></tr>', $index + 1, htmlspecialchars(json_encode($filteredRecord)));
                }
            } else {
                $detailsHtml .= '<tr><td colspan="2">No details available</td></tr>';
            }
            $detailsHtml .= '</table>';

            // Check table schema for deletion columns
            $schemaColumns = Data::getCachedSchemaColumns($reqSet['table']);
            $hasDeletedAt = in_array('deleted_at', $schemaColumns);
            $hasDeletedOn = in_array('deleted_on', $schemaColumns);

            // Log schema check for debugging
            if (Config::get('skeleton.developer_mode')) {
                Developer::debug('DeleteCtrl@multiple: Schema check', [
                    'table' => $reqSet['table'],
                    'deleted_at' => $hasDeletedAt,
                    'deleted_on' => $hasDeletedOn
                ]);
            }

            // Build checkbox HTML conditionally
            $checkboxHtml = '';
            if ($hasDeletedAt || $hasDeletedOn) {
                $checkboxHtml .= '<div class="mb-3 d-flex justify-content-between align-items-center">';
                if ($hasDeletedAt) {
                    $checkboxHtml .= '<div class="form-check">' .
                                     '<input class="form-check-input" type="checkbox" name="delete_type[]" value="temporary" id="temp-delete-{{ $token }}">' .
                                     '<label class="form-check-label" for="temp-delete-' . $token . '">Temporary Delete</label>' .
                                     '</div>';
                }
                $checkboxHtml .= '</div>';
            } else {
                $checkboxHtml .= '<div class="alert alert-info mb-3">No deletion options available for this table.</div>';
            }

            // Define custom content with Bootstrap 5 accordion
            $content = '<div class="mb-0">' .
                       '<div class="accordion" id="deleteAccordion-' . $token . '">' .
                       '<div class="accordion-item border-0">' .
                       '<h2 class="accordion-header py-2">' .
                       '<button class="accordion-button text-dark collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-' . $token . '" aria-expanded="false" aria-controls="collapse-' . $token . '">' .
                       'Are you sure you want to delete ' . ($records ? count($records) : 0) . ' record(s)?' .
                       '</button>' .
                       '</h2>' .
                       '<div id="collapse-' . $token . '" class="accordion-collapse collapse" data-bs-parent="#deleteAccordion-' . $token . '">' .
                       '<div class="accordion-body p-3">' .
                       '<input type="hidden" name="delete_token" value="' . $token . '">' .
                       '<input type="hidden" name="ids" value="' . $reqSet['param'] . '">' .
                       $checkboxHtml .
                       $detailsHtml .
                       '</div>' .
                       '</div>' .
                       '</div>' .
                       '</div>' .
                       '</div>';

            // Generate response
            return response()->json([
                'token' => $token,
                'type' => 'modal',
                'size' => 'modal-md',
                'position' => 'end',
                'label' => '<i class="fa-regular fa-trash-can me-1"></i> Delete Records',
                'content' => $content,
                'script' => '',
                'button_class' => 'btn-danger',
                'button' => 'Confirm Delete',
                'validate' => $reqSet['validate'] ?? '0',
                'status' => true
            ]);
        } catch (Exception $e) {
            Developer::error('DeleteCtrl@multiple: Error rendering delete UI', ['token' => $token ?? 'undefined', 'error' => $e->getMessage()]);
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while processing the request.']);
        }
    }

    /**
     * Processes the confirmed multiple record deletion.
     *
     * @param Request $request HTTP request object.
     * @return JsonResponse Success or error message.
     */
    public function confirmed_multiple(Request $request): JsonResponse
    {
        try {
            $token = $request->input('delete_token', '');
            if (empty($token)) {
                return response()->json([
                    'status' => false,
                    'title' => 'Token Missing',
                    'message' => 'No token was provided.'
                ]);
            }

            // Resolve config from token
            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['table'], $reqSet['token'])) {
                return response()->json([
                    'status' => false,
                    'title' => 'Invalid Token',
                    'message' => 'The provided token is invalid or missing required data.'
                ]);
            }

            // Parse and sanitize IDs
            $ids = array_filter(explode('@', $request->input('ids', '')));
            if (empty($ids)) {
                return response()->json([
                    'status' => false,
                    'title' => 'Invalid Data',
                    'message' => 'No records specified for deletion.'
                ]);
            }

            $deleteType = (array) $request->input('delete_type', []);
            $isPermanent = empty($deleteType); // If delete_type is empty, perform permanent delete

            Developer::info($isPermanent);

            $affected = $isPermanent
                ? Data::delete($reqSet['system'], $reqSet['table'], ['id' => $ids], $reqSet['token'])
                : Data::update(
                    $reqSet['system'],
                    $reqSet['table'],
                    [
                        'deleted_at' => now(),
                        'updated_by' => Skeleton::getAuthenticatedUser()->user_id
                    ],
                    ['id' => $ids]
                );
            // Log operation
            if (Config::get('skeleton.developer_mode')) {
                Developer::debug('DeleteCtrl@confirmed_multiple: Records deletion', [
                    'table'     => $reqSet['table'],
                    'ids'       => $ids,
                    'permanent' => $isPermanent,
                    'affected'  => $affected
                ]);
            }

            // Response
            return response()->json([
                'status'       => $affected > 0,
                'token'        => $reqSet['token'],
                'reload_table' => true,
                'title'        => $affected > 0 ? 'Success' : 'Failed',
                'content'      => $affected > 0
                    ? count($ids) . ' record(s) ' . ($isPermanent ? 'permanently' : 'temporarily') . ' deleted.'
                    : 'No changes were made.',
                'form'         => 'custom'
            ]);
        } catch (Exception $e) {
            Developer::error('DeleteCtrl@confirmed_multiple: Error processing deletion', [
                'token' => $token ?? 'undefined',
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'status'  => false,
                'title'   => 'Error',
                'message' => Config::get('skeleton.developer_mode')
                    ? $e->getMessage()
                    : 'An error occurred while deleting the records.'
            ]);
        }
    }

}