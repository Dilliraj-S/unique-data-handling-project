<?php

namespace App\Http\Controllers\Authorization;

use App\Facades\{Database, Developer, Skeleton, Data};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;
use App\Http\Classes\AgentHelper;

/**
 * Controller for handling authentication operations, including login and social login.
 */
class AuthorizationController extends Controller
{
    /**
     * Show the login form.
     *
     * @param Request $request
     * @return \Illuminate\View\View|\Illuminate\Http\JsonResponse|\Illuminate\Http\Response
     */
    public function showLoginForm(Request $request)
    {
        try {
            return view('auth.login');
        } catch (Exception $e) {
            Developer::error('Failed to load login form', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->handleError($request, config('developer.mode') ? $e->getMessage() : 'Error loading login page.', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
    /**
     * Handle user login with validation and connection setup.
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse|\Illuminate\Http\JsonResponse|\Illuminate\Http\Response
     */
    public function login(Request $request)
    {
        try {
            $credentials = $request->validate([
                'username' => 'required|string',
                'password' => 'required|string',
                'remember' => 'nullable|boolean',
            ]);
            if (
                Auth::attempt([
                    'username' => $credentials['username'],
                    'password' => $credentials['password'],
                    'account_status' => 'active',
                ], $request->boolean('remember', false))
            ) {
                $user = Auth::user();
                if ($user->business_id !== 'CENTRAL') {
                    Database::setupBusinessConnection($user->business_id);
                }
                $request->session()->regenerate();
                $user->last_seen = now();
                $user->last_login_at = now();
                $user->save();
                Developer::info('User logged in successfully', [
                    'user_id' => $user->id,
                    'business_id' => $user->business_id,
                ]);
                $validated = [
                    'user_id' => $user->user_id,
                    'username' => $user->username,
                    'login_time' => now(),
                    'logout_time' => null,
                    'platform' => 'UniQue by RDLS',
                    'device' => AgentHelper::getAgentInfo('deviceType'),
                    'os' => AgentHelper::getAgentInfo('platform'),
                    'browser' => AgentHelper::getAgentInfo('browser'),
                    'ip_address' => $request->ip(),
                ];
                Data::create('central', 'login_history', $validated, 'User Login History');
                Data::create('central', 'activity_history', [
                    'user_id'     => $user->user_id,
                    'username'    => $user->username,
                    'ip_address'  => $request->ip(),
                    'browser'     => AgentHelper::getAgentInfo('browser'),
                    'device'      => AgentHelper::getAgentInfo('deviceType'),
                    'action'      => 'login',
                    'description' => 'User logged in successfully',

                ], 'User Activity History');
                Log::info('User login history recorded', [
                    'user_id' => $user->user_id,
                    'ip_address' => $request->ip(),
                    'data' => $validated,
                ]);
                return redirect()->intended('/main-menu/dashboard');
            }
            throw ValidationException::withMessages([
                'username' => ['Invalid credentials or inactive account.'],
            ]);
        } catch (ValidationException $e) {
            Developer::warning('Login validation failed', [
                'errors' => $e->errors(),
                'input' => $request->except('password'),
            ]);
            throw $e;
        } catch (Exception $e) {
            Developer::error('Login attempt failed', [
                'error' => $e->getMessage(),
                'input' => $request->except('password'),
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->handleError($request, 'Login failed. Please try again.', Response::HTTP_UNAUTHORIZED);
        }
    }

    /**
     * Handle user logout with cleanup.
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse|\Illuminate\Http\JsonResponse|\Illuminate\Http\Response
     */
    public function logout(Request $request)
    {
        try {
            Skeleton::clearUserCache();
            $user = Auth::user();
            if ($user) {
                $user->last_seen = now();
                $user->save();
            }
            unset($user->system, $user->role, $user->roles, $user->employee, $user->permissions, $user->sidebar, $user->connection);
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            $validated = [
                'logout_time' => now(),
            ];
            $latestLogin = DB::connection('central')
                ->table('login_history')
                ->where('user_id', $user->user_id)
                ->whereNull('logout_time')
                ->orderByDesc('login_time') // or 'created_at' if that's what you're using
                ->first();

            if ($latestLogin) {
                DB::connection('central')
                    ->table('login_history')
                    ->where('id', $latestLogin->id)
                    ->update(['logout_time' => now()]);
            }
            Log::info('User logout history updated', [
                'LatestLogin' => $latestLogin,
                'logout_time' => now(),
                'data' => $validated,
            ]);
            return redirect()->route('login')->with('status', 'Logged out successfully.');
        } catch (Exception $e) {
            return $this->handleError($request, 'Logout failed: ' . $e->getMessage(), Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
    public function submitVerification(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'birth_date' => 'nullable|date',
            'email' => 'nullable|email|max:255',
            'gender' => 'required|in:Male,Female,Others',
            'phone' => 'required|string|regex:/^[0-9\-\+\s\(\)]{7,15}$/',
            'address_line1' => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'landmark' => 'nullable|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'required|string|max:100',
            'pin_code' => 'required|string|max:20',
        ]);

        $user = Auth::user();

        if (!$user) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'User not authenticated.'], 401);
            }
            return redirect()->route('login')->withErrors('User not authenticated.');
        }

        $addressJson = json_encode([
            'address_line1' => $validated['address_line1'],
            'address_line2' => $validated['address_line2'] ?? '',
            'landmark' => $validated['landmark'] ?? '',
            'city' => $validated['city'],
            'state' => $validated['state'],
            'pin_code' => $validated['pin_code'],
        ]);

        // Update `users` table
        DB::table('users')->where('user_id', $user->user_id)->update([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'verification' => 'verified',
            'updated_at' => now(),
        ]);

        // Update `user_data` table
        DB::table('user_data')->where('user_id', $user->user_id)->update([
            'birth_date' => $validated['birth_date'],
            'gender' => $validated['gender'],
            'phone' => $validated['phone'],
            'address_json' => $addressJson,
            'updated_at' => now(),
        ]);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Verification completed successfully.']);
        }
        $user->refresh();

        return redirect()->route('dashboard')->with('success', 'Verification completed successfully.');
    }

    /** 
     * Redirect the user to the social provider's authentication page.
     *
     * @param string $provider
     * @return \Symfony\Component\HttpFoundation\RedirectResponse
     */
    public function redirectToProvider(string $provider)
    {
        try {
            $allowedProviders = ['google', 'facebook', 'github'];
            if (!in_array($provider, $allowedProviders)) {
                throw new Exception('Invalid social login provider.');
            }
            return Socialite::driver($provider)->redirect();
        } catch (Exception $e) {
            Developer::error('Failed to redirect to social provider', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return redirect()->route('login')->withErrors(['provider' => 'Unable to connect to ' . ucfirst($provider) . '.']);
        }
    }
    /**
     * Handle callback from social provider and authenticate user.
     *
     * @param string $provider
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse|\Illuminate\Http\JsonResponse|\Illuminate\Http\Response
     */
    public function handleProviderCallback(string $provider, Request $request)
    {
        try {
            $allowedProviders = ['google', 'facebook', 'github'];
            if (!in_array($provider, $allowedProviders)) {
                throw new Exception('Invalid social login provider.');
            }
            $socialUser = Socialite::driver($provider)->user();
            $user = $this->findOrCreateSocialUser($socialUser, $provider);
            if ($user->account_status !== 'active') {
                throw new Exception('Account is not active.');
            }
            Auth::login($user, true);
            $request->session()->regenerate();
            if ($user->business_id !== 'CENTRAL') {
                Database::setupBusinessConnection($user->business_id);
            }
            Developer::info('Social login successful', [
                'user_id' => $user->id,
                'provider' => $provider,
                'provider_id' => $socialUser->id,
            ]);
            return redirect()->intended('/main-menu/dashboard');
        } catch (Exception $e) {
            Developer::error('Social login failed', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return redirect()->route('login')->withErrors(['provider' => 'Social login failed. Please try again.']);
        }
    }
    /**
     * Find or create a user based on social provider data.
     *
     * @param mixed $socialUser
     * @param string $provider
     * @return \App\Models\User
     */
    protected function findOrCreateSocialUser($socialUser, string $provider)
    {
        $user = \App\Models\User::where('provider', $provider)
            ->where('provider_id', $socialUser->id)
            ->first();
        if (!$user) {
            $user = \App\Models\User::create([
                'username' => $socialUser->email ?? 'user_' . $socialUser->id,
                'email' => $socialUser->email,
                'name' => $socialUser->name,
                'provider' => $provider,
                'provider_id' => $socialUser->id,
                'account_status' => 'active',
                'business_id' => 'CENTRAL',
            ]);
        }
        return $user;
    }
    /**
     * Handle errors with developer mode support.
     *
     * @param Request $request
     * @param string $message
     * @param int $statusCode
     * @return \Illuminate\Http\JsonResponse|\Illuminate\Http\Response
     */
    protected function handleError(Request $request, string $message, int $statusCode)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'status' => false,
                'data' => [],
                'message' => $message,
            ], $statusCode);
        }
        $errorView = "errors.{$statusCode}";
        if (View::exists($errorView)) {
            return response()->view($errorView, ['error' => $message], $statusCode);
        }
        return response()->view('errors.generic', ['error' => $message, 'status' => $statusCode], $statusCode);
    }
}
