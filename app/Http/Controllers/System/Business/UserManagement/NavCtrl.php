<?php

namespace App\Http\Controllers\System\Business\UserManagement;

use App\Facades\{Developer, Skeleton, Data};
use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\{Config, Log, View};

/**
 * Controller for rendering navigation views for the Developer module.
 */
class NavCtrl extends Controller
{
    /**
     * Renders dashboard-related views based on route parameters.
     *
     * @param Request $request HTTP request object.
     * @param array $params Route parameters (module, section, item, token).
     * @return \Illuminate\View\View|JsonResponse
     */
    public function index(Request $request, array $params)
    {
        Developer::info('news');
        try {
            // Extract route parameters
            $baseView = 'system.business.user-management';
            $module = $params['module'] ?? 'user-management';
            $section = $params['section'] ?? null;
            $item = $params['item'] ?? null;
            $token = $params['token'] ?? null;

            // Build view path
            $viewPath = $baseView;
            if ($section) {
                $viewPath .= ".{$section}";
                if ($item) {
                    $viewPath .= ".{$item}";
                }
            } else {
                $viewPath .= '.users';
            }

            // Extract view name and normalize path
            $viewName = str_replace("{$baseView}.", '', $viewPath);
            $viewPath = strtolower(str_replace(' ', '-', $viewPath));

            // Log navigation details
            if (Config::get('skeleton.developer_mode')) {
                Log::debug('NavCtrl: Navigation details', [
                    'module' => $module,
                    'section' => $section,
                    'item' => $item,
                    'token' => $token,
                    'viewPath' => $viewPath
                ]);
            }

            // Base data
            $data = ['status' => true, 'module' => $module, 'section' => $section, 'item' => $item, 'token' => $token];

            switch ($viewName) {
                case 'index':
                    $data['dashboard_list'] = [];
                    break;
                case 'business_News Feed':
                    Developer::info('news-feed');
                    $userId = Skeleton::getAuthenticatedUser()->user_id ?? 0;
                    Log::debug('NavCtrl: User ID', ['user_id' => $userId]);

                    // Fetch authenticated user's employee data
                    $employeeResponse = Data::get('business', 'employees', [
                        'where' => [['user_id', '=', $userId]],
                        'columns' => [
                            'id', 'sno', 'company_id', 'branch_id', 'user_id', 'employee_id', 'first_name', 
                            'last_name', 'role_id', 'profile', 'birth_date', 'phone', 'phone_alt', 'email', 
                            'email_alt', 'username', 'password', 'joined_date', 'secure_version', 
                            'allow_authentication', 'created_by', 'updated_by', 'delete_on', 'restored_at', 
                            'deleted_at', 'created_at', 'updated_at'
                        ]
                    ]);
                    $employee = $employeeResponse['status'] && !empty($employeeResponse['data']) ? $employeeResponse['data'][0] : null;

                    // Fetch news_feed data
                    $newsFeedResponse = Data::get('business', 'news_feed', [
                        'where' => [['user_id', '=', $userId]],
                        'columns' => [
                            'id', 'sno', 'company_id', 'branch_id', 'user_id', 'post_id', 'content', 
                            'category', 'media_type', 'media_url', 'visibility', 'created_by', 
                            'updated_by', 'delete_after', 'restored', 'deleted_at', 'created_at', 'updated_at'
                        ]
                    ]);
                    $newsFeed = $newsFeedResponse['status'] && !empty($newsFeedResponse['data']) 
                        ? collect($newsFeedResponse['data'])->map(fn($item) => (object) $item)->toArray() 
                        : [];

                    // Fetch comments data
                    $commentsResponse = Data::get('business', 'comments', [
                        'where' => [['user_id', '=', $userId]],
                        'columns' => [
                            'id', 'company_id', 'branch_id', 'comment_id', 'post_id', 'user_id', 'parent_id', 
                            'content', 'attachment', 'secure_version', 'created_by', 'updated_by', 
                            'delete_after', 'restored', 'deleted_at', 'created_at', 'updated_at'
                        ]
                    ]);
                    $comments = $commentsResponse['status'] && !empty($commentsResponse['data']) 
                        ? collect($commentsResponse['data'])->map(fn($item) => (object) $item)->toArray() 
                        : [];

                    // Fetch likes data
                    $likesResponse = Data::get('business', 'likes', [
                        'where' => [['user_id', '=', $userId]],
                        'columns' => [
                            'id', 'company_id', 'branch_id', 'likes_id', 'post_id', 'user_id', 
                            'comment_id', 'created_by', 'updated_by', 'deleted_at', 'created_at', 'updated_at'
                        ]
                    ]);
                    $likes = $likesResponse['status'] && !empty($likesResponse['data']) 
                        ? collect($likesResponse['data'])->map(fn($item) => (object) $item)->toArray() 
                        : [];

                    // Fetch saved_posts data
                    $savedPostsResponse = Data::get('business', 'saved_posts', [
                        'where' => [['user_id', '=', $userId]],
                        'columns' => ['id', 'user_id', 'post_id', 'created_at', 'updated_at']
                    ]);
                    $savedPosts = $savedPostsResponse['status'] && !empty($savedPostsResponse['data']) 
                        ? collect($savedPostsResponse['data'])->map(fn($item) => (object) $item)->toArray() 
                        : [];

                    // Fetch followers data
                    $followersResponse = Data::get('business', 'followers', [
                        'where' => [['following_id', '=', $userId]],
                        'columns' => ['id', 'follower_id', 'following_id', 'status', 'created_at', 'updated_at']
                    ]);
                    $followers = $followersResponse['status'] && !empty($followersResponse['data']) 
                        ? collect($followersResponse['data'])->map(fn($item) => (object) $item)->toArray() 
                        : [];

                    // Fetch following data
                    $followingResponse = Data::get('business', 'followers', [
                        'where' => [['follower_id', '=', $userId]],
                        'columns' => ['id', 'follower_id', 'following_id', 'status', 'created_at', 'updated_at']
                    ]);
                    $following = $followingResponse['status'] && !empty($followingResponse['data']) 
                        ? collect($followingResponse['data'])->map(fn($item) => (object) $item)->toArray() 
                        : [];

                    // Fetch all employees data
                    $employeesResponse = Data::get('business', 'employees', [
                        'columns' => [
                            'id', 'sno', 'company_id', 'branch_id', 'user_id', 'employee_id', 'first_name', 
                            'last_name', 'role_id', 'profile', 'birth_date', 'phone', 'phone_alt', 'email', 
                            'email_alt', 'username', 'password', 'joined_date', 'secure_version', 
                            'allow_authentication', 'created_by', 'updated_by', 'delete_on', 'restored_at', 
                            'deleted_at', 'created_at', 'updated_at'
                        ]
                    ]);
                    $employees = $employeesResponse['status'] && !empty($employeesResponse['data']) 
                        ? collect($employeesResponse['data'])->map(fn($item) => (object) $item)->toArray() 
                        : [];

                    // Calculate follower and following counts
                    $followerCount = count(array_filter($followers, fn($f) => $f->status === 'accepted'));
                    $followingCount = count(array_filter($following, fn($f) => $f->status === 'accepted'));
                    $followRequestCount = count(array_filter($followers, fn($f) => $f->status === 'pending'));

                    // Map followers to employee data, excluding self
                    $followerDetails = array_map(function ($follower) use ($employees, $userId) {
                        if ($follower->follower_id === $userId) {
                            return null; // Skip self
                        }
                        $employee = array_filter($employees, fn($e) => $e->user_id === $follower->follower_id);
                        $employee = !empty($employee) ? reset($employee) : null;
                        return [
                            'follower_id' => $follower->follower_id,
                            'status' => $follower->status,
                            'name' => $employee ? "{$employee->first_name} {$employee->last_name}" : 'Unknown',
                            'profile' => $employee->profile ?? 'assets/img/users/default.jpg',
                            'username' => $employee->username ?? 'user' . $follower->follower_id
                        ];
                    }, $followers);
                    $followerDetails = array_filter($followerDetails); // Remove null entries

                    // Map following to employee data, excluding self
                    $followingDetails = array_map(function ($following) use ($employees, $userId) {
                        if ($following->following_id === $userId) {
                            return null; // Skip self
                        }
                        $employee = array_filter($employees, fn($e) => $e->user_id === $following->following_id);
                        $employee = !empty($employee) ? reset($employee) : null;
                        return [
                            'following_id' => $following->following_id,
                            'status' => $following->status,
                            'name' => $employee ? "{$employee->first_name} {$employee->last_name}" : 'Unknown',
                            'profile' => $employee->profile ?? 'assets/img/users/default.jpg',
                            'username' => $employee->username ?? 'user' . $following->following_id
                        ];
                    }, $following);
                    $followingDetails = array_filter($followingDetails); // Remove null entries

                    // Map all employees with follow status, excluding self
                    $allPeople = array_map(function ($emp) use ($following, $userId) {
                        $isFollowing = array_filter($following, fn($f) => $f->following_id === $emp->user_id && $f->status === 'accepted');
                        return [
                            'user_id' => $emp->user_id,
                            'name' => "{$emp->first_name} {$emp->last_name}",
                            'profile' => $emp->profile ?? 'assets/img/users/default.jpg',
                            'username' => $emp->username ?? 'user' . $emp->user_id,
                            'is_following' => !empty($isFollowing),
                            'is_self' => $emp->user_id === $userId
                        ];
                    }, $employees);
                    $allPeople = array_filter($allPeople, fn($p) => !$p['is_self']); // Exclude self

                    // Map comments to include commenter details
                    $commentDetails = array_map(function ($comment) use ($employees) {
                        $commenter = array_filter($employees, fn($e) => $e->user_id === $comment->user_id);
                        $commenter = !empty($commenter) ? reset($commenter) : null;
                        return (object) [
                            'id' => $comment->id,
                            'post_id' => $comment->post_id,
                            'user_id' => $comment->user_id,
                            'comment_id' => $comment->comment_id,
                            'parent_id' => $comment->parent_id,
                            'content' => $comment->content,
                            'created_at' => $comment->created_at,
                            'name' => $commenter ? "{$commenter->first_name} {$commenter->last_name}" : 'Unknown',
                            'profile' => $commenter->profile ?? 'assets/img/users/default.jpg',
                            'username' => $commenter->username ?? 'user' . $comment->user_id
                        ];
                    }, $comments);
                    $comments = [];
                    $replies = [];

                    foreach ($commentDetails as $comment) {
                        if (empty($comment->parent_id)) {
                            $comments[] = $comment;
                        } else {
                            $isReply = array_filter($commentDetails, fn($c) => $c->comment_id === $comment->parent_id);
                            if (!empty($isReply)) {
                                $replies[] = $comment;
                            }
                        }
                    }
                   

                    // Pass data to view
                    $data['employee'] = $employee ?: (object) [];
                    $data['user_id'] = $userId;
                    $data['news_feed'] = $newsFeed;
                    $data['comments'] = $comments; 
                    $data['replies'] = $replies;
                    Developer::info("comments");
                    Developer::info($data['comments']);
                    Developer::info("Replies");
                    Developer::info($data['replies']);
                    $data['likes'] = $likes;
                    $data['saved_posts'] = $savedPosts;
                    $data['follower_count'] = $followerCount;
                    $data['following_count'] = $followingCount;
                    $data['follow_request_count'] = $followRequestCount;
                    $data['follower_details'] = array_values($followerDetails);
                    $data['following_details'] = array_values($followingDetails);
                    $data['all_people'] = array_values($allPeople);
                    break;
                default:
                    $data['default_message'] = 'Developer section loaded';
                    break;
            }

            // Render view if it exists
            if (View::exists($viewPath)) {
                
                // Log::debug('NavCtrl: Rendering view', ['viewPath' => $viewPath]);
                return view($viewPath, $data);
            }

            // Handle view not found
            if (Config::get('skeleton.developer_mode')) {
                Log::info('NavCtrl: View not found', ['viewPath' => $viewPath]);
            }
            return response()->json(['status' => false, 'title' => 'Page Not Found', 'message' => 'The requested page was not found.']);
        } catch (Exception $e) {
            if (Config::get('skeleton.developer_mode')) {
                Log::error('NavCtrl: Error', [
                    'error' => $e->getMessage(),
                    'path' => $request->path(),
                    'params' => $params,
                    'trace' => $e->getTraceAsString()
                ]);
            }
            return response()->json(['status' => false, 'title' => 'Error', 'message' => Config::get('skeleton.developer_mode') ? $e->getMessage() : 'An error occurred while loading the page.']);
        }
    }
}