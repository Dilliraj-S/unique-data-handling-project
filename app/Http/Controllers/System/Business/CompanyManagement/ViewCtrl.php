<?php

namespace App\Http\Controllers\Panels\Supreme\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\{Request, Response};
use Illuminate\Support\Facades\{Auth, Cache, Crypt, DB, Log, Session, Storage, Validator, View};
use Exception;
use App\Http\Exceptions\ExceptionHelper;
use App\Http\Helpers\{UserHelper, RandomHelper, SelectHelper, SkeletonHelper, DataHelper};
use App\Models\User;

class SaShowMoreCtrl extends Controller
{
    public function index(Request $request)
    {
        try {
            $token = $request->input('skeleton_token');
            if (!$token) {
                return response()->json(['status' => false, 'message' => 'Missing token'], 400);
            }
            $config = app('skeleton.token')->resolve($token);
            if (!$config) {
                return response()->json(['status' => false, 'message' => 'Invalid token'], 403);
            }
            $reqSet = [
                'token' => $token,
                'key' => $config['key'],
                'table' => $config['table'] ?? '',
                'column' => $config['column'] ?? 'id',
            ];
            $id = $request->input('data_id');
            $data = DB::table($reqSet['table'])->where('id', $id)->get();
            $content = $data ? '<table class="table table-sm sf-12"><tbody>' : '<center><b>Nothing to show! Contact Support!</b></center>';
            if ($data) {
                $excludedColumns = ['deleted_at', 'response_1', 'response_2', 'pay_link', 'updated_at', 'password', 'remember_token'];
                $columns = array_keys((array)$data[0]);
                $filteredColumns = array_diff($columns, $excludedColumns);
                foreach ($filteredColumns as $column) {
                    $value = htmlspecialchars($data[0]->$column);
                    $content .= "<tr><td><b>" . ucfirst(str_replace('_', ' ', htmlspecialchars($column))) . "</b></td><td>$value</td></tr>";
                }
                $content .= '</tbody></table>';
            }
            return response()->json([
                'type' => 'offcanvas',
                'size' => '',
                'position' => 'end',
                'label' => "More Information (" . ucfirst(str_replace('_', ' ', $reqSet['table'])) . ")",
                'content' => $content,
                'script' => '',
                'button' => 'Close',
                'status' => $data ? true : false,
            ]);
        } catch (Exception $e) {
            return ExceptionHelper::handle($e, true, true);
        }
    }
}
