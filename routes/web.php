<?php

use App\Http\Controllers\Authorization\AuthorizationController;
use App\Http\Controllers\System\SystemRouteController;
use App\Http\Controllers\System\Central\EmailSystem\EmailController;
use App\Http\Controllers\System\Central\EmailSystem\EmailMarketingController;
use App\Http\Controllers\System\Central\EmailSystem\DriftController;
use App\Http\Controllers\System\Central\EmailSystem\GoogleAuthController;
use App\Http\Controllers\FileManagerController;
use App\Http\Controllers\LanderController;
use App\Http\Controllers\Device\AdmsRequestsController;
use Illuminate\Support\Facades\Route;
use App\Facades\Skeleton;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Cache, DB, Artisan, Storage};
use App\Facades\{Developer};
use Illuminate\Support\Facades\Broadcast;



Route::get('/api/get-smtps', function (Illuminate\Http\Request $request) {
    return DB::table('sun.master_accounts')
        ->select('id', 'li_smtp')
        ->when($request->search, function ($q) use ($request) {
            $q->where('li_smtp', 'like', "%{$request->search}%");
        })
        ->limit(50)
        ->get();
});
/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::get('/', fn() => redirect()->route('login'));
Route::post('/website-form', [LanderController::class, 'website_form'])->name('website_form');
Route::get('/get-license-key', [LanderController::class, 'get_license_key'])->name('get_license_key');
Route::get('/help', [LanderController::class, 'help'])->name('help');
Route::get('/unsubscribe', [LanderController::class, 'unsubscribe'])->name('unsubscribe');

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/
Route::get('/login', [AuthorizationController::class, 'showLoginForm'])->name('login');
Route::post('/login', [AuthorizationController::class, 'login'])->name('login.post');
Route::match(['get', 'post', 'delete'], '/logout', [AuthorizationController::class, 'logout'])->name('logout');
Route::get('/auth/{provider}', [AuthorizationController::class, 'redirectToSocial'])->name('social.login');
Route::get('/auth/{provider}/callback', [AuthorizationController::class, 'handleSocialCallback']);
Route::get('/forgot-password', [AuthorizationController::class, 'showForgotPassword'])->name('password.request');
Route::post('/forgot-password', [AuthorizationController::class, 'sendResetLinkEmail'])->name('password.email');
Route::get('/reset-password/{token}', [AuthorizationController::class, 'showResetPassword'])->name('password.reset');


Route::get('/verify-account', [AuthorizationController::class, 'showVerificationForm'])->name('verification.form');
Route::post('/verify-account', [AuthorizationController::class, 'submitVerification'])->name('verification.submit');

