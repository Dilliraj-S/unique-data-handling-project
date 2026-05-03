<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
// use App\Facades\Permission;

/**
 * Controller for protected dashboard.
 */
class DashboardController extends Controller
{
    /**
     * Show dashboard with permission check.
     *
     * @return \Illuminate\View\View
     */
    public function index()
    {
        try {
            // if (!Permission::hasPermission('Dashboard::Home')) {
            //     abort(403, 'Unauthorized.');
            // }

            return view('dashboard');
        } catch (\Exception $e) {
            \Log::error('Dashboard error: ' . $e->getMessage());
            abort(500, 'Error loading dashboard.');
        }
    }
}