<?php
namespace App\Http\Classes;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Classes\{RandomHelper, UserHelper};
use App\Models\Helper\Setting;
use App\Models\Commands\{Command, GlobalCommand};
use App\Models\Device\{Device, DeviceUser};
use Exception;

class CommandHelper
{
    public static function build(string $org_id, string $device_id, string $cret_id, ?string $afct_id, string $command, array $inputs = []): void
    {
        try {
            if (empty($org_id) || empty($device_id) || empty($cret_id) || empty($command)) {
                throw new Exception('Required fields (org_id, device_id, cret_id, command) cannot be empty');
            }
            $deviceSettings = Setting::where('org_id', $org_id)
            ->where('type', 'device_connection')
            ->where('status', 'active')
            ->value('setting') ?? '30000';

        $connectionJson = json_decode($deviceSettings, true);

        $connection_type = $connectionJson->connection_type; // server or software



            $syncTimeSettings = Setting::where('org_id', $org_id)
                ->where('type', 'sync_interval_ms')
                ->where('status', 'active')
                ->value('setting') ?? '30000';

            $syncTime = is_numeric($syncTimeSettings) ? (string)$syncTimeSettings : '30000';

            do {
                $cmd_id = 'CMD' . RandomHelper::generateUniqueId(7);
            } while (Command::where('cmd_id', $cmd_id)->exists());

            Command::create([
                'cmd_id' => $cmd_id,
                'org_id' => $org_id,
                'device_id' => $device_id,
                'cret_id' => $cret_id,
                'afct_id' => $afct_id,
                'command' => $command,
                'inputs' => json_encode($inputs),
                'nxt_loop' => $syncTime,
                'type' => 'SW',
                'state' => 'PENDING',
                'status' => 'PENDING',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info("Command $cmd_id built successfully for device_id: $device_id");
        } catch (Exception $e) {
            Log::error("Failed to build command: {$e->getMessage()}", [
                'org_id' => $org_id,
                'device_id' => $device_id,
                'command' => $command,
            ]);
            throw $e;
        }
    }

    public static function getCommandId(string $command): string
    {
        $command_ids = [
            'CMDRECNECT' => 'RECONNECT',
            'CMDCTRL01' => 'DISABLE-DEVICE',
            'CMDCTRL02' => 'ENABLE-DEVICE',
            'CMDCTRL03' => 'RESTART',
            'CMDCTRL04' => 'POWER-OFF',
            'CMDTIME01' => 'GET-TIME',
            'CMDTIME02' => 'SET-TIME',
            'CMDDINFO01' => 'GET-DEVICE-INFO',
            'CMDUSAG01' => 'GET-MEMORY-SIZES',
            'CMDUSER01' => 'SET-USER',
            'CMDUSER02' => 'GET-USERS',
            'CMDUSER03' => 'DELETE-USER',
            'CMDFP001' => 'GET-USER-FINGERPRINT-TEMPLATE',
            'CMDFP002' => 'SET-USER-FINGERPRINT-TEMPLATE',
            'CMDFP003' => 'GET-FINGERPRINT-TEMPLATES',
            'CMDFP004' => 'SET-FINGERPRINT-TEMPLATES',
            'CMDATTD01' => 'GET-ATTENDANCE',
            'CMDATTD02' => 'CLEAR-ATTENDANCE',
            'CMDTEST01' => 'TEST-VOICE',
            'CMDMAIN01' => 'CLEAR-DATA',
            'CMDMAIN02' => 'FACTORY-RESET',
        ];
        return $command_ids[$command] ?? $command;
    }

}