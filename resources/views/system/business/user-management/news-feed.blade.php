@extends('layouts.system-app')
@section('title', 'Skeleton-configs | Gotit HR Management Software')

@section('content')
    <div class="content">
        <!-- Breadcrumb -->
        <div class="d-md-flex d-block align-items-center justify-content-between page-breadcrumb">
            <div class="my-auto mb-2">
                <h3 class="mb-1">Users</h3>
                <nav>
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item">
                            <a href="{{ url('/dashboard') }}"><i class="ti ti-smart-home"></i></a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/profile') }}">User Management</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="{{ url('/profile/knowledge-base') }}">Users</a>
                        </li>
                    </ol>
                </nav>
            </div>
            <div class="d-flex my-xl-auto right-content align-items-center flex-wrap">
                <div class="mb-2">
                    <div class="live-time-container head-icons">
                        <span class="live-time-icon me-2">
                            <i class="fa-thin fa-clock"></i>
                        </span>
                        <div class="live-time"></div>
                    </div>
                </div>
                <div class="ms-2 head-icons">
                    <a href="#" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-original-title="Collapse" id="collapse-header">
                        <i class="ti ti-chevrons-up"></i>
                    </a>
                </div>
            </div>
        </div>
        <!-- /Breadcrumb -->
        <div class="row">
            <div class="col-xl-3 theiaStickySidebar">
                <div class="card">
                    <div class="card-body">
                        <div class="bg-light rounded p-3 mb-4">
                            <div class="text-center mb-3">
                                <a href="{{ url('/profile/' . $user_id) }}" class="avatar avatar-xl online avatar-rounded">
                                    <img src="{{ $employee->profile ?? 'assets/img/users/user-11.jpg' }}" alt="Img">
                                </a>
                                <h5 class="mb-1"><a href="{{ url('/profile/' . $user_id) }}">{{ $employee->first_name ?? 'User' }} {{ $employee->last_name ?? '' }}</a></h5>
                                <p class="fs-12">{{ $employee->username ?? 'user' . $user_id }}</p>
                            </div>
                            <div class="row g-1">
                                <div class="col-sm-4">
                                    <div class="rounded bg-white text-center py-1">
                                        <h4 class="mb-1">{{ $follower_count }}</h4>
                                        <p class="fs-12">Followers</p>
                                    </div>
                                </div>
                                <div class="col-sm-4">
                                    <div class="rounded bg-white text-center py-1">
                                        <h4 class="mb-1">{{ $following_count }}</h4>
                                        <p class="fs-12">Follows</p>
                                    </div>
                                </div>
                                <div class="col-sm-4">
                                    <div class="rounded bg-white text-center py-1">
                                        <h4 class="mb-1">{{ count($news_feed) }}</h4>
                                        <p class="fs-12">Posts</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mb-4">
                            <a class="btn btn-primary d-inline-flex align-items-center justify-content-center w-100 skeleton-popup" data-token='@skeletonToken('business_news_feed')_a'>
                                <i class="ti ti-circle-plus me-2"></i>Create Post
                            </a>
                        </div>
                        <div>
                            @if ($follow_request_count > 0)
                                <div class="mb-4">
                                    <h5 class="mb-3">Follow Requests ({{ $follow_request_count }})</h5>
                                    @foreach ($follower_details as $follower)
                                        @if ($follower['status'] === 'pending')
                                            <div class="d-flex align-items-center justify-content-between mb-2">
                                                <div class="d-flex align-items-center">
                                                    <a href="{{ url('/profile/' . $follower['follower_id']) }}" class="avatar avatar-rounded flex-shrink-0 me-2">
                                                        <img src="{{ $follower['profile'] }}" alt="Img">
                                                    </a>
                                                    <div>
                                                        <h6 class="fw-medium mb-1"><a href="{{ url('/profile/' . $follower['follower_id']) }}">{{ $follower['name'] }}</a></h6>
                                                        <span class="fs-12 d-block">{{ $follower['username'] }}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <a href="{{ url('/follow/accept/' . $follower['follower_id']) }}" class="btn btn-sm btn-primary">Accept</a>
                                                    <a href="{{ url('/follow/decline/' . $follower['follower_id']) }}" class="btn btn-sm btn-outline-danger">Decline</a>
                                                </div>
                                            </div>
                                        @endif
                                    @endforeach
                                </div>
                            @endif
                            <!-- Connections Section -->
                            <div class="mb-4">
                                <h5 class="mb-3">Connections</h5>
                                <ul class="nav nav-pills border d-flex p-2 rounded mb-3" id="pills-tab" role="tablist">
                                    <li class="nav-item flex-fill" role="presentation">
                                        <button class="nav-link btn active w-100" data-bs-toggle="pill" data-bs-target="#pills-home" type="button" role="tab" aria-selected="true">
                                            Followers
                                        </button>
                                    </li>
                                    <li class="nav-item flex-fill" role="presentation">
                                        <button class="nav-link btn w-100" data-bs-toggle="pill" data-bs-target="#pills-profile" type="button" role="tab" aria-selected="false">
                                            Following
                                        </button>
                                    </li>
                                    <li class="nav-item flex-fill" role="presentation">
                                        <button class="nav-link btn w-100" data-bs-toggle="pill" data-bs-target="#pills-all" type="button" role="tab" aria-selected="false">
                                            All People
                                        </button>
                                    </li>
                                </ul>
                                <div class="tab-content">
                                    <!-- Followers Tab -->
                                    <div class="tab-pane fade show active" id="pills-home" role="tabpanel">
                                        @if (!empty($follower_details))
                                            @foreach ($follower_details as $follower)
                                                @if ($follower['status'] === 'accepted')
                                                    <div class="d-flex align-items-center justify-content-between mb-3">
                                                        <div class="d-flex align-items-center">
                                                            <a href="{{ url('/profile/' . $follower['follower_id']) }}" class="avatar avatar-rounded flex-shrink-0 me-2">
                                                                <img src="{{ $follower['profile'] }}" alt="Img">
                                                            </a>
                                                            <div>
                                                                <h6 class="d-inline-flex align-items-center fw-medium mb-1">
                                                                    <a href="{{ url('/profile/' . $follower['follower_id']) }}">{{ $follower['name'] }}</a>
                                                                    <i class="ti ti-circle-check-filled text-success ms-1"></i>
                                                                </h6>
                                                                <span class="fs-12 d-block">{{ $follower['username'] }}</span>
                                                            </div>
                                                        </div>
                                                        <a href="{{ url('/unfollow/' . $follower['follower_id']) }}" class="btn btn-sm btn-outline-danger">Unfollow</a>
                                                    </div>
                                                @endif
                                            @endforeach
                                        @else
                                            <p class="text-muted">No followers found.</p>
                                        @endif
                                        <div>
                                            <a href="{{ url('/followers') }}" class="btn btn-outline-light w-100 border">View All <i class="ti ti-arrow-right ms-2"></i></a>
                                        </div>
                                    </div>
                                    <!-- Following Tab -->
                                    <div class="tab-pane fade" id="pills-profile" role="tabpanel">
                                        @if (!empty($following_details))
                                            @foreach ($following_details as $following)
                                                @if ($following['status'] === 'accepted')
                                                    <div class="d-flex align-items-center justify-content-between mb-3">
                                                        <div class="d-flex align-items-center">
                                                            <a href="{{ url('/profile/' . $following['following_id']) }}" class="avatar avatar-rounded flex-shrink-0 me-2">
                                                                <img src="{{ $following['profile'] }}" alt="Img">
                                                            </a>
                                                            <div>
                                                                <h6 class="d-inline-flex align-items-center fw-medium mb-1">
                                                                    <a href="{{ url('/profile/' . $following['following_id']) }}">{{ $following['name'] }}</a>
                                                                    <i class="ti ti-circle-check-filled text-success ms-1"></i>
                                                                </h6>
                                                                <span class="fs-12 d-block">{{ $following['username'] }}</span>
                                                            </div>
                                                        </div>
                                                        <a href="{{ url('/unfollow/' . $following['following_id']) }}" class="btn btn-sm btn-outline-danger">Unfollow</a>
                                                    </div>
                                                @endif
                                            @endforeach
                                        @else
                                            <p class="text-muted">Not following anyone.</p>
                                        @endif
                                        <div>
                                            <a href="{{ url('/following') }}" class="btn btn-outline-light w-100 border">View All <i class="ti ti-arrow-right ms-2"></i></a>
                                        </div>
                                    </div>
                                    <!-- All People Tab -->
                                    <div class="tab-pane fade" id="pills-all" role="tabpanel">
                                        @if (!empty($all_people))
                                            @foreach ($all_people as $person)
                                                <div class="d-flex align-items-center justify-content-between mb-3">
                                                    <div class="d-flex align-items-center">
                                                        <a href="{{ url('/profile/' . $person['user_id']) }}" class="avatar avatar-rounded flex-shrink-0 me-2">
                                                            <img src="{{ $person['profile'] }}" alt="Img">
                                                        </a>
                                                        <div>
                                                            <h6 class="d-flex align-items-center fw-medium mb-0">
                                                                <a href="{{ url('/profile/' . $person['user_id']) }}">{{ $person['name'] }}</a>
                                                                <i class="ti ti-circle-check-filled text-success ms-1"></i>
                                                            </h6>
                                                            <span class="fs-12">{{ $person['username'] }}</span>
                                                        </div>
                                                    </div>
                                                    @if ($person['is_following'])
                                                        <span class="text-muted fs-12">Following</span>
                                                    @else
                                                        <a href="{{ url('/follow/' . $person['user_id']) }}" class="btn btn-sm btn-primary">Follow</a>
                                                    @endif
                                                </div>
                                            @endforeach
                                        @else
                                            <p class="text-muted">No users found.</p>
                                        @endif
                                        <div>
                                            <a href="{{ url('/people') }}" class="btn btn-outline-light w-100 border">View All <i class="ti ti-arrow-right ms-2"></i></a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-sm-6">
                <div>
                    @if (empty($news_feed))
                        <div class="card">
                            <div class="card-body text-center">
                                <p class="text-muted">No posts available. Create a post to get started!</p>
                                <a href="{{ url('/posts/create') }}" class="btn btn-primary">Create Post</a>
                            </div>
                        </div>
                    @else
                        @foreach ($news_feed as $post)
                            <div class="card">
                                <div class="card-header border-0 pb-0">
                                    <div class="d-flex align-items-center justify-content-between border-bottom flex-wrap pb-3">
                                        <div class="d-flex align-items-center">
                                            <a href="{{ url('profile/' . $post->user_id) }}" class="avatar avatar-lg avatar-rounded flex-shrink-0 me-2">
                                                <img src="{{ $employee->profile ?? 'assets/img/users/user-11.jpg' }}" alt="Img">
                                            </a>
                                            <div>
                                                <h5 class="mb-1"><a href="{{ url('/profile/' . $post->user_id) }}">{{ $employee->first_name ?? 'User' }} {{ $employee->last_name ?? '' }}</a></h5>
                                                <p class="d-flex align-items-center">
                                                    <span class="text-info">{{ $employee->username ?? 'user' . $user_id }}</span>
                                                    <i class="ti ti-circle-filled fs-5 mx-2"></i>
                                                    {{ \Carbon\Carbon::parse($post->created_at)->diffForHumans() }}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="mb-2">
                                        <p class="text-dark fw-medium">{{ $post->content }}</p>
                                    </div>
                                    @if ($post->media_url)
                                        <div class="mb-2">
                                            <img src="{{ $post->media_url }}" class="rounded img-fluid" alt="Post Image">
                                        </div>
                                    @endif
                                    <!-- Likes and Comments -->
                                    <div class="d-flex align-items-center justify-content-between flex-wrap row-gap-3 mb-3">
                                        <div class="d-flex align-items-center">
                                            <a href="{{ url('/post/like/' . $post->post_id) }}" class="d-inline-flex align-items-center me-3">
                                                <i class="ti ti-heart me-2"></i>{{ count(array_filter($likes, fn($like) => $like->post_id === $post->post_id)) }} Likes
                                            </a>
                                            <a href="{{ url('/post/' . $post->post_id . '/comments') }}" class="d-inline-flex align-items-center me-3">
                                                <i class="fas fa-comment me-2"></i>{{ count(array_filter($comments, fn($comment) => $comment->post_id === $post->post_id)) }} Comments
                                            </a>
                                        </div>
                                    </div>
                                    <!-- Comments -->
                                    @foreach ($comments as $comment)
                                        @if ($comment->post_id === $post->post_id)
                                            <div class="mb-3">
                                                <div class="d-flex align-items-start mb-2">
                                                    <a href="{{ url('/profile/' . $comment->user_id) }}" class="avatar avatar-rounded flex-shrink-0 me-2">
                                                        <img src="{{ $comment->profile }}" alt="Img">
                                                    </a>
                                                    <div class="bg-light rounded flex-fill p-2">
                                                        <div class="d-flex align-items-center mb-1">
                                                            <h6 class="fw-medium me-2"><a href="{{ url('/profile/' . $comment->user_id) }}">{{ $comment->name }}</a></h6>
                                                            <span class="text-muted fs-12">{{ \Carbon\Carbon::parse($comment->created_at)->diffForHumans() }}</span>
                                                        </div>
                                                        <p class="mb-0">{{ $comment->content }}</p>
                                                        <div class="d-flex align-items-center gap-2 mt-1">
                                                            <a href="#" class="text-info fs-12 reply-toggle" data-comment-id="{{ $comment->id }}">Reply</a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <!-- Reply Form -->
                                                <div class="reply-form ms-5" style="display: none;" data-comment-id="{{ $comment->id }}">
                                                     <form class="save-static-form">
                                                    @csrf
                                                    <input type="hidden" name="save_token" value="@skeletonToken('business_reply')_sf">
                                                    <input type="hidden" name="post_id" value="{{ $comment->post_id }}">
                                                    <input type="hidden" name="parent_id" value="{{ $comment->comment_id }}"> 
                                                        <div class="input-group">
                                                            <textarea name="content" class="form-control" rows="2" placeholder="Write a reply..." required></textarea>
                                                            <button type="submit" class="btn btn-primary">Reply</button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                    @foreach ($replies as $reply)
                                        @if ($comment->comment_id === $reply->parent_id)
                                                <div class="mb-3">
                                                <div class="d-flex align-items-start mb-2">
                                                    <a href="{{ url('/profile/' . $comment->user_id) }}" class="avatar avatar-rounded flex-shrink-0 me-2">
                                                        <img src="{{ $comment->profile }}" alt="Img">
                                                    </a>
                                                    <div class="bg-light rounded flex-fill p-2">
                                                        <div class="d-flex align-items-center mb-1">
                                                            <h6 class="fw-medium me-2"><a href="{{ url('/profile/' . $comment->user_id) }}">{{ $comment->name }}</a></h6>
                                                            <span class="text-muted fs-12">{{ \Carbon\Carbon::parse($comment->created_at)->diffForHumans() }}</span>
                                                        </div>
                                                        <p class="mb-0">{{ $comment->content }}</p>
                                                        <div class="d-flex align-items-center gap-2 mt-1">
                                                            <a href="#" class="text-info fs-12 reply-toggle" data-comment-id="{{ $comment->id }}">Reply</a>
                                                        </div>
                                                    </div>
                                                </div>
                                                <!-- Reply Form -->
                                                <div class="reply-form ms-5" style="display: none;" data-comment-id="{{ $comment->id }}">
                                                     <form class="save-static-form">
                                                    @csrf
                                                    <input type="hidden" name="save_token" value="@skeletonToken('business_reply')_sf">
                                                    <input type="hidden" name="post_id" value="{{ $comment->post_id }}">
                                                    <input type="hidden" name="parent_id" value="{{ $comment->comment_id }}"> 
                                                        <div class="input-group">
                                                            <textarea name="content" class="form-control" rows="2" placeholder="Write a reply..." required></textarea>
                                                            <button type="submit" class="btn btn-primary">Reply</button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        @endif
                                    @endforeach
                                            
                                        @endif
                                    @endforeach
                                    <!-- Comment Form -->
                                        <form class="save-static-form" action="">
                                            @csrf
                                            <input type="hidden" name="save_token" value="@skeletonToken('business_comments')_sf">
                                            <input type="hidden" name="post_id" value="{{ $post->post_id }}">
                                            <div class="input-group mt-3">
                                                <textarea name="content" class="form-control" rows="2" placeholder="Write a comment..." required></textarea>
                                                <button type="submit" class="btn btn-primary">Comment</button>
                                            </div>
                                        </form>
                                </div>
                            </div>
                        @endforeach
                    @endif
                </div>
            </div>
            <div class="col-xl-3 theiaStickySidebar">
                <div class="card">
                    <div class="card-body">
                        <h5 class="mb-3">Saved Feeds</h5>
                        @if (empty($saved_posts))
                            <p class="text-muted">No saved posts found.</p>
                        @else
                            @foreach ($saved_posts as $saved)
                                <div class="bg-light-500 rounded p-2 mb-2">
                                    <div class="d-flex align-items-center justify-content-between mb-1">
                                        <a href="{{ url('/post/' . $saved->post_id) }}" class="d-flex align-items-center">
                                            <p class="fs-12 fw-medium">Saved Post</p>
                                        </a>
                                        <a href="{{ url('/post/unsave/' . $saved->post_id) }}"><i class="ti ti-bookmark-filled text-warning"></i></a>
                                    </div>
                                    <p class="text-dark fw-medium"><a href="{{ url('/post/' . $saved->post_id) }}">Post ID: {{ $saved->post_id }}</a></p>
                                </div>
                            @endforeach
                        @endif
                        <div class="mt-3">
                            <a href="{{ url('/saved-posts') }}" class="btn btn-outline-light w-100 border">View All <i class="ti ti-arrow-right ms-2"></i></a>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <h5 class="mb-3">Trending Hashtags</h5>
                        <div class="d-flex align-items-center flex-wrap gap-1">
                            <a href="{{ url('/hashtag/HealthTips') }}" class="text-info d-inline-flex link-hover">#HealthTips</a>
                            <a href="{{ url('/hashtag/Wellness') }}" class="text-info d-inline-flex link-hover">#Wellness</a>
                            <a href="{{ url('/hashtag/Motivation') }}" class="text-info d-inline-flex link-hover">#Motivation</a>
                            <a href="{{ url('/hashtag/Inspiration') }}" class="text-info d-inline-flex link-hover">#Inspiration</a>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div class="card-img card-img-hover mb-3">
                            <a href="{{ url('/premium') }}" class="rounded"><img src="assets/img/social/social-feed-04.jpg" class="rounded" alt="Img"></a>
                        </div>
                        <h6 class="text-center"><a href="{{ url('/premium') }}">Enjoy Unlimited Access for a Small Monthly Price</a></h6>
                        <div class="mt-3">
                            <a href="{{ url('/premium') }}" class="btn btn-outline-light w-100 border">Upgrade Now <i class="ti ti-arrow-right ms-2"></i></a>
                        </div>
                    </div>
                </div>
                <div class="d-flex align-items-center flex-wrap justify-content-center template-more-links mb-4">
                    <a href="{{ url('/about') }}" class="d-inline-flex">About</a>
                    <a href="{{ url('/privacy') }}" class="d-inline-flex">Privacy</a>
                    <a href="{{ url('/terms') }}" class="d-inline-flex">Terms</a>
                    <a href="{{ url('/help') }}" class="d-inline-flex">Help</a>
                </div>
            </div>
        </div>
    </div>
    <!-- JavaScript for Reply Toggle -->
    <script>
        document.querySelectorAll('.reply-toggle').forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const commentId = this.getAttribute('data-comment-id');
                const replyForm = document.querySelector(`.reply-form[data-comment-id="${commentId}"]`);
                replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
            });
        });
    </script>
@endsection