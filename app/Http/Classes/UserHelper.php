<?php

namespace App\Http\Classes;

use Exception;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\UserData;

class UserHelper
{
    /* ----------------------------------------------------------------------------------------------
    Current User Data
    ---------------------------------------------------------------------------------------------- */
    public static function getCurrentUser($data)
    {
        if (!Auth::check()) {
            Auth::logout();
            session()->flush();
            //return redirect('/login')->send();
        }
        $user = Auth::user();
        if (!$user) {
            return null;
        }
        return match ($data) {
            'id', 'gotit_id', 'org_id', 'first_name', 'last_name', 'profile', 'role', 'nxt_role', 'phone', 'email', 'verified_user', 'account_status', 'storage', 'username', 'org_id' => self::convertToString($user->$data ?? ''),
            'name' => self::convertToString(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
            default => null,
        };
    }
    
    public static function getCurrentUserData($gotit_id, $column)
    {
        $userDetail = UserData::where('gotit_id', $gotit_id)->first();
        return $userDetail ? $userDetail->$column : null;
    }
    
    private static function convertToString($value)
    {
        return $value !== null ? (string) $value : '';
    }

    private static function getShortRole($role)
    {
        $roles = [
            'admin' => 'AD',
            'billing' => 'BL',
            'client' => 'CL',
            'technician' => 'TC',
            'technician-support' => 'TS',
            'customer-support' => 'CS',
        ];

        return $roles[$role] ?? '';
    }

    /* ----------------------------------------------------------------------------------------------
    User Data Retrieval
    ---------------------------------------------------------------------------------------------- */
    public static function getData($id)
    {
        return User::where('gotit_id', $id)->first() ?? '<option>Not found (E)</option>';
    }

    /* ----------------------------------------------------------------------------------------------
    Generic Column Data Retrieval
    ---------------------------------------------------------------------------------------------- */
    public static function getColumnData($id, $value)
    {
        return User::where('gotit_id', $id)->value($value) ?? 'Not Found.';
    }

    /* ----------------------------------------------------------------------------------------------
    User Name Retrieval (First name + Last name)
    ---------------------------------------------------------------------------------------------- */
    public static function getName($id)
    {
        $user = User::where('gotit_id', $id)->select('first_name', 'last_name')->first();
        return $user ? $user->first_name . ' ' . $user->last_name : 'Not Found.';
    }

    /* ----------------------------------------------------------------------------------------------
    Users by Role
    ---------------------------------------------------------------------------------------------- */
    private static function generateOptions($users, $selectedIds = [])
    {
        return implode('', array_map(function ($user) use ($selectedIds) {
            $isSelected = is_array($selectedIds) ? in_array($user->gotit_id, $selectedIds) : ($selectedIds == $user->gotit_id);
            return '<option value="' . $user->gotit_id . '" ' . ($isSelected ? 'selected' : '') . '>' . ucwords(str_replace('_', ' ', $user->name)) . '</option>';
        }, $users->toArray()));
    }

    public static function getUsersByRole($role)
    {
        $users = User::where('role', $role)->get();
        return $users->isEmpty() ? '<option>Not found (E)</option>' : self::generateOptions($users);
    }

    public static function getUsersByOrg($org_id)
    {
        return User::where('org_id', $org_id)->pluck('gotit_id')->toArray();
    }

    public static function getUsersByRoleSelected($role, $selectedIds)
    {
        $users = User::where('role', $role)->get();
        return $users->isEmpty() ? '<option>Not found (E)</option>' : self::generateOptions($users, $selectedIds);
    }

    /* ----------------------------------------------------------------------------------------------
    User IDs by Role
    ---------------------------------------------------------------------------------------------- */
    public static function getUserIdsByRole($role)
    {
        return User::where('role', $role)->pluck('gotit_id')->toArray();
    }

/* ----------------------------------------------------------------------------------------------
    Create User From Socialite
    ---------------------------------------------------------------------------------------------- */
    public static function createUserFromSocialite($socialUser, $provider, $referralCode = null)
    {
        try {
            if (!$socialUser || !$provider) {
                throw new \InvalidArgumentException("Invalid social user or provider data.");
            }
    
            $userData = [];
            $uniqueId = null;
            try {
                do {
                    $uniqueId = 'CLI-' . RandomHelper::generateUniqueId(7);
                } while (User::where('gotit_id', $uniqueId)->exists());
            } catch (\Exception $e) {
                throw new \Exception("Failed to generate unique ID: " . $e->getMessage());
            }
            switch ($provider) {
                case 'facebook':
                    $userData = [
                        'first_name'       => isset($socialUser->user['name']) ? explode(' ', $socialUser->user['name'])[0] : null,
                        'last_name'        => isset($socialUser->user['name']) ? explode(' ', $socialUser->user['name'], 2)[1] ?? null : null,
                        'username'         => $socialUser->user['email'],
                        'email'            => $socialUser->user['email'] ?? null,
                        'profile'  => $socialUser->attributes['avatar_original'] ?? $socialUser->attributes['avatar'] ?? null,
                        'phone'            => null, 
                        'location'         => null,
                        'provider'         => $provider,
                        'provider_id'      => $socialUser->attributes['id'] ?? $socialUser->user['id'],
                        'provider_token'   => $socialUser->token,
                        'role'             => 'client',
                        'gotit_id'        => $uniqueId,
                        'refer_from'       => $referralCode ?? null,
                        'email_verified'   => 'yes',
                    ];
                    break;
    
                case 'github':
                    $userData = [
                        'first_name'       => isset($socialUser->user['name']) ? explode(' ', $socialUser->user['name'])[0] : null,
                        'last_name'        => isset($socialUser->user['name']) ? explode(' ', $socialUser->user['name'], 2)[1] ?? null : null,
                        'username'         => $socialUser->user['email'],
                        'email'            => $socialUser->attributes['email'] ?? $socialUser->user['email'] ?? null,
                        'profile'  => $socialUser->attributes['avatar'] ?? $socialUser->user['avatar_url'] ?? null,
                        'phone'            => null,
                        'location'         => $socialUser->user['location'] ?? null,
                        'provider'         => $provider,
                        'provider_id'      => $socialUser->attributes['id'] ?? $socialUser->user['id'],
                        'provider_token'   => $socialUser->token,
                        'role'             => 'client',
                        'gotit_id'        => $uniqueId,
                        'refer_from'       => $referralCode ?? null,
                        'email_verified'   => 'yes',
                    ];
                    break;
    
                case 'x':
                    $userData = [
                        'first_name'       => isset($socialUser->user['name']) ? explode(' ', $socialUser->user['name'])[0] : null,
                        'last_name'        => isset($socialUser->user['name']) ? explode(' ', $socialUser->user['name'], 2)[1] ?? null : null,
                        'username'         => $socialUser->attributes['nickname'] ?? $socialUser->user['username'] ?? null,
                        'email'            => $socialUser->user['email'] ?? null,
                        'profile'  => $socialUser->attributes['avatar'] ?? $socialUser->user['profile_image_url'] ?? null,
                        'phone'            => null,
                        'location'         => null,
                        'provider'         => $provider,
                        'provider_id'      => $socialUser->attributes['id'] ?? $socialUser->user['id'],
                        'provider_token'   => $socialUser->token,
                        'role'             => 'client',
                        'gotit_id'        => $uniqueId,
                        'refer_from'       => $referralCode ?? null,
                        'email_verified'   => 'no',
                    ];
                    break;
    
                case 'google':
                    $userData = [
                        'first_name'       => $socialUser->user['given_name'] ?? null,
                        'last_name'        => $socialUser->user['family_name'] ?? null,
                        'username'         => $socialUser->user['email'],
                        'email'            => $socialUser->user['email'] ?? null,
                        'profile'  => $socialUser->user['picture'] ?? $socialUser->attributes['avatar_original'] ?? $socialUser->attributes['avatar'] ?? null,
                        'phone'            => null,
                        'location'         => null,
                        'provider'         => $provider,
                        'provider_id'      => $socialUser->attributes['id'] ?? $socialUser->user['sub'],
                        'provider_token'   => $socialUser->token,
                        'role'             => 'client',
                        'gotit_id'        => $uniqueId,
                        'refer_from'       => $referralCode ?? null,
                        'email_verified'   => $socialUser->user['email_verified'] ? 'yes' : 'no',
                    ];
                    break;

                    case 'linkedin':
                        $userData = [
                            'first_name'       => $socialUser->user['localizedFirstName'] ?? null,
                            'last_name'        => $socialUser->user['localizedLastName'] ?? null,
                            'username'         => $socialUser->user['emailAddress'] ?? $socialUser->user['id'] ?? null, // LinkedIn may not provide email
                            'email'            => $socialUser->user['emailAddress'] ?? null,
                            'profile'  => $socialUser->user['profilePicture']['displayImage'] ?? null, // LinkedIn's profile picture structure can be complex
                            'phone'            => null,
                            'location'         => $socialUser->user['location']['name']['localized']['en_US'] ?? null, // Adjust locale as needed
                            'provider'         => $provider,
                            'provider_id'      => $socialUser->user['id'] ?? null,
                            'provider_token'   => $socialUser->token,
                            'role'             => 'client',
                            'gotit_id'        => $uniqueId,
                            'refer_from'       => $referralCode ?? null,
                            'email_verified'   => 'yes', // LinkedIn typically verifies emails
                        ];
                        break;
        
                    case 'microsoft':
                        $userData = [
                            'first_name'       => $socialUser->user['givenName'] ?? null,
                            'last_name'        => $socialUser->user['surname'] ?? null,
                            'username'         => $socialUser->user['userPrincipalName'] ?? $socialUser->user['email'] ?? null,
                            'email'            => $socialUser->user['userPrincipalName'] ?? $socialUser->user['email'] ?? null,
                            'profile'  => $socialUser->user['picture'] ?? null, // Depending on Microsoft API
                            'phone'            => $socialUser->user['phone'] ?? null,
                            'location'         => $socialUser->user['officeLocation'] ?? null,
                            'provider'         => $provider,
                            'provider_id'      => $socialUser->user['id'] ?? null,
                            'provider_token'   => $socialUser->token,
                            'role'             => 'client',
                            'gotit_id'        => $uniqueId,
                            'refer_from'       => $referralCode ?? null,
                            'email_verified'   => 'yes', // Microsoft typically verifies emails
                        ];
                        break;
        
                    case 'apple':
                        $userData = [
                            'first_name'       => $socialUser->user['firstName'] ?? null, // Apple may only provide on first login
                            'last_name'        => $socialUser->user['lastName'] ?? null,  // Apple may only provide on first login
                            'username'         => $socialUser->user['email'] ?? $socialUser->user['sub'] ?? null,
                            'email'            => $socialUser->user['email'] ?? null,
                            'profile'  => null, // Apple doesn't provide profile pictures
                            'phone'            => null,
                            'location'         => null,
                            'provider'         => $provider,
                            'provider_id'      => $socialUser->user['sub'] ?? null,
                            'provider_token'   => $socialUser->token,
                            'role'             => 'client',
                            'gotit_id'        => $uniqueId,
                            'refer_from'       => $referralCode ?? null,
                            'email_verified'   => isset($socialUser->user['email_verified']) && $socialUser->user['email_verified'] ? 'yes' : 'no',
                        ];
                        break;
    
                default:
                    throw new \InvalidArgumentException("Unsupported provider: $provider");
            }
            try {
                $user = User::create($userData);
            } catch (\Exception $e) {
                throw new \Exception("Failed to create user: " . $e->getMessage());
            }

            return $user;
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            return response()->json(['error' => 'An error occurred while creating the user.'], 500);
        }
    }
    
}
