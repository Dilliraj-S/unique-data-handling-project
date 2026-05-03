<?php
namespace App\Http\Classes;

use Exception;
use App\Http\Classes\{
    UserHelper
};
use App\Models\Notify\Notification;

class NotifyHelper
{
    /* ----------------------------------------------------------------------------------------------
    Notification Handling
    ---------------------------------------------------------------------------------------------- */

    public static function fresh($to_ids, $title, $message, $type)
    {
        try {
            $from_id = UserHelper::getCurrentUser('gotit_id');
            $org_id = UserHelper::getCurrentUser('org_id');
            if (is_array($to_ids)) {
                $to_ids = implode(',',$to_ids);
            }
            Notification::create([
                'org_id' => $org_id,
                'from_id' => $from_id,
                'gotit_id' => $to_ids,
                'title' => $title,
                'message' => $message,
                'type' => $type,
                'status' => 'N'
            ]);
            return true;
        } catch (Exception $e) {
            return $e->getMessage();
        }
    }
}
