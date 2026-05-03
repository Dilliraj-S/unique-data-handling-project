<?php

namespace App\Http\Controllers\System\Central\Filters;

use App\Facades\{Data, Developer, Random, Skeleton,};
use App\Http\Controllers\Controller;
use App\Http\Helpers\ResponseHelper;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Validator, DB, Log};

/**
 * Controller for saving new Filters entities.
 */
class SaveAddCtrl extends Controller
{
    /**
     * Saves new Filters entity data based on validated input.
     *
     * @param Request $request HTTP request containing form data and token
     * @return JsonResponse JSON response with status, title, and message
     */
    public function index(Request $request): JsonResponse
    {
        try {

            $token = $request->input('save_token');
            if (!$token) {
                return ResponseHelper::moduleError('Token Missing', 'No token was provided.');
            }

            $reqSet = Skeleton::resolveToken($token);
            if (!isset($reqSet['key'])) {
                return ResponseHelper::moduleError('Invalid Token', 'The provided token is invalid.');
            }

            $byMeta = $timestampMeta = true;
            $reloadTable = $reloadCard = true;
            $validated = [];
            $title = 'Success';
            $message = 'Record added successfully.';
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (START) <<<                                  *
             *                                                                                                  *
             ****************************************************************************************************/

            switch ($reqSet['key']) {
                /*
                Add To Products
            */
               case 'central_unique_products':
                $validator = Validator::make($request->all(), [
                    'pp_id'             => 'nullable|string|max:50',
                    'pp_name'           => 'nullable|string|max:255',
                    'product_name'      => 'nullable|string',
                    'description'       => 'nullable',
                    'source_description'=> 'nullable|string',
                    'category'          => 'nullable|string|max:255', // 
                    'vendor'            => 'nullable|string|max:255', // 
                    'type'              => 'nullable|string'
                ]);

                if ($validator->fails()) {
                    return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                }

                $validated = $validator->validated();
                $rawId = $request->input('ids', '');
                $ids = [];
                $isQuery = str_starts_with($rawId, '%7B') || str_starts_with($rawId, '{');

                if ($isQuery) {
                    $decoded = json_decode(urldecode($rawId), true);
                    if (!is_array($decoded)) {
                        return ResponseHelper::moduleError('Error', 'Invalid query format.');
                    }
                    $decoded['custom']['mode'] = 'fetch_ids';
                    $result = Data::filter($request->type, $decoded);
                    $ids = array_map('intval', $result['data'] ?? []);
                    if (empty($ids)) {
                        return ResponseHelper::moduleError('No Match', 'No matching records found.');
                    }
                } else {
                    $ids = array_map('intval', array_filter(explode('@', $rawId)));
                }

                try {
                    $title = 'Product "' . ($validated['product_name'] ?? '') . '" Created';
                    $message = 'successfully';

                    $isLeads = $request->type === 'sun.master_leads';
                    $finalContacts = [];
                    $finalCompanies = [];
                    if ($isLeads) {
                        $liCompanyIds = DB::table('sun.master_leads')
                            ->whereIn('id', $ids)
                            ->pluck('li_smtp')
                            ->filter()
                            ->unique()
                            ->toArray();

                        if (!empty($liCompanyIds)) {
                            $finalCompanies = DB::table('sun.master_accounts')
                                ->whereIn('li_smtp', $liCompanyIds)
                                ->pluck('id')
                                ->unique()
                                ->toArray();
                        }

                        $finalContacts = $ids;
                    } else {
                        $liCompanyIds = DB::table('sun.master_accounts')
                            ->whereIn('id', $ids)
                            ->pluck('li_smtp')
                            ->filter()
                            ->unique()
                            ->toArray();

                        if (!empty($liCompanyIds)) {
                            $finalContacts = DB::table('sun.master_leads')
                                ->whereIn('li_smtp', $liCompanyIds)
                                ->pluck('id')
                                ->unique()
                                ->toArray();
                        }

                        $finalCompanies = $ids;
                    }

                    if ($request->product_mode == 'new') {
                        if (!empty($validated['product_name'])) {
                            $normalize = fn($name) => strtolower(preg_replace('/\s+/', '', $name));
                            $inputNameNormalized = $normalize($validated['product_name']);

                            $allProducts = Data::get('central','products', [
                                'select' => ['product_name']
                            ], $reqSet['key']);

                            if ($allProducts['status'] && !empty($allProducts['data'])) {
                                foreach ($allProducts['data'] as $product) {
                                    $existingName = $product['product_name'] ?? '';
                                    if ($inputNameNormalized === $normalize($existingName)) {
                                        return ResponseHelper::moduleError('Duplicate Entry', 'A product with a similar name already exists.');
                                    }
                                }
                            }
                        }

                        $validated['contacts']        = implode(',', $finalContacts);
                        $validated['contacts_count']  = count($finalContacts);
                        $validated['companies']       = implode(',', $finalCompanies);
                        $validated['companies_count'] = count($finalCompanies);
                        $validated['product_id']      = Random::unique(6, 'PROD');
                        $validated['created_by']      = Skeleton::getAuthenticatedUser()->username;
                        unset($validated['type']);

                        $result = Data::create('central', 'products', $validated, $reqSet['key']);
                    } else {
                        // FIXED: use product_id, not product_name
                        $existingResult = Data::get('central', 'products', [
                            'where' => ['product_id' => $request->existing_name]
                        ], $reqSet['key']);

                        if (!$existingResult['status'] || empty($existingResult['data'])) {
                            return ResponseHelper::moduleError('Error', 'Product not found.');
                        }

                        $existing = $existingResult['data'][0];
                        $currentContacts = array_map('intval', array_filter(explode(',', $existing['contacts'] ?? '')));
                        $currentCompanies = array_map('intval', array_filter(explode(',', $existing['companies'] ?? '')));

                        $mergedContacts = array_unique(array_merge($currentContacts, $finalContacts));
                        $mergedCompanies = array_unique(array_merge($currentCompanies, $finalCompanies));

                        $validated['contacts']        = implode(',', $mergedContacts);
                        $validated['contacts_count']  = count($mergedContacts);
                        $validated['companies']       = implode(',', $mergedCompanies);
                        $validated['companies_count'] = count($mergedCompanies);
                        unset($validated['type']);

                        // FIXED: keep product_name and product_id consistent
                        $validated['product_name'] = $existing['product_name'];

                        $result = Data::update('central', 'products', $validated, [
                            'product_id' => $request->existing_name
                        ], $reqSet['key']);

                        $title = 'Product "' . $validated['product_name'] . '" Updated';
                        $message = 'Added to existing product';

                        if (!$result['status']) {
                            return ResponseHelper::moduleError('Error', $result['message']);
                        }
                    }

                    $reqSet['token'] = $isLeads
                        ? Skeleton::skeletonToken('central_sun_master_leads')
                        : Skeleton::skeletonToken('central_sun_master_accounts');

                    return response()->json([
                        'status' => $result['status'],
                        'reload_table' => true,
                        'affected' => $result['status'] ? ($result['data']['id'] ?? $result['data']['affected_rows'] ?? '-') : '-',
                        'title' => $result['status'] ? $title : 'Failed',
                        'message' => $result['status'] ? $message : $result['message']
                    ]);
                } catch (Exception $e) {
                    return ResponseHelper::moduleError('Error', 'Unexpected error: ' . $e->getMessage());
                }

                break;


                /*
                Add To Audience
            */
                case 'central_pluto_audiences':
                    $rules = ['audience_mode' => 'nullable|string'];
                    $rules[$request->audience_mode == 'new' ? 'name' : 'existing_audience'] = 'required|string';
                    $validator = Validator::make($request->all(), $rules);
                    if ($validator->fails()) return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());

                    $validate = $validator->validated();
                    $rawId = $request->input('ids', '');
                    $ids = [];
                    $isQuery = str_starts_with($rawId, '%7B') || str_starts_with($rawId, '{');

                    if ($isQuery) {
                        $decoded = json_decode(urldecode($rawId), true);
                        if (!is_array($decoded)) return ResponseHelper::moduleError('Error', 'Invalid query format.');
                        $decoded['custom']['mode'] = 'fetch_ids';
                        $result = Data::filter($request->type, $decoded);
                        $ids = array_map('intval', $result['data'] ?? []);
                        if (empty($ids)) return ResponseHelper::moduleError('No Match', 'No matching records found.');
                    } else {
                        $ids = array_map('intval', array_filter(explode('@', $rawId)));
                    }

                    try {
                        $title = 'Success';
                        $message = 'Added successfully';
                        $audienceId = null;

                        if ($request->audience_mode == 'new') {
                            if (DB::table('pluto.audiences')->where('name', $validate['name'])->exists()) {
                                return response()->json(['status' => false, 'message' => 'Audience with the same name already exists.']);
                            }
                            $validate['created_at'] = now();
                            unset($validate['audience_mode']);
                            $result = Data::create('central', 'pluto.audiences', $validate, $reqSet['key']);
                            $audienceId = $result['data']['id'];
                            $audienceName = $validate['name'];
                            $message = "Subscribers added to New Audience  <b>{$audienceName}</b> ";  
                        } else {
                            $validate['name'] = $validate['existing_audience'];
                            unset($validate['audience_mode'], $validate['existing_audience']);
                            $existingResult = Data::get('central', 'pluto.audiences', ['where' => ['name' => $validate['name']]], $reqSet['key']);
                            if (!$existingResult['status'] || empty($existingResult['data'])) {
                                return response()->json(['status' => false, 'message' => 'Selected audience not found.']);
                            }
                            $audienceId = $existingResult['data'][0]['id'];
                            $audienceName = $validate['name'];
                            $result = Data::update('central', 'pluto.audiences', $validate, ['id' => $audienceId], $reqSet['key']);
                            $message = "Subscribers added to Existing Audience <b>{$audienceName}</b>"; 
                            if (!$result['status']) return ResponseHelper::moduleError('Error', $result['message']);
                        }
                        
                        $records = DB::table('sun.master_leads')
                            ->whereIn('id', $ids)
                            ->select('li_first_name', 'li_last_name', 'email')
                            ->get();
                        $existingEmails = DB::table('pluto.subscribers')
                            ->where('audience_id', $audienceId)
                            ->pluck('email')
                            ->toArray();
                        $subscribers = [];
                        foreach ($ids as $index => $id) {
                            if (isset($records[$index]) && !in_array($records[$index]->email, $existingEmails)) {
                                $subscribers[] = [
                                    'audience_id' => $audienceId,
                                    'first_name' => $records[$index]->li_first_name,
                                    'last_name' => $records[$index]->li_last_name,
                                    'email' => $records[$index]->email,
                                    'status' => 'subscribed',
                                    'created_at' => now(),
                                    'updated_at' => now()
                                ];
                            }
                        }
                        if (!empty($subscribers)) {
                            foreach ($subscribers as $subscriber) {
                                Data::create('central', 'pluto.subscribers', $subscriber, $reqSet['key']);
                            }
                        }
                        if ($request->type == 'sun.master_leads') {
                            $reqSet['token'] = Skeleton::skeletonToken('central_sun_master_leads');
                        }
                        return response()->json([
                            'status' => true,
                            'reload_table' => true,
                            'token' => $reqSet['token'],
                            'affected' => $audienceId,
                            'title' => $title,
                            'message' => $message
                        ]);
                    } catch (Exception $e) {
                        return ResponseHelper::moduleError('Error', 'Unexpected error: ' . $e->getMessage());
                    }
                    break;
                /*
                    Need To Action
                */
                case 'central_need_to_action':
                    try {
                        $validator = Validator::make($request->all(), [
                            'id'     => 'nullable|string',
                            'table'  => 'required|string',
                            'status' => 'required|string',
                        ]);
                
                        if ($validator->fails()) {
                            return ResponseHelper::moduleError('Validation Error', $validator->errors()->first());
                        }
                
                        $validated = $validator->validated();
                
                        // set token based on table
                        if ($validated['table'] == 'sun.master_leads') {
                            $reqSet['token'] = Skeleton::skeletonToken('central_sun_master_leads');
                        } else {
                            $reqSet['token'] = Skeleton::skeletonToken('central_sun_master_accounts');
                        }
                
                        $rawId = $request->input('id', '');
                        $ids = [];
                        $isQuery = false;
                
                        if (str_starts_with($rawId, '%7B') || str_starts_with($rawId, '{')) {
                            $isQuery = true;
                        }
                
                        if ($isQuery) {
                            $decoded = json_decode(urldecode($rawId), true);
                            if (!is_array($decoded)) {
                                return ResponseHelper::moduleError('Error', 'Invalid query format.');
                            }
                            $decoded['custom']['mode'] = 'fetch_ids';
                            $result = Data::filter($validated['table'], $decoded);
                            $ids = $result['data'] ?? [];
                            if (empty($ids)) {
                                return ResponseHelper::moduleError('No Match', 'No matching records found.');
                            }
                        } else {
                            $ids = array_filter(explode('@', $rawId));
                        }
                
                        // ✅ update the main table
                        $updateData = ['need_to_action' => 1];
                        $affected = Data::update(
                            'central',
                            $validated['table'],
                            $updateData,
                            [$reqSet['act'] => $ids],
                            $reqSet['key']
                        );
                
                        if ($affected > 0) {
                            foreach ($ids as $id) {
                                $action = [
                                    'action_id'  => $id,
                                    'status'     => $validated['status'],
                                    'table_name' => $validated['table'], // ✅ now always set
                                    'created_by' => Skeleton::getAuthenticatedUser()->username,
                                    'created_at' => now(),
                                ];
                                Data::create('central', 'need_to_action', $action, $reqSet['key']);
                            }
                
                            return response()->json([
                                'status'       => true,
                                'reload_table' => true,
                                'token'        => $reqSet['token'],
                                'affected'     => $affected,
                                'title'        => 'Success',
                                'message'      => count($ids) . " record(s) moved to Need To Action tab.",
                            ]);
                        }
                
                        return ResponseHelper::moduleError('Error', 'No changes were made.');
                    } catch (\Throwable $e) {
                        Developer::error("central_need_to_action exception: " . $e->getMessage());
                        return ResponseHelper::moduleError('Exception', 'Something went wrong. Please try again.');
                    }
                    break;
                


                default:
                    return ResponseHelper::moduleError('Invalid Configuration', 'The configuration key is not supported.');
            }
            
            /****************************************************************************************************
             *                                                                                                  *
             *                             >>> MODIFY THIS SECTION (END) <<<                                    *
             *                                                                                                  *
             ****************************************************************************************************/

           if ($byMeta || $timestampMeta) {
                if ($byMeta) {
                    $validated['created_by'] = Skeleton::getAuthenticatedUser()->username;
                    $validated['updated_by'] = Skeleton::getAuthenticatedUser()->username;
                }
                if ($timestampMeta) {
                    $validated['updated_at'] = now();
                }
            }


            $result = Data::create('central', $reqSet['table'], $validated, $reqSet['key']);

            return response()->json([
                'status' => $result['status'],
                'reload_table' => $reloadTable,
                'reload_card' => $reloadCard,
                'token' => $reqSet['token'],
                'affected' => $result['status'] ? $result['data']['id'] : '-',
                'title' => $result['status'] ? $title : 'Failed',
                'message' => $result['status'] ? $message : $result['message']
            ]);
        } catch (Exception $e) {
            return ResponseHelper::moduleError('Error', Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while saving the data.');
        }
    }
}