/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'skeleton'])->group(function () {
    $routes = Skeleton::getRoutes();
    foreach ($routes as $route) {
        Route::get('/' . $route, [SystemRouteController::class, 'dispatch']);
    }
    Route::post('/skeleton-action/{token}', [SystemRouteController::class, 'dispatch'])->name('system.action');
    // Dedicated endpoint for Select2 AJAX options (supports token or plain table+columns)
    Route::post('/select/options/{token?}', [\App\Http\Controllers\System\Actions\Select::class, 'index'])->name('select.options');
    Route::post('/select/options', [\App\Http\Controllers\System\Actions\Select::class, 'index'])->name('select.options.plain');
    Route::get('/reload-skeleton', [SystemRouteController::class, 'reload_skeleton'])->name('reload.skeleton');
    Route::post('/get-token/skeleton-key', function (Request $request) {
        try {
            $request->validate([
                'key' => 'required|string',
            ]);
            $key = $request->input('key');
            $tokenMap = session('skeleton_token_map', []);
            if (empty($tokenMap) || !is_array($tokenMap)) {
                return response()->json(['status' => 'error', 'message' => 'Session token is missing or invalid.'], 404);
            }
            $token = null;
            foreach ($tokenMap as $tokenKey => $data) {
                if (isset($data['key']) && $data['key'] === $key) {
                    $token = $tokenKey;
                    break;
                }
            }
            if (!$token) {
                return response()->json(['status' => 'error', 'message' => 'Token not found for the provided key'], 404);
            }
            return response()->json(['status' => 'success', 'message' => 'Token retrieved successfully', 'key' => $key, 'token' => $token]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'An unexpected error occurred.', 'error' => $e->getMessage()]);
        }
    });

















    Route::get('/file-manager', [FileManagerController::class, 'index'])->name('file-manager.index');
    Route::get('/file-manager/trash', [FileManagerController::class, 'trash'])->name('file-manager.trash');
    Route::get('/file-manager/tree', [FileManagerController::class, 'tree']);
    Route::post('/file-manager/upload', [FileManagerController::class, 'upload']);
    Route::put('/file-manager/files/{fileId}/update', [FileManagerController::class, 'update']);
    Route::post('/file-manager/folders', [FileManagerController::class, 'createFolder']);
    Route::put('/file-manager/files/{fileId}/rename', [FileManagerController::class, 'renameFile']);
    Route::put('/file-manager/folders/{folderId}/rename', [FileManagerController::class, 'renameFolder']);
    Route::delete('/file-manager/files/{fileId}', [FileManagerController::class, 'deleteFile']);
    Route::delete('/file-manager/folders/{folderId}', [FileManagerController::class, 'deleteFolder']);
    Route::post('/file-manager/files/{fileId}/restore', [FileManagerController::class, 'restoreFile']);
    Route::post('/file-manager/folders/{folderId}/restore', [FileManagerController::class, 'restoreFolder']);
    Route::delete('/file-manager/files/{fileId}/permanent', [FileManagerController::class, 'permanentlyDeleteFile']);
    Route::delete('/file-manager/folders/{folderId}/permanent', [FileManagerController::class, 'permanentlyDeleteFolder']);
    Route::get('/file-manager/files/{fileId}/download', [FileManagerController::class, 'downloadFile']);
    Route::post('/file-manager/files/{fileId}/share', [FileManagerController::class, 'shareFile']);
    Route::post('/file-manager/folders/{folderId}/share', [FileManagerController::class, 'shareFolder']);
    Route::delete('/file-manager/files/{fileId}/share/{userId}', [FileManagerController::class, 'revokeFileShare']);
    Route::delete('/file-manager/folders/{folderId}/share/{userId}', [FileManagerController::class, 'revokeFolderShare']);
    Route::post('/file-manager/copy', [FileManagerController::class, 'copy']);
    Route::post('/file-manager/move', [FileManagerController::class, 'move']);
    Route::post('/file-manager/files/{fileId}/star', [FileManagerController::class, 'starFile']);
    Route::post('/file-manager/folders/{folderId}/star', [FileManagerController::class, 'starFolder']);
    Route::get('/file-manager/files/{fileId}/versions', [FileManagerController::class, 'getFileVersions']);
    Route::post('/file-manager/files/{fileId}/versions/{versionNumber}/restore', [FileManagerController::class, 'restoreFileVersion']);
    Route::get('/file-manager/activity-log', [FileManagerController::class, 'getActivityLog']);
});

/*
|--------------------------------------------------------------------------
| ADMS Device Routes
|--------------------------------------------------------------------------
*/

Route::match(['GET', 'POST'], 'iclock/{endpoint}', [AdmsRequestsController::class, 'handle'])
    ->where('endpoint', 'ping(\.aspx|\.php)?|cdata(\.aspx|\.php)?|devicecmd(\.aspx|\.php)?|getrequest(\.aspx|\.php)?|fdata(\.aspx|\.php)?');

// Web-based queue trigger
Route::get('queue/work', function () {
    Artisan::call('queue:work', ['--once' => true, '--queue' => 'adms:*']);
    return response('Queue processed');
})->middleware('throttle:60,1');

/*
|--------------------------------------------------------------------------
| Emails  System Routes
|--------------------------------------------------------------------------
*/


