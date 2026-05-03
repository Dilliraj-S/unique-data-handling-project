<?php
namespace App\Http\Controllers\System\Central\Filters;
use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config,DB};
/**
 * Controller for rendering the view form for Filters entities.
 */
class ViewCtrl extends Controller
{
    /**
     * Renders a popup form for viewing Filters entities.
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
            $allowDefault = true;
            $message = 'View form loaded successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/
            switch ($reqSet['key']) {
                        //     case 'central_sun_master_leads':
                        //  Developer::info(message: $reqSet['id']);
                        // // Get all sender logs (from campaign logs) for this email
                        // $senders = DB::table('pluto.email_campaign_logs')
                        //     ->where('to_email', $reqSet['id'])
                        //     ->orderByDesc('sent_at')
                        //     ->get();

                        // if ($senders->isEmpty()) {
                        //     return ResponseHelper::moduleError('Not Found', 'No sender logs found for this email.', 404);
                        // }

                        // // Start accordion wrapper
                        // $content = '<div class="accordion" id="emailAccordion">';

                        // foreach ($senders as $index => $sender) {
                        //     $receivers = DB::table(table: 'pluto.emails')
                        //         ->where('in_reply_to', $sender->message_id)
                        //         ->get();

                        //     $collapseId = 'collapseSender' . $index;

                        //     $content .= '
                        //     <div class="accordion-item mb-2">
                        //         <h2 class="accordion-header" id="heading' . $index . '">
                        //             <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#' . $collapseId . '" aria-expanded="false" aria-controls="' . $collapseId . '">
                        //                 <div>
                        //                     <strong>From:</strong> ' . htmlspecialchars($sender->from_email) . ' &nbsp; 
                        //                     <strong>To:</strong> ' . htmlspecialchars($sender->to_email) . ' &nbsp; 
                        //                     <strong>Sent:</strong> ' . htmlspecialchars($sender->sent_at) . ' &nbsp; 
                        //                     <strong>Status:</strong> ' . htmlspecialchars($sender->status) . '
                        //                 </div>
                        //             </button>
                        //         </h2>
                        //         <div id="' . $collapseId . '" class="accordion-collapse collapse" aria-labelledby="heading' . $index . '" data-bs-parent="#emailAccordion">
                        //             <div class="accordion-body bg-light">
                        //                 <div class="mb-3"><strong>Error Message:</strong> ' . ($sender->error_message ? htmlspecialchars($sender->error_message) : '<em>None</em>') . '</div>
                        //                 <div class="mb-3"><strong>Retry Attempts:</strong> ' . htmlspecialchars($sender->retry_attempts) . '</div>';

                        //     if ($receivers->isEmpty()) {
                        //         $content .= '<div class="text-muted"><em>No replies found.</em></div>';
                        //     } else {
                        //         $content .= '<div class="border-top pt-3"><h6 class="text-success">Receiver Replies:</h6>';
                        //         foreach ($receivers as $receiver) {
                        //             $content .= '
                        //                 <div class="border rounded bg-white p-3 mb-3">
                        //                     <div><strong>From:</strong> ' . htmlspecialchars($receiver->from) . '</div>
                        //                     <div><strong>To (Account Email):</strong> ' . htmlspecialchars($receiver->account_email) . '</div>
                        //                     <div><strong>Subject:</strong> ' . htmlspecialchars($receiver->subject) . '</div>
                        //                     <div><strong>Received At:</strong> ' . htmlspecialchars($receiver->received_at) . '</div>
                        //                     <div class="email-body bg-light border p-2 mt-2" style="max-height: 120px; overflow: auto;">
                        //                         ' . nl2br(htmlspecialchars(strip_tags($receiver->body))) . '
                        //                     </div>
                        //                 </div>';
                        //         }
                        //         $content .= '</div>';
                        //     }

                        //     $content .= '</div> <!-- accordion-body -->
                        //         </div> <!-- accordion-collapse -->
                        //     </div>'; // accordion-item
                        // }

                        // $content .= '</div>'; // accordion

                        // $popup = [
                        //     'type' => 'modal',
                        //     'size' => 'm',
                        //     'position' => 'center',
                        //     'label' => 'Email Logs (Thread View)',
                        //     'form' => 'builder',
                        //     'labelType' => 'above',
                        //     'content' => $content,
                            
                        //     'button_class' => 'btn btn-secondary',
                        //     'footer' => true,
                        //     'header' => true
                        // ];

                        // $title = 'View Email Logs';
                        // $message = 'Email communication thread loaded successfully.';
                        // break;
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