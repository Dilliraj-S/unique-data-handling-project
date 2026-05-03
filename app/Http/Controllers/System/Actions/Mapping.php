<?php
namespace App\Http\Controllers\System\Actions;
use App\Facades\{Data, Developer, Skeleton};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Illuminate\Http\{Request, JsonResponse};
use Illuminate\Support\Facades\{Config, Validator, DB};
use App\Events\{HeaderMatchEvent};

/* Controller for handling dynamic and static Select2 dropdown data.
 */
class Mapping extends Controller
{
    /* Handle AJAX requests for Select2 dropdown data (dynamic or static).
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters with token.
     * @return JsonResponse Dropdown data or error message.
     */
    public function index(Request $request, array $params = []): JsonResponse
    {
        try {
            $token = $params['token'] ?? $request->input('skeleton_token');
            if (!is_string($token) || empty($token)) {
                Developer::warning('SelectCtrl: Invalid or missing token', [
                    'params' => $params,
                    'request' => $request->except(['password', 'token'])
                ]);
                return response()->json(['status' => false, 'message' => 'Invalid token'], 400);
            }
            $validator = Validator::make($request->all(), [
                'database' => 'required|string|max:255',
                'table' => 'required|string',
                'file' => 'required|string',
            ]);
            if ($validator->fails()) {
                return ResponseHelper::moduleError('Validation Failed', $validator->errors()->first(), 422);
            }

            $validated = $validator->validated();
            $database = $validated['database'];
            $table = $validated['table'];
            $filePath = $validated['file'];
            $fullPath = storage_path('app/private/' . $filePath);

            // 2. Check if file exists
            if (!file_exists($fullPath)) {
                return ResponseHelper::moduleError('File Not Found', 'The CSV file does not exist.', 404);
            }

            // 3. Read headers from CSV
            $csvHeaders = [];
            if (($handle = fopen($fullPath, 'r')) !== false) {
                $csvHeaders = fgetcsv($handle);
                fclose($handle);
            }

            if (empty($csvHeaders)) {
                return ResponseHelper::moduleError('Empty CSV', 'No headers found in the file.', 400);
            }
            $columns = Data::getCachedSchemaColumns($table);
            $matched = [];
            $unmatched = [];
            foreach ($csvHeaders as $csvHeader) {
                $match = collect($columns)->first(
                    fn($col) => strtolower($col) === strtolower(trim($csvHeader))
                );
                if ($match) {
                    $matched[] = ['csv' => $csvHeader, 'db' => $match];
                } else {
                    $unmatched[] = $csvHeader;
                }
            }
            $user_id = auth()->id();
            $mapping=[$columns, $matched, $unmatched, $table, $filePath, $token];

            broadcast(new HeaderMatchEvent($user_id, $mapping));
            return response()->json([
                'status' => true,
                'title' => 'Success',
                'message' => 'Headers are matched',
            ]);
        } catch (\Throwable $e) {
            return ResponseHelper::moduleError('Import Preview Failed', $e->getMessage(), 500);
        }
    }
}