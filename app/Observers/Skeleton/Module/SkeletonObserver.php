<?php

namespace App\Observers\Skeleton\Module;

use App\Facades\{CentralDB, Developer, Skeleton, Data, Random};
use App\Http\Helpers\RandomHelper; 
use Illuminate\Support\Facades\{Cache, Config, File,Auth};

/**
 * Observer class for managing skeleton-related cache and permissions.
 */
class SkeletonObserver
{
    public static function manageSkeletonAction(string $system, string $table, string $operation, array $condition, array $preVal): void
    {
        try {
            if (!$system || !$table || !$operation) {
                return;
            }
            if ($table === 'skeleton_tokens' && Config::get('skeleton.token_reload')) {
                Cache::forget('skeleton_tokens_data');
                session()->forget('skeleton_token_map');
                Developer::info('Cleared skeleton_tokens cache and session', compact('table', 'system'));
            }
            if ($operation === 'create' && in_array($table, ['skeleton_modules', 'skeleton_sections', 'skeleton_items'])) {
                $permissions = self::generatePermissions($table, $condition);
                if ($permissions) {
                    self::storePermissions($system, $table, $permissions);
                    Developer::info("Permissions created for {$table}", compact('table', 'permissions', 'system'));
                }
                if($table === 'skeleton_modules'){
                    $module = CentralDB::table('skeleton_modules')->where('id',$condition[0])->first();
                    if ($module && $module->name) {
                        Developer::error($module->name);
                        self::generateController($module->system, $module->name);
                    }
                }
            }
            if (($operation === 'update' || $operation === 'delete') && in_array($table, ['skeleton_modules', 'skeleton_sections', 'skeleton_items'])) {
                self::updateOrdeletePermissions($system, $table, $condition, $preVal, $operation);
            } 
            Skeleton::clearSkeletonCache();
            Skeleton::clearUserCache(Skeleton::getAuthenticatedUser()->id, Skeleton::getAuthenticatedUser()->business_id);
            Skeleton::reloadSkeleton(); 
        } catch (\Exception $e) {
            Developer::error('Failed to process skeleton action', [
                'table' => $table,
                'system' => $system,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private static function generatePermissions(string $table, array $condition): array
    {
        $actions = ['create', 'edit', 'delete', 'view', 'import', 'export'];
        $permissions = [];

        $queries = [
            'skeleton_modules' => [
                'select' => ['m.name as module_name'],
                'table' => 'skeleton_modules as m',
                'where' => ['m.id' => $condition[0]],
            ],
            'skeleton_sections' => [
                'select' => ['m.name as module_name', 's.name as section_name'],
                'table' => 'skeleton_modules as m',
                'join' => [['skeleton_sections as s', 's.module_id', '=', 'm.module_id']],
                'where' => ['s.id' => $condition[0]],
            ],
            'skeleton_items' => [
                'select' => ['m.name as module_name', 's.name as section_name', 'i.name as item_name'],
                'table' => 'skeleton_modules as m',
                'join' => [
                    ['skeleton_sections as s', 's.module_id', '=', 'm.module_id'],
                    ['skeleton_items as i', 'i.section_id', '=', 's.section_id'],
                ],
                'where' => ['i.id' => $condition[0]],
            ],
        ];

        if (!isset($queries[$table])) {
            return [];
        }

        $query = CentralDB::table($queries[$table]['table'])
            ->select($queries[$table]['select'])
            ->whereNull('m.deleted_at');

        if (!empty($queries[$table]['join'])) {
            foreach ($queries[$table]['join'] as $join) {
                $alias = explode(' ', $join[0])[2] ?? explode(' ', $join[0])[0];
                $query->join($join[0], $join[1], $join[2], $join[3]);
                $query->whereNull("{$alias}.deleted_at");
            }
        }

        $data = $query->where($queries[$table]['where'])->first();

        if (!$data) {
            return [];
        }

        switch ($table) {
            case 'skeleton_modules':
                $module = trim($data->module_name);
                foreach ($actions as $action) {
                    $permissions[] = "{$action}:{$module}";
                }
                break;
            case 'skeleton_sections':
                $module = trim($data->module_name);
                $section = trim($data->section_name);
                foreach ($actions as $action) {
                    $permissions[] = "{$action}:{$module}::{$section}";
                }
                break;
            case 'skeleton_items':
                $module = trim($data->module_name);
                $section = trim($data->section_name);
                $item = trim($data->item_name);
                foreach ($actions as $action) {
                    $permissions[] = "{$action}:{$module}::{$section}::{$item}";
                }
                break;
        }

        return $permissions;
    }

    private static function storePermissions(string $system, string $table, array $permissions): void
    {
        $userId = Skeleton::getAuthenticatedUser()->user_id;
        $timestamp = now();

        foreach ($permissions as $permission) {
            Data::create($system, 'permissions', [
                'permission_id'=>Random::generateUniqueId(3),
                'name' => $permission,
                'created_by' => $userId,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);
        }
    }

    private static function updateOrdeletePermissions(string $system, string $table, array $condition, array $preVal, string $operation): void
    {
        Developer::info("Start permission {$operation}");

        $preValue = $preVal[0]->name ?? null;
        if (!$preValue) return;

        $newValue = null;
        if ($operation === 'update') {
            $newRecord = CentralDB::table($table)->where('id', $condition['id'])->first();
            $newValue = $newRecord->name ?? null;
            if (!$newValue || $newValue === $preValue) return;
        }

        $baseQuery = CentralDB::table('permissions')->where(function ($query) use ($table, $preValue) {
            switch ($table) {
                case 'skeleton_modules':
                    $query->whereRaw(
                        "SUBSTRING_INDEX(REPLACE(name, CONCAT(SUBSTRING_INDEX(name, ':', 1), ':'), ''), '::', 1) = ?",
                        [$preValue]
                    );
                    break;

                case 'skeleton_sections':
                    $query->whereRaw(
                        "SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(name, CONCAT(SUBSTRING_INDEX(name, ':', 1), ':'), ''), '::', 2), '::', -1) = ?",
                        [$preValue]
                    );
                    break;

                case 'skeleton_items':
                    $query->whereRaw(
                        "SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(name, CONCAT(SUBSTRING_INDEX(name, ':', 1), ':'), ''), '::', 3), '::', -1) = ?",
                        [$preValue]
                    );
                    break;
            }
        });

        $records = $baseQuery->get();

        if ($operation === 'delete') {
            Developer::info("Comming TO Delete");
            $idsToDelete = $records->pluck('id')->toArray();
            if (!empty($idsToDelete)) {
                CentralDB::table('permissions')->whereIn('id', $idsToDelete)->delete();
                Developer::info("Deleted permissions for {$table}", compact('table', 'system', 'preValue', 'condition'));
            }
            return;
        }

        // Update operation
        foreach ($records as $record) {
            $oldName = $record->name;
            $action = substr($oldName, 0, strpos($oldName, ':'));
            $newName = '';
            switch ($table) {
                case 'skeleton_modules':
                    $rest = preg_replace("/^{$action}:[^:]+/", "{$action}:{$newValue}", $oldName);
                    $newName = $rest;
                    break;

                case 'skeleton_sections':
                    $parts = explode('::', preg_replace("/^{$action}:/", '', $oldName));
                    if (count($parts) >= 2) {
                        $newName = "{$action}:{$parts[0]}::{$newValue}";
                        if (isset($parts[2])) {
                            $newName .= "::{$parts[2]}";
                        }
                    }
                    break;

                case 'skeleton_items':
                    $parts = explode('::', preg_replace("/^{$action}:/", '', $oldName));
                    if (count($parts) >= 3) {
                        $newName = "{$action}:{$parts[0]}::{$parts[1]}::{$newValue}";
                    }
                    break;
            }

            if (!empty($newName)) {
                CentralDB::table('permissions')->where('id', $record->id)->update(['name' => $newName]);
            }
        }

        Developer::info("Updated permissions for {$table}", compact('table', 'system', 'preValue', 'newValue', 'condition'));
    }
}
