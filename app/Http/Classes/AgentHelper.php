<?php

namespace App\Http\Classes;

use Illuminate\Http\Request;
use Jenssegers\Agent\Agent;
use App\Facades\{Data, Developer, Random, Skeleton};
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Http\Classes\RandomHelper;

class AgentHelper
{
    /* ----------------------------------------------------------------------------------------------
    User Agent Information
    ---------------------------------------------------------------------------------------------- */
    public static function getAgentInfo($property)
    {
        $agent = new Agent();

        switch ($property) {
            case 'browser':
                return $agent->browser();
            case 'platform':
                return $agent->platform();
            case 'device':
                return $agent->device();
            case 'version':
                return $agent->version($agent->browser());
            case 'isDesktop':
                return $agent->isDesktop();
            case 'isMobile':
                return $agent->isMobile();
            case 'isTablet':
                return $agent->isTablet();
            case 'isWindows':
                return $agent->isWindows();
            case 'isLinux':
                return $agent->isLinux();
            case 'isMac':
                return $agent->isMac();
            case 'isAndroid':
                return $agent->isAndroid();
            case 'isiOS':
                return $agent->isiOS();
            case 'isChrome':
                return $agent->isChrome();
            case 'isSafari':
                return $agent->isSafari();
            case 'isFirefox':
                return $agent->isFirefox();
            case 'isIE':
                return $agent->isIE();
            case 'isEdge':
                return $agent->isEdge();
            case 'robot':
            case 'isCrawler':
                return $agent->robot();
            case 'languages':
                return $agent->languages();
            case 'deviceType':
                return self::getDeviceType($agent);
            case 'deviceName':
                return $agent->device();
            default:
                return null;
        }
    }

    private static function getDeviceType($agent)
    {
        if ($agent->isDesktop()) {
            return 'Desktop';
        } elseif ($agent->isTablet()) {
            return 'Tablet';
        } elseif ($agent->isMobile()) {
            return 'Mobile';
        } else {
            return 'Unknown';
        }
    }

    /* ----------------------------------------------------------------------------------------------
    User Agent Request Information
    ---------------------------------------------------------------------------------------------- */
    public static function getAgentRequest(Request $request, $property)
    {
        switch ($property) {
            case 'ipAddress':
                return $request->ip();
            case 'userAgent':
                return $request->userAgent();
            case 'referrerUrl':
                return $request->server('HTTP_REFERER');
            case 'landingPage':
                return $request->url();
            default:
                return null;
        }
    }

    /* ----------------------------------------------------------------------------------------------
    User Activity Information
    ---------------------------------------------------------------------------------------------- */
    public static function logActivity($action, $description = null, $data = [])
    {
        $agent = new Agent();

        Developer::log('AgentHelper', 'logActivity', [
            'action' => $action,
            'description' => $description,
            'data' => $data,
        ]);
        $activity = [
            'user_id'         => Skeleton::getAuthenticatedUser()->user_id,
            'act_id'          => RandomHelper::generateUniqId(6),
            'username'       => trim(Skeleton::getAuthenticatedUser()->first_name . ' ' . Skeleton::getAuthenticatedUser()->last_name),
            'ip_address'      => request()->ip(),
            'browser'         => $agent->browser(),
            'device'          => self::getDeviceType($agent),
            'action'          => $action,
            'description'     => $description ?? 'No description provided',
            'additional_info' => !empty($data) ? json_encode($data) : null,
            'created_at'      => now(),
            'updated_at'      => now(),
        ];
        Developer::log('AgentHelper', 'logActivity', [
            'final store' => $activity,
        ]);
        // ✅ Correct insert call
        DB::table('activity_history')->insert($activity);
    }
}