Route::group(['middleware' => 'auth'], function () {

    /*
|--------------------------------------------------------------------------
| Dont Touch
|--------------------------------------------------------------------------
*/
    Route::get('/download-rejected/{filename}', function ($filename) {
        $path = storage_path("app/private/reject/{$filename}");
        if (!file_exists($path)) {
            abort(404);
        }
        return response()->download($path, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    })->middleware('auth');

    Route::post('/process/cancel/{processId}', function ($processId) {
        $userId = auth()->id();
        if (!$processId) {
            return back()->with('error', 'Invalid process id');
        }
        Cache::put("import_cancel_{$userId}_{$processId}", true, now()->addMinutes(10));
        return back()->with('message', 'Import cancel request submitted');
    });
    Route::get('/download-export/{processId}', function ($processId) {
        $userId = auth()->id();

        $log = DB::table('process_logs')
            ->where(['process_id' => $processId, 'user_id' => $userId, 'status' => 'completed'])
            ->first();

        $files = data_get(json_decode($log->progress ?? '', true), 'file_paths', []);

        if (empty($files)) abort(404, 'No export files found for this process');
        if (count($files) === 1) {
            $path = storage_path("app/private/" . ltrim($files[0], '/'));
            abort_unless(file_exists($path), 404, 'Export file not found');
            return response()->download($path, basename($files[0]), [
                'Content-Type' => 'text/csv',
                'Content-Length' => filesize($path),
            ]);
        }
        $zipName = "export_{$log->table}_{$processId}.zip";
        $zipPath = storage_path("app/private/temp/{$zipName}");
        Storage::disk('local')->makeDirectory('private/temp');

        $zip = new ZipArchive();
        abort_if($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true, 500, 'ZIP creation failed');

        $added = collect($files)->reduce(function ($count, $file) use ($zip) {
            $full = storage_path("app/private/" . ltrim($file, '/'));
            return file_exists($full) && $zip->addFile($full, basename($file)) ? $count + 1 : $count;
        }, 0);

        $zip->close();
        abort_if($added === 0 || !file_exists($zipPath), 404, 'No export files to download');

        if (ob_get_length()) ob_end_clean();
        return response()->download($zipPath, $zipName, [
            'Content-Type' => 'application/zip',
            'Content-Length' => filesize($zipPath),
        ]);
    })->middleware('auth');

















    Route::get('/google/auth', [GoogleAuthController::class, 'redirect'])->name('google.auth');
    Route::get('/authenticated-accounts', [GoogleAuthController::class, 'getAuthenticatedAccounts'])->name('authenticated.accounts');

    // Email Controller Routes
    Route::group(['middleware' => 'web'], function () {
        Route::get('/fetch-bulk-emails', [EmailController::class, 'fetchBulkEmails'])->name('fetch.bulk.emails');
        Route::get('/start-realtime-emails', [EmailController::class, 'startRealTimeFetch'])->name('start.realtime.emails');
        Route::get('/cancel-fetch', [EmailController::class, 'cancelFetch'])->name('cancel.fetch');
        Route::get('/fetch-status', [EmailController::class, 'fetchStatus'])->name('fetch.status');
        Route::get('/fetch-emails', [EmailController::class, 'fetchEmails'])->name('fetch.emails');
        Route::get('/auth/google', [EmailController::class, 'redirectToGoogle']);

        Route::get('/email-counts', [EmailController::class, 'emailCounts'])->name('email.counts');
        Route::post('/delete-emails', [EmailController::class, 'deleteEmails'])->name('delete.emails');
        Route::post('/update-email-status', [EmailController::class, 'updateEmailStatus'])->name('update.email.status');
        Route::get('/get-labels', [EmailController::class, 'getLabels']);
        Route::get('/filter-keywords', [EmailController::class, 'getFilterKeywords']);
        Route::get('/fetch-email-content', [EmailController::class, 'fetchEmailContent']);
        Route::get('/debug-email', [EmailController::class, 'debugEmail']);
        Route::get('/test-email-data', [EmailController::class, 'testEmailData']);
        Route::get('/test-gmail-count', [EmailController::class, 'testGmailCount']);
        Route::get('/email-count', [EmailController::class, 'getEmailCount']);
        Route::get('/fetch-emails-by-date', [EmailController::class, 'fetchEmailsByDate']);
        Route::get('/fetch-new-emails', [EmailController::class, 'fetchNewEmails']);
        Route::get('/fetch-current-emails', [EmailController::class, 'fetchCurrentEmails']);
        Route::get('/fetch-current-email-count', [EmailController::class, 'fetchCurrentEmailCount']);
        Route::get('/check-stored-emails', [EmailController::class, 'checkStoredEmails']);
        Route::get('/fetch-initial-emails', [EmailController::class, 'fetchInitialEmails']);
        Route::get('/debug-database-content', [EmailController::class, 'debugDatabaseContent']);
        Route::get('/sync-status', [EmailController::class, 'getSyncStatus']);
        Route::post('/reset-sync', [EmailController::class, 'resetSyncStatus'])->name('reset.sync');
        Route::post('/email-action', [EmailController::class, 'emailAction'])->name('email.action');
        Route::post('/trigger-sync', [EmailController::class, 'triggerOnDemandSync'])->name('trigger.sync');
        Route::get('/sync-status', [EmailController::class, 'getSyncStatus'])->name('sync.status');
        Route::get('/all-sync-status', [EmailController::class, 'getAllSyncStatus'])->name('all.sync.status');
        Route::post('/reset-sync', [EmailController::class, 'resetSyncStatus'])->name('reset.sync');
        Route::post('/start-live-fetch', [EmailController::class, 'startLiveFetch'])->name('start.live.fetch');
        Route::post('/switch-account', [EmailController::class, 'switchAccount'])->name('switch.account');
        Route::get('/engage', [EmailController::class, 'index'])->name('engage');
        Route::group(['middleware' => ['auth']], function () {
            Route::get('/keywords', [EmailController::class, 'getKeywords'])->name('keywords.index');
            Route::post('/keywords', [EmailController::class, 'storeKeyword'])->name('keywords.store');
            Route::delete('/keywords/{id}', [EmailController::class, 'deleteKeyword'])->name('keywords.destroy');
        });
        Route::post('/skeleton-action/{id}', [SkeletonController::class, 'handle']);

        Route::get('email-system/mail-config', function () {
            return view('system.central.email-system.mail-config');
        })->name('email-system/mail-config');
        Route::post('/pre-save-google-account', [EmailController::class, 'preSaveGoogleAccount'])->name('google.pre.save');
        Route::post('/api/email-accounts', [EmailController::class, 'store']);

        Route::post('/api/email-autodetect', [EmailController::class, 'autoDetect']);
        Route::post('/api/email-test-connection', [EmailController::class, 'testConnection']);
        Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
        // Route::get('/auth/google/callback-new', [EmailMarketingController::class, 'handleGoogleCallback'])->name('auth.google.callback');
        Route::get('/api/timezones', [EmailController::class, 'getTimezones']);
        Route::get('/custom-labels', [EmailController::class, 'getCustomLabels'])->middleware('auth');
    });

    // Email Marketing Controller Routes
    Route::post('/send-test-email', [EmailMarketingController::class, 'sendTestEmail']);
    Route::get('/email-scheduler', [EmailMarketingController::class, 'index'])->name('email-scheduler');
    Route::get('/system/central/email-system/mail-config', [EmailMarketingController::class, 'mailConfig']);
    Route::get('/audiences/{id}', [EmailMarketingController::class, 'showAudience'])->name('audiences.show');
    Route::put('/api/email-accounts/{id}', [EmailMarketingController::class, 'updateEmailAccount']);
    Route::post('/api/send-email', [EmailMarketingController::class, 'sendEmail']);
    Route::post('/api/schedule-email', [EmailMarketingController::class, 'scheduleEmail']);
    Route::get('/api/campaigns/{campaignId}/progress', [EmailMarketingController::class, 'getCampaignProgress']);
    Route::get('/api/track/{campaignId}/{subscriberId}/{eventType}', [EmailMarketingController::class, 'trackEmailEvent']);
    Route::get('/timezones', [EmailMarketingController::class, 'getTimezones']);
    Route::get('/api/email-accounts', [EmailMarketingController::class, 'getEmailAccounts']);
    Route::get('/api/campaigns/{id}', [EmailMarketingController::class, 'showCampaign']);
    Route::get('/api/email-account-placeholders', [EmailMarketingController::class, 'getEmailAccountPlaceholders']);
    Route::get('/email-accounts-by-region', [EmailMarketingController::class, 'getEmailAccountsByRegion']);
    Route::get('/api/quota-info', [EmailMarketingController::class, 'getQuotaInfo']);
    Route::prefix('api')->group(function () {
        Route::get('/campaigns/{campaignId}/progress', [EmailMarketingController::class, 'getCampaignProgress']);
        Route::get('/campaign-progress/recent', [EmailMarketingController::class, 'getRecentCampaignProgress']);
        Route::get('/audiences', [EmailMarketingController::class, 'getAudiences']);
        Route::get('/audiences/{id}', [EmailMarketingController::class, 'getAudience']);
        Route::post('/audiences', [EmailMarketingController::class, 'storeAudience']);
        Route::put('/audiences/{id}', [EmailMarketingController::class, 'updateAudience']);
        Route::delete('/audiences/{id}', [EmailMarketingController::class, 'deleteAudience']);
        Route::get('/email-scheduling', [EmailMarketingController::class, 'index']);
        Route::get('/templates', [EmailMarketingController::class, 'getTemplates']);
        Route::post('/templates', [EmailMarketingController::class, 'storeTemplate']);
        Route::put('/templates/{id}', [EmailMarketingController::class, 'updateTemplate']);
        Route::delete('/templates/{id}', [EmailMarketingController::class, 'deleteTemplate']);
        Route::get('/templates/{id}/preview', [EmailMarketingController::class, 'previewTemplate']);
        Route::post('/subscribers/bulk', [EmailMarketingController::class, 'bulkStoreSubscribers']);
        Route::get('/audiences/{audiencesId}/subscribers', [EmailMarketingController::class, 'getSubscribersByAudience']);
        Route::put('/subscribers/{id}/subscribe', [EmailMarketingController::class, 'subscribeSubscriber']);
        Route::put('/subscribers/{id}/unsubscribe', [EmailMarketingController::class, 'unsubscribeSubscriber']);
        Route::put('/subscribers/{id}', [EmailMarketingController::class, 'updateSubscriber']);
        Route::delete('/subscribers/{id}', [EmailMarketingController::class, 'deleteSubscriber']);
        Route::get('/campaigns', [EmailMarketingController::class, 'getCampaigns']);
        Route::post('/campaigns', [EmailMarketingController::class, 'storeCampaign']);
        Route::put('/campaigns/{id}', [EmailMarketingController::class, 'updateCampaign']);
        Route::delete('/campaigns/{id}', [EmailMarketingController::class, 'deleteCampaign']);
        Route::get('/send-settings', [EmailMarketingController::class, 'getSendSettings']);
        Route::post('/send-settings', [EmailMarketingController::class, 'storeSendSettings']);
    });

    // Drift Controller Routes
    // --- Added for Drift Emails web UI ---
    Route::get('/drift/sets', [DriftController::class, 'getSets']);
    Route::get('/drift/sequences', [DriftController::class, 'getSequences']);
    Route::post('/drift/templates', [DriftController::class, 'store']);
    Route::get('/drift/templates', [DriftController::class, 'getTemplates']);
    Route::get('/drift/templates/{id}', [DriftController::class, 'getTemplates']);
    Route::get('/drift/templates/{id}/preview', [DriftController::class, 'previewTemplate']);
    Route::get('/drift/audiences', [DriftController::class, 'getAudiences']);
    Route::get('/drift/email-accounts', [DriftController::class, 'getEmailAccounts']);
    Route::get('/drift/timezones', [DriftController::class, 'getTimezones']);
    Route::get('/drift/reports/{sequenceId}', [DriftController::class, 'reports']);
    Route::get('/drift/subscribers', [DriftController::class, 'index']);
    Route::post('/drift/send', [DriftController::class, 'send']);
    Route::post('/drift/save-sequences', [DriftController::class, 'saveSequences']);
    Route::post('/drift/create-set-with-sequences', [DriftController::class, 'createSetWithSequences']);
    Route::delete('/drift/sets/{setId}', [DriftController::class, 'deleteSet']);
    Route::get('/api/audience/{audienceId}/subscriber-count', [DriftController::class, 'getSubscriberCount']);
    Route::get('/api/email-accounts/active', [DriftController::class, 'getActiveEmailAccounts']);
    // --- End Drift Emails web UI routes ---
    Route::get('/drift/unsubscribe/{subscriber_id}/{sequence_id}', [DriftController::class, 'unsubscribe'])->name('drift.unsubscribe');
    Route::get('/drift/report-filters', function (Request $request) {
        // You can replace this array with a DB query if needed
        $filters = [
            ['id' => 'sent', 'name' => 'Sent'],
            ['id' => 'no_longer', 'name' => 'No Longer'],
            ['id' => 'automatic_reply', 'name' => 'Automatic Reply'],
            ['id' => 'replied', 'name' => 'Replied'],
            ['id' => 'unsubscribed', 'name' => 'Unsubscribed'],
            ['id' => 'softbounce', 'name' => 'Softbounce'],
            ['id' => 'hardbounce', 'name' => 'Hardbounce'],
            ['id' => 'unopened', 'name' => 'Unopened'],
        ];
        return response()->json($filters);
    });
    Route::delete('api/drift/sequences/{sequenceId}', [DriftController::class, 'deleteSequence']);
    Route::post('/drift/sequences', [DriftController::class, 'createSequence']);
    Route::get('api/drift/sets', [DriftController::class, 'getSets']);
    Route::delete('/api/drift/sets/{setId}', [DriftController::class, 'deleteSet']);
    Route::post('/drift/sequences/{sequenceId}/send', [DriftController::class, 'sendSequence']);
    Route::post('/api/drift/sequences/{sequenceId}/schedule', [DriftController::class, 'scheduleSequence']);
    Route::post('drift/sequences/{sequenceId}/preview', [DriftController::class, 'previewSequence']);
    Route::prefix('api/drift')->middleware('auth')->group(function () {
        Route::post('/save-sequences', [DriftController::class, 'saveSequences']);
        Route::post('/send', [DriftController::class, 'send']);
        Route::post('/schedule', [DriftController::class, 'schedule']);
        Route::post('/pause/{sequenceId}', [DriftController::class, 'pause']);
        Route::post('/resume/{sequenceId}', [DriftController::class, 'resume']);
        Route::post('/cancel/{sequenceId}', [DriftController::class, 'cancel']);
        Route::get('/reports/{sequenceId}', [DriftController::class, 'reports']);
        Route::post('/filter/{sequenceId}', [DriftController::class, 'filter']);
        Route::get('api/drift/sequences', [DriftController::class, 'getSequences']);
        Route::post('sets', [DriftController::class, 'createSet']);
        Route::post('api/drift/create-set-with-sequences', [DriftController::class, 'createSet']);
        Route::post('api/drift/save-sequence', [DriftController::class, 'saveSequence']);
        Route::post('preview', [DriftController::class, 'preview']);
        Route::post('/drift/sequences/save', [DriftController::class, 'saveSequence']);
        Route::get('/drift/reports/{sequenceId}', [DriftController::class, 'reports'])->name('drift.reports');
        Route::delete('api/drift/sequences/{sequenceId}', [DriftController::class, 'deleteSequence']);
        Route::post('api/drift/save-sequences', [DriftController::class, 'saveSequences']);
    });
    Route::middleware('auth')->group(function () {
        Route::get('/api/templates', [DriftController::class, 'getTemplates']);
        Route::post('/templates', [DriftController::class, 'saveTemplate']);
        Route::get('/api/audiences', [DriftController::class, 'getAudiences']);
        Route::post('/drift/audiences', [\App\Http\Controllers\System\Central\EmailSystem\DriftController::class, 'saveAudience']);
        Route::post('/drift/audiences/import', [\App\Http\Controllers\System\Central\EmailSystem\DriftController::class, 'importAudience']);
        Route::post('/api/audiences/import', [DriftController::class, 'importAudience']);
        Route::post('/drift/audiences/import-mapped', [\App\Http\Controllers\System\Central\EmailSystem\DriftController::class, 'importMappedAudience']);
        Route::get('/api/email-accounts', [DriftController::class, 'getEmailAccounts']);
        Route::get('/api/timezones', [DriftController::class, 'getTimezones']);
        Route::get('api/drift/sequence-category-emails', [DriftController::class, 'getCategoryEmailsForNextSequence']);
        Route::post('/drift/preview', [DriftController::class, 'preview']);
        Route::get('/templates/{id}/preview', [DriftController::class, 'previewTemplate']);
        Route::get('/subscribers', [DriftController::class, 'index']);
        Route::get('/email-accounts', [DriftController::class, 'getEmailAccounts']);
        Route::get('/audiences', [DriftController::class, 'getAudiences']);
        Route::get('api/drift/sets/count', [DriftController::class, 'getSetCount']);
        Route::post('api/drift/create-set-with-sequences', [DriftController::class, 'createSetWithSequences']);

        // Audience CSV Import Routes
        Route::post('/audience/upload-csv', [\App\Http\Controllers\System\Central\EmailSystem\EmailMarketingController::class, 'uploadCsv']);
        Route::post('/audience/process-csv', [\App\Http\Controllers\System\Central\EmailSystem\EmailMarketingController::class, 'processCsv']);
        Route::get('/audience/import-progress', [\App\Http\Controllers\System\Central\EmailSystem\EmailMarketingController::class, 'importProgress']);
        Route::get('/audience/download-csv', [\App\Http\Controllers\System\Central\EmailSystem\EmailMarketingController::class, 'downloadCsv']);
    });
    Route::get('/drift/quota-info', [DriftController::class, 'getQuotaInfo']);
    Route::post('/drift/audiences/upload-csv', [\App\Http\Controllers\System\Central\EmailSystem\DriftController::class, 'uploadCsv']);
    Route::post('/drift/audiences/process-csv', [\App\Http\Controllers\System\Central\EmailSystem\DriftController::class, 'processCsv']);
    Route::get('/drift/audiences/import-progress', [\App\Http\Controllers\System\Central\EmailSystem\DriftController::class, 'importProgress']);
    Route::get('/drift/audiences/download-csv', [\App\Http\Controllers\System\Central\EmailSystem\DriftController::class, 'downloadCsv']);

    // Campaign CSV Import Routes
    Route::post('/campaign/upload-csv', [\App\Http\Controllers\System\Central\EmailSystem\EmailMarketingController::class, 'uploadCsvCampaign']);
    Route::post('/campaign/process-csv', [\App\Http\Controllers\System\Central\EmailSystem\EmailMarketingController::class, 'processCsvCampaign']);
    Route::get('/campaign/import-progress', [\App\Http\Controllers\System\Central\EmailSystem\EmailMarketingController::class, 'importProgressCampaign']);
    Route::get('/campaign/download-csv', [\App\Http\Controllers\System\Central\EmailSystem\EmailMarketingController::class, 'downloadCsvCampaign']);
});

Route::get('/auth/google/callback-new', [GoogleAuthController::class, 'callback'])->name('google.callback');

// Broadcasting routes for real-time email updates
Broadcast::routes(['middleware' => ['auth']]);

// Test broadcasting route
Route::get('/test-broadcast', function () {
    event(new App\Events\EmailSyncCompleted('test@example.com', 'inbox', 5, 100));
    return response()->json(['message' => 'Broadcast test sent']);
})->middleware('auth');

// Test email system route
Route::get('/test-email-system', function () {
    return response()->json([
        'status' => 'Email system is working',
        'broadcasting' => config('broadcasting.default'),
        'reverb_host' => config('broadcasting.connections.reverb.options.host'),
        'reverb_port' => config('broadcasting.connections.reverb.options.port'),
        'timestamp' => now()->toISOString()
    ]);
})->middleware('auth');

// Test simple email loading route
Route::get('/test-email-loading', function () {
    return response()->json([
        'message' => 'Email loading system is working',
        'cache_system' => 'Simple Map-based cache',
        'polling_fallback' => '30-second polling when broadcasting fails',
        'instant_loading' => 'Cache-based instant display'
    ]);
})->middleware('auth');
