<?php

namespace App\Http\Controllers\System\Central\QueryChain;

use App\Facades\{Data, Developer, Random, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\{
    ResponseHelper,
    ProcessFlowHelper
};
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log};

/**
 * Controller for rendering the view form for QueryChain entities.
 */
class ViewCtrl extends Controller
{
    /**
     * Renders a popup form for viewing QueryChain entities.
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
            // Some popups (like process logs) do not require a base record. Skip lookup for those keys.
            $skipRecordLookupKeys = [
                'central_unique_process_logs',
            ];
            if (!in_array($reqSet['key'], $skipRecordLookupKeys, true)) {
                $result = Data::get($reqSet['system'], $reqSet['table'], ['where' => [$reqSet['act'] => $reqSet['id']]]);
                $data = $result['data'][0] ?? null;
                if (!$data) {
                    return ResponseHelper::moduleError('Record Not Found', 'The requested record was not found.', 404);
                }
            } else {
                // Provide an empty placeholder to keep downstream logic simple
                $data = (object) [];
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
                case 'QueryChain_entities':
                    $popup = [
                        'type' => 'modal',
                        'size' => 'lg',
                        'position' => 'center',
                        'label' => 'View QueryChain Entity',
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
                    $message = 'QueryChain entity view form loaded successfully.';
                    break;
                case 'central_unique_workflows':
                    $popup = [
                        'type' => 'modal',
                        'size' => 'md',
                        'position' => 'center',
                        'label' => 'Add Workflow Configuration',
                        'form' => 'builder',
                        'labelType' => 'above',
                        'content' => '
                                <div class="text-center">
                                    <img src="' . asset('errors\503.svg') . '" alt="Placeholder Image" class="img-fluid mb-3" style="max-width: 300px;">
                                    <h5 class="font-bold text-muted">Yet To be Updated!</h5>
                                </div>',
                        'button' => 'Save Workflow',
                        'button_class' => 'btn btn-primary disabled',
                        'footer' => true,
                        'header' => true
                    ];
                    break;
                case 'central_unique_process_logs':
                    $initialLogs = ProcessFlowHelper::fetchLogs();
                    usort($initialLogs, fn($a, $b) => strtotime($b['created_at']) - strtotime($a['created_at']));
                    $initialProcessId = $initialLogs[0]['process_id'] ?? '';
                    $initialOptions = '';
                    foreach ($initialLogs as $log) {
                        $selected = $log['process_id'] === $initialProcessId ? ' selected' : '';
                        $initialOptions .= '<option value="' . $log['process_id'] . '"' . $selected . '>' . htmlspecialchars($log['process_name']) . '</option>';
                    }
                    $initialJson = json_encode($initialLogs);
                    $content = '<div id="processLogsContainer"></div>';
                    $popup = [
                        'type' => 'offcanvas',
                        'size' => 'xl',
                        'position' => 'end',
                        'label' => 'Process Log Details',
                        'form' => 'builder',
                        'labelType' => 'above',
                        'content' => $content,
                        'footer' => 'hide',
                        'header' => true,
                        'script' => 'window.skeleton.select();
                            (function () {
                                function initProcessLogs(initialLogsJson, initialProcessId, initialOptions) {
                                    const content = `
                                        <div class="container-fluid py-3">
                                            <!-- Process selector dropdown only -->
                                            <div class="form-floating form-floating-outline mb-4">
                                                <select id="processSelector" class="form-select" data-select="dropdown">
                                                    ${initialOptions}
                                                </select>
                                                <label for="processSelector">Select a Process</label>
                                            </div>

                                            <div id="processDetails" style="max-height: 60vh; overflow-y: auto;"></div>
                                        </div>
                                    `;

                                    const container = document.getElementById("processLogsContainer");
                                    if (!container) return;
                                    container.innerHTML = content;

                                    const allLogs = JSON.parse(initialLogsJson);
                                    const selector = document.getElementById("processSelector");
                                    const detailsContainer = document.getElementById("processDetails");

                                    function createDownloadButton(url, label) {
                                        if (!url) return "";
                                        return `<a href="${url}" class="btn btn-sm btn-outline-primary me-2 mb-2" download target="_blank" rel="noopener">${label}</a>`;
                                    }

                                    function renderLog(processId) {
                                        const log = allLogs.find(l => l.process_id === processId);
                                        if (!log) return (detailsContainer.innerHTML = "");

                                        const inputBtn = createDownloadButton(log.input_url || log.input_location, "Download Input");
                                        const outputBtn = createDownloadButton(log.output_url || log.output_location, "Download Output");

                                        let html = `
                                            <div class="mb-4">
                                                <h5 class="fw-semibold">${log.process_name} (${log.process_id})</h5>
                                                <div class="d-flex flex-wrap gap-2 mb-2">
                                                    <span class="badge bg-${log.status === "completed" ? "success" : log.status === "failed" ? "danger" : "warning"}">${log.status.toUpperCase()}</span>
                                                    <span class="badge bg-info text-dark">${log.mode}</span>
                                                    <span class="badge bg-secondary">${log.created_by}</span>
                                                    <span class="badge bg-dark">${new Date(log.created_at).toLocaleString()}</span>
                                                </div>
                                                <div class="mb-3">
                                                    ${inputBtn}${outputBtn}
                                                </div>
                                            </div>
                                        `;

                                        if (log.process_mode === "masterflow" && log.trace_details.length > 1) {
                                            html += `<div class="d-flex flex-column gap-3">`;
                                            log.trace_details.forEach((trace, index) => {
                                                html += `
                                                    <div class="border-start border-3 border-primary ps-3">
                                                        <div class="fw-bold mb-1">Step ${index + 1}: ${trace.workflow}</div>
                                                        <div class="mb-1">Status: <span class="text-${trace.status === "completed" ? "success" : trace.status === "failed" ? "danger" : "warning"}">${trace.status}</span></div>
                                                        <div class="mb-1">${trace.details}</div>
                                                        <div class="small text-muted">Metrics: Total: ${trace.metrics.total}, Affected: ${trace.metrics.affected}, Rejected: ${trace.metrics.rejected}, Skipped: ${trace.metrics.skipped}</div>
                                                    </div>
                                                `;
                                            });
                                            html += `</div>`;
                                        } else if (log.trace_details.length) {
                                            const trace = log.trace_details[0];
                                            html += `
                                                <div class="card shadow-sm border">
                                                    <div class="card-body">
                                                        <h6 class="card-title fw-bold">${trace.workflow}</h6>
                                                        <p class="card-text mb-1"><strong>Status:</strong> <span class="text-${trace.status === "completed" ? "success" : trace.status === "failed" ? "danger" : "warning"}">${trace.status}</span></p>
                                                        <p class="card-text">${trace.details}</p>
                                                        <div class="small text-muted">Metrics: Total: ${trace.metrics.total}, Affected: ${trace.metrics.affected}, Rejected: ${trace.metrics.rejected}, Skipped: ${trace.metrics.skipped}</div>
                                                    </div>
                                                </div>
                                            `;
                                        }

                                        detailsContainer.innerHTML = html;
                                    }

                                    selector.addEventListener("change", function () {
                                        renderLog(this.value);
                                    });

                                    // Show most recent on top
                                    renderLog(initialProcessId);
                                }

                                initProcessLogs(' . json_encode($initialJson) . ', "' . $initialProcessId . '", ' . json_encode($initialOptions) . ');

                            })();'
                    ];

                    break;

                    // case 'central_unique_process_logs':
                    // //     $initialLogs = ProcessFlowHelper::fetchLogs();
                    // //     usort($initialLogs, fn($a, $b) => strtotime($b['created_at'] ?? '') <=> strtotime($a['created_at'] ?? ''));

                    // //     $initialProcessId = $initialLogs[0]['process_id'] ?? '';
                    // //     $initialOptions = '';
                    // //     foreach ($initialLogs as $log) {
                    // //         $selected = ($log['process_id'] ?? '') === $initialProcessId ? ' selected' : '';
                    // //         $name = htmlspecialchars($log['process_name'] ?? '');
                    // //         $pid = htmlspecialchars($log['process_id'] ?? '');
                    // //         $initialOptions .= '<option value="' . $pid . '"' . $selected . '>' . $name . '</option>';
                    // //     }

                    // //     // No hardcoded paths here. Resolve public base dynamically from config/env if applicable.
                    // //     // If your paths are already URLs or you don’t need stripping, keep it ''.
                    // //     // Example derivations (choose what fits your framework):
                    // //     // $publicBase = function_exists('public_path') ? public_path() : (getenv('APP_PUBLIC_BASE') ?: '');
                    // //     // If you want to expose a URL base instead of filesystem base, you can pass '' and store full URLs in logs.
                    // //     $publicBase = getenv('APP_PUBLIC_BASE') ?: ''; // keep empty if not needed

                    // //     $content = '<div id="processLogsContainer"></div>';

                    // //     $popup = [
                    // //         'type' => 'offcanvas',
                    // //         'size' => 'xl',
                    // //         'position' => 'end',
                    // //         'label' => 'Process Log Details',
                    // //         'form' => 'builder',
                    // //         'labelType' => 'above',
                    // //         'content' => $content,
                    // //         'footer' => 'hide',
                    // //         'header' => true,
                    // //         'script' => '
                    // //         window.skeleton.select();
                    // //         (function () {
                    // //             function initProcessLogs(initialLogsJson, initialProcessId, initialOptions, publicBase) {
                    // //                 const content = `
                    // //                     <div class="container-fluid py-3">
                    // //                         <div class="form-floating form-floating-outline mb-4">
                    // //                             <select id="processSelector" class="form-select" data-select="dropdown">
                    // //                                 ${initialOptions}
                    // //                             </select>
                    // //                             <label for="processSelector">Select a Process</label>
                    // //                         </div>
                    // //                         <div id="processDetails" style="max-height: 60vh; overflow-y: auto;"></div>
                    // //                     </div>
                    // //                 `;

                    // //                 const container = document.getElementById("processLogsContainer");
                    // //                 if (!container) return;
                    // //                 container.innerHTML = content;

                    // //                 const allLogs = JSON.parse(initialLogsJson);
                    // //                 const selector = document.getElementById("processSelector");
                    // //                 const detailsContainer = document.getElementById("processDetails");

                    // //                 // ---------------- Helpers (no hardcoded paths) ----------------

                    // //                 function isHttpUrl(p) {
                    // //                     if (!p || typeof p !== "string") return false;
                    // //                     try {
                    // //                         const u = new URL(p);
                    // //                         return u.protocol === "http:" || u.protocol === "https:";
                    // //                     } catch {
                    // //                         return false;
                    // //                     }
                    // //                 }

                    // //                 // Convert a path to href
                    // //                 // - If already http/https => return as-is
                    // //                 // - If base provided and path starts with base (case-insensitive) => strip base and ensure leading slash
                    // //                 // - Else => normalize slashes and ensure leading slash
                    // //                 function toWebPath(path, base) {
                    // //                     if (!path) return "";
                    // //                     if (isHttpUrl(path)) return path;

                    // //                     let p = String(path).replace(/\\\\/g, "/");
                    // //                     if (base) {
                    // //                         let b = String(base).replace(/\\\\/g, "/");
                    // //                         if (b.endsWith("/")) b = b.slice(0, -1);
                    // //                         if (p.toLowerCase().startsWith(b.toLowerCase())) {
                    // //                             p = p.slice(b.length);
                    // //                             if (!p.startsWith("/")) p = "/" + p;
                    // //                             return p;
                    // //                         }
                    // //                     }
                    // //                     if (!p.startsWith("/")) p = "/" + p;
                    // //                     return p;
                    // //                 }

                    // //                 function createDownloadButton(path, label) {
                    // //                     if (!path) return "";
                    // //                     const webPath = toWebPath(path, publicBase);
                    // //                     return `<a href="${webPath}" class="btn btn-sm btn-outline-primary me-2 mb-2" target="_blank" rel="noopener">${label}</a>`;
                    // //                 }

                    // //                 function statusColor(status) {
                    // //                     const s = String(status || "").toLowerCase();
                    // //                     if (s === "completed" || s === "success") return "success";
                    // //                     if (s === "failed" || s === "error") return "danger";
                    // //                     if (s === "running" || s === "in-progress" || s === "processing") return "info";
                    // //                     if (s === "pending" || s === "queued") return "warning";
                    // //                     return "secondary";
                    // //                 }

                    // //                 function renderMetrics(metrics) {
                    // //                     if (!metrics || typeof metrics !== "object") return "";
                    // //                     const parts = [];
                    // //                     const has = (key) => Object.prototype.hasOwnProperty.call(metrics, key);

                    // //                     if (has("total")) parts.push(`Total: ${metrics.total}`);
                    // //                     if (has("processed")) parts.push(`Processed: ${metrics.processed}`);
                    // //                     if (has("affected")) parts.push(`Affected: ${metrics.affected}`);
                    // //                     if (has("rejected")) parts.push(`Rejected: ${metrics.rejected}`);
                    // //                     if (has("skipped")) parts.push(`Skipped: ${metrics.skipped}`);

                    // //                     if (!parts.length) return "";
                    // //                     return `<div class="small text-muted">${parts.join(", ")}</div>`;
                    // //                 }

                    // //                 function renderFlowCards(traces) {
                    // //                     if (!Array.isArray(traces) || !traces.length) return "";
                    // //                     return `
                    // //                         <div class="row g-3">
                    // //                             ${traces.map((trace, idx) => {
                    // //                                 const statusCls = statusColor(trace.status);
                    // //                                 const metricsHtml = renderMetrics(trace.metrics);
                    // //                                 const title = trace.workflow ?? \`Step \${idx + 1}\`;
                    // //                                 const details = trace.details ?? "";
                    // //                                 return `
                    // //                                     <div class="col-12">
                    // //                                         <div class="card shadow-sm border-0">
                    // //                                             <div class="card-body">
                    // //                                                 <div class="d-flex align-items-start justify-content-between">
                    // //                                                     <div>
                    // //                                                         <h6 class="card-title fw-bold mb-1">\${title}</h6>
                    // //                                                         <div class="mb-2">
                    // //                                                             <span class="badge bg-\${statusCls}">\${String(trace.status || "unknown").toUpperCase()}</span>
                    // //                                                             <span class="badge bg-light text-dark ms-2">Step \${idx + 1}</span>
                    // //                                                         </div>
                    // //                                                     </div>
                    // //                                                 </div>
                    // //                                                 \${details ? `<p class="card-text mb-2">\${details}</p>` : ""}
                    // //                                                 \${metricsHtml}
                    // //                                             </div>
                    // //                                         </div>
                    // //                                     </div>
                    // //                                 `;
                    // //                             }).join("")}
                    // //                         </div>
                    // //                     `;
                    // //                 }

                    // //                 // ---------------- Renderer ----------------

                    // //                 function renderLog(processId) {
                    // //                     const log = allLogs.find(l => l.process_id === processId);
                    // //                     if (!log) {
                    // //                         detailsContainer.innerHTML = "";
                    // //                         return;
                    // //                     }

                    // //                     const inputBtn = createDownloadButton(log.input_location, "Download Input");
                    // //                     const outputBtn = createDownloadButton(log.output_location, "Download Output");

                    // //                     let html = `
                    // //                         <div class="mb-4">
                    // //                             <h5 class="fw-semibold">\${log.process_name || ""} (\${log.process_id || ""})</h5>
                    // //                             <div class="d-flex flex-wrap gap-2 mb-2">
                    // //                                 <span class="badge bg-\${statusColor(log.status)}">\${String(log.status || "").toUpperCase()}</span>
                    // //                                 \${log.mode ? `<span class="badge bg-info text-dark">\${log.mode}</span>` : ""}
                    // //                                 \${log.created_by ? `<span class="badge bg-secondary">\${log.created_by}</span>` : ""}
                    // //                                 \${log.created_at ? `<span class="badge bg-dark">\${new Date(log.created_at).toLocaleString()}</span>` : ""}
                    // //                             </div>
                    // //                             <div class="mb-3">
                    // //                                 \${inputBtn}\${outputBtn}
                    // //                             </div>
                    // //                         </div>
                    // //                     `;

                    // //                     const traces = Array.isArray(log.trace_details) ? log.trace_details : [];
                    // //                     const mode = String(log.process_mode || "").toLowerCase();

                    // //                     if (mode === "flow") {
                    // //                         html += renderFlowCards(traces);
                    // //                     } else if (mode === "masterflow" && traces.length > 1) {
                    // //                         html += `<div class="d-flex flex-column gap-3">`;
                    // //                         traces.forEach((trace, index) => {
                    // //                             html += `
                    // //                                 <div class="border-start border-3 border-primary ps-3">
                    // //                                     <div class="fw-bold mb-1">Step \${index + 1}: \${trace.workflow || ""}</div>
                    // //                                     <div class="mb-1">Status: <span class="text-\${statusColor(trace.status)}">\${trace.status || ""}</span></div>
                    // //                                     \${trace.details ? `<div class="mb-1">\${trace.details}</div>` : ""}
                    // //                                     \${renderMetrics(trace.metrics)}
                    // //                                 </div>
                    // //                             `;
                    // //                         });
                    // //                         html += `</div>`;
                    // //                     } else if (traces.length) {
                    // //                         const trace = traces[0];
                    // //                         html += `
                    // //                             <div class="card shadow-sm border-0">
                    // //                                 <div class="card-body">
                    // //                                     <h6 class="card-title fw-bold">\${trace.workflow || ""}</h6>
                    // //                                     <p class="card-text mb-1"><strong>Status:</strong> <span class="text-\${statusColor(trace.status)}">\${trace.status || ""}</span></p>
                    // //                                     \${trace.details ? `<p class="card-text">\${trace.details}</p>` : ""}
                    // //                                     \${renderMetrics(trace.metrics)}
                    // //                                 </div>
                    // //                             </div>
                    // //                         `;
                    // //                     }

                    // //                     detailsContainer.innerHTML = html;
                    // //                 }

                    // //                 selector.addEventListener("change", function () {
                    // //                     renderLog(this.value);
                    // //                 });

                    // //                 renderLog(initialProcessId);
                    // //             }

                    // //             // Invoke with dynamic data (no hardcoded strings)
                    // //             initProcessLogs(
                    // //                 ' . json_encode(json_encode($initialLogs, JSON_UNESCAPED_SLASHES)) . ',
                    // //                 ' . json_encode($initialProcessId) . ',
                    // //                 ' . json_encode($initialOptions) . ',
                    // //                 ' . json_encode($publicBase) . '
                    // //             );
                    // //         })();
                    // //     ',
                    // //     ];

                    // //     break;

                    // default:
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
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.', 400);
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
