@extends('layouts.empty-app')
@section('title', 'Got It :: News Feeds')
@section('content')
    <div class="container-xxl flex-grow-1 container-p-y p-4 d-flex justify-content-center">
        <div class="row justify-content-center">
            <div class="col-lg-10">
                @if ($data->isEmpty())
                    <div class="card">
                        <div class="text-center p-4">
                            <img src="{{ asset('treasury/images/common/no-data/nothing.svg') }}" alt="No Documents"
                                class="img-fluid" style="width: 100%; height: 150px; margin-bottom: 20px;">
                            <p class="fw-bold sf-16">No news feeds available for this organization.</p>
                        </div>
                    </div>
                @else
                    <div class="row g-4">
                        <div class="col-lg-12">
                            <div class="card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center flex-wrap mb-3">
                                        <!-- Title -->
                                        <div class="me-1">
                                            <h5 class="mb-0 fw-bold" style="font-size: clamp(16px, 1.5vw, 20px);">
                                                {{ ucfirst($data[0]->title) }}
                                            </h5>
                                        </div>
                                        <!-- Category & Share Icon -->
                                        <div class="d-flex align-items-center gap-2">
                                            <span class="badge bg-danger rounded-pill px-3 py-2 shadow-sm"
                                                style="font-size: clamp(12px, 1vw, 14px); white-space: nowrap;">
                                                {{ \App\Http\Classes\SelectHelper::getValue('OPT', $data[0]->category_id) }}
                                            </span>
                                            <div class="input-group">
                                                <a href="javascript:void(0);" onclick="shareContent()">
                                                    <i class="ri-share-forward-line ri-24px text-primary"
                                                        style="cursor: pointer; transition: transform 0.2s ease-in-out;"
                                                        onmouseover="this.style.transform='scale(1.2)'"
                                                        onmouseout="this.style.transform='scale(1)'"></i>
                                                </a>
                                            </div>
                                            @php
                                                $orgId = \App\Http\Classes\UserHelper::getCurrentUser('org_id');
                                                $orgName = \App\Models\Organization\Organization::where(
                                                    'org_id',
                                                    $orgId,
                                                )->value('name');
                                            @endphp
                                            <script>
                                                function shareContent() {
                                                    let shareUrl =
                                                        "{{ url('/') . '/' . strtolower(str_replace(' ', '-', trim($orgName))) . '/news-feeds/' . $data[0]->feed_id }}";
                                                    let shareText = "Check out this company newsfeed on GotIt4All!";
                                                    if (navigator.share) {
                                                        navigator.share({
                                                            title: "Company Profile",
                                                            text: shareText,
                                                            url: shareUrl
                                                        }).then(() => {
                                                            console.log('Shared successfully');
                                                        }).catch((error) => {
                                                            console.error('Error sharing:', error);
                                                        });
                                                    } else {
                                                        alert('Sharing is not supported in this browser.');
                                                    }
                                                }
                                            </script>
                                        </div>
                                    </div>
                                    <div class="card academy-content shadow-none border">
                                        <div class="p-2">
                                            <div class="cursor-pointer">
                                                @if (!empty($data[0]->attachment_url))
                                                    @php
                                                        $fileExtension = pathinfo(
                                                            $data[0]->attachment_url,
                                                            PATHINFO_EXTENSION,
                                                        );
                                                        $videoFormats = ['mp4', 'webm', 'ogg'];
                                                    @endphp
                                                    @if (in_array(strtolower($fileExtension), $videoFormats))
                                                        <!-- Video Player -->
                                                        <div class="position-relative text-center w-100">
                                                            <video class="w-100"
                                                                poster="https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.jpg"
                                                                id="plyr-video-player" playsinline controls>
                                                                <source src="{{ asset($data[0]->attachment_url) }}"
                                                                    type="video/{{ $fileExtension }}" />
                                                                Your browser does not support the video tag.
                                                            </video>
                                                        </div>
                                                    @else
                                                        <!-- Image Display -->
                                                        <div class="position-relative text-center w-100">
                                                            <img src="{{ asset($data[0]->attachment_url) }}"
                                                                alt="Feed Image" class="card-img-top img-fluid"
                                                                style="width: 100%; height: auto; object-fit: cover;"
                                                                onload="adjustImageSize(this)">
                                                        </div>
                                                    @endif
                                                @endif
                                            </div>
                                        </div>
                                        <!-- Image Resize Script -->
                                        <script>
                                            function adjustImageSize(img) {
                                                if (window.innerWidth >= 992) {
                                                    img.style.height = "200px"; // Smaller height for large screens
                                                    img.style.width = "auto";
                                                } else { // Mobile screens
                                                    img.style.height = "auto"; // Actual height
                                                    img.style.width = "100%"; // Full width
                                                }
                                            }
                                            window.addEventListener('resize', function() {
                                                document.querySelectorAll('.card-img-top').forEach(img => adjustImageSize(img));
                                            });
                                        </script>
                                        <div class="card-body pt-3">
                                            <p class="mb-6">
                                                <span class="short-content">
                                                    {{ $data[0]->content }}
                                                </span>
                                            </p>
                                            <div
                                                class="d-flex flex-wrap gap-1 justify-content-start justify-content-lg-start p-1 mt-0">
                                                @foreach (explode(',', $data[0]->tags) as $tag)
                                                    <small class="badge bg-success rounded-pill px-2 py-1"
                                                        style="font-size: clamp(10px, 0.9vw, 12px); white-space: nowrap; transition: transform 0.2s ease-in-out;"
                                                        onmouseover="this.style.transform='scale(1.05)'"
                                                        onmouseout="this.style.transform='scale(1)'">
                                                        #{{ trim($tag) }}
                                                    </small>
                                                @endforeach
                                            </div>
                                            <hr>
                                            <h6>Posted By</h6>
                                            @php
                                                $userData = \App\Models\User::where(
                                                    'gotit_id',
                                                    $data[0]->author_id,
                                                )->first();
                                            @endphp
                                            <div class="d-flex justify-content-between align-items-center user-name">
                                                <div class="d-flex align-items-center">
                                                    <div class="avatar avatar-sm me-4">
                                                        @if (!empty($userData->profile))
                                                            <img src="{{ asset($userData->profile) }}"
                                                                alt="{{ \App\Http\Classes\UserHelper::getName($data[0]->author_id) }}"
                                                                class="rounded-circle">
                                                        @else
                                                            @php
                                                                $userName = \App\Http\Classes\UserHelper::getName(
                                                                    $data[0]->author_id,
                                                                );
                                                                $nameParts = explode(' ', trim($userName));
                                                                $initials = strtoupper(
                                                                    substr($nameParts[0], 0, 1) .
                                                                        (isset($nameParts[1])
                                                                            ? substr($nameParts[1], 0, 1)
                                                                            : ''),
                                                                );
                                                            @endphp
                                                            <div class="avatar avatar-sm me-2">
                                                                <span
                                                                    class="avatar-initial rounded-circle bg-secondary text-white px-3 py-2"
                                                                    style="font-weight: bold; font-size: 14px;">
                                                                    {{ $initials }}
                                                                </span>
                                                            </div>
                                                        @endif
                                                    </div>
                                                    <div>
                                                        <h6 class="mb-1">
                                                            {{ \App\Http\Classes\UserHelper::getName($data[0]->author_id) }}
                                                        </h6>
                                                        <small>{{ \Carbon\Carbon::parse($data[0]->created_at)->format('d M Y, h:i A') }}</small>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center ms-auto">
                                                    @php
                                                        $gotit_id = \App\Http\Classes\UserHelper::getCurrentUser(
                                                            'gotit_id',
                                                        );
                                                        $likesArray = $data[0]->likes
                                                            ? explode(',', $data[0]->likes)
                                                            : [];
                                                        $commentsArray = $data[0]->comment_ids
                                                            ? explode(',', $data[0]->comment_ids)
                                                            : [];
                                                        $hasLiked = in_array($gotit_id, $likesArray);
                                                    @endphp
                                                    <button type="button"
                                                        class="btn btn-link p-0 border-0 me-2 shadow-none d-flex align-items-center save-static-form-btn like-button"
                                                        style="color: {{ $hasLiked ? 'red' : 'gray' }};">
                                                        <i
                                                            class="{{ $hasLiked ? 'ri-heart-3-fill' : 'ri-heart-3-line' }} ri-24px me-1"></i>
                                                        {{ count($likesArray) }}
                                                    </button>
                                                    <button class="btn btn-link p-0 border-0 shadow-none comment-toggle"
                                                        data-bs-toggle="collapse"
                                                        data-bs-target="#comments-{{ $data[0]->feed_id }}"
                                                        aria-expanded="false">
                                                        <i
                                                            class="ri-message-3-line ri-24px me-1"></i>{{ count($commentsArray) }}
                                                    </button>
                                                </div>
                                            </div>
                                            <!-- Comment Section -->
                                            <div class="collapse mt-3" id="comments-{{ $data[0]->feed_id }}">
                                                <div class="card p-3">
                                                    <h6>Comments</h6>
                                                    <ul class="list-unstyled mb-0">
                                                        @php
                                                            $commentIds = explode(',', $data[0]->comment_ids);
                                                            $comments = \App\Models\Organization\Comment::whereIn(
                                                                'comment_id',
                                                                $commentIds,
                                                            )->get();
                                                        @endphp
                                                        @foreach ($comments as $comment)
                                                            @php
                                                                $commentedUser = \App\Models\User::where(
                                                                    'gotit_id',
                                                                    $comment->gotit_id,
                                                                )->first();
                                                            @endphp
                                                            <li class="d-flex align-items-start gap-3 p-2 border-bottom">
                                                                <!-- User Avatar -->
                                                                <div class="flex-shrink-0 avatar avatar-sm me-2">
                                                                    @if (!empty($commentedUser->profile))
                                                                        <img src="{{ asset($commentedUser->profile) }}"
                                                                            alt="User" class="rounded-circle">
                                                                    @else
                                                                        @php
                                                                            $userName = \App\Http\Classes\UserHelper::getName(
                                                                                $commentedUser->gotit_id,
                                                                            );
                                                                            $nameParts = explode(' ', trim($userName));
                                                                            $initials = strtoupper(
                                                                                substr($nameParts[0], 0, 1) .
                                                                                    (isset($nameParts[1])
                                                                                        ? substr($nameParts[1], 0, 1)
                                                                                        : ''),
                                                                            );
                                                                        @endphp
                                                                        <div class="avatar avatar-sm me-2 d-flex align-items-center justify-content-center rounded-circle bg-secondary text-white"
                                                                            style="font-weight: bold; font-size: 14px;">
                                                                            {{ $initials }}
                                                                        </div>
                                                                    @endif
                                                                </div>
                                                                <!-- Comment Content -->
                                                                <div class="flex-grow-1">
                                                                    <div
                                                                        class="d-flex justify-content-between align-items-center">
                                                                        <strong
                                                                            class="text-primary">{{ \App\Http\Classes\UserHelper::getName($commentedUser->gotit_id) }}</strong>
                                                                        <div class="d-flex align-items-center gap-2">
                                                                            <small
                                                                                class="text-muted text-nowrap">{{ \Carbon\Carbon::parse($comment->created_at)->diffForHumans() }}</small>
                                                                            @php
                                                                                $gotit_id = \App\Http\Classes\UserHelper::getCurrentUser(
                                                                                    'gotit_id',
                                                                                );
                                                                                $likesArray = $comment->likes
                                                                                    ? explode(',', $comment->likes)
                                                                                    : [];
                                                                                $hasLiked = in_array(
                                                                                    $gotit_id,
                                                                                    $likesArray,
                                                                                );
                                                                            @endphp
                                                                            <button type="button"
                                                                                class="btn btn-link p-0 border-0 shadow-none save-static-form-btn"
                                                                                style="color: {{ $hasLiked ? 'red' : 'gray' }};">
                                                                                <i
                                                                                    class="{{ $hasLiked ? 'ri-heart-3-fill' : 'ri-heart-3-line' }} ri-18px"></i>
                                                                            </button>
                                                                            <small
                                                                                class="text-muted">{{ count($likesArray) }}</small>
                                                                        </div>
                                                                    </div>
                                                                    <p class="mb-0 p-2 rounded"
                                                                        style="word-wrap: break-word; max-width: 100%;">
                                                                        {{ $comment->content }}
                                                                    </p>
                                                                </div>
                                                            </li>
                                                        @endforeach
                                                        @if ($comments->isEmpty())
                                                            <div class="text-center p-4">
                                                                <img src="{{ asset('treasury/images/common/no-data/nothing.svg') }}"
                                                                    alt="No Documents" class="img-fluid"
                                                                    style="width: 100%; height: 150px; margin-bottom: 20px;">
                                                                <p class="fw-bold sf-16">No comments yet. Be the
                                                                    first to comment!</p>
                                                            </div>
                                                        @endif
                                                    </ul>
                                                </div>
                                            </div>
                                            <!-- End of Comment Section -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div> <!-- Closed missing div -->
                    </div>
                @endif
            </div>
        </div>
    </div>
    <footer>
        <div class="container-fluid copyright text-center align-items-center p-3">
            <p>© <span>Copyright</span> <strong class="px-1 sitename">Got-it Services Provided by Digital
                    Kuppam</strong> <span>All Rights
                    Reserved</span></p>
        </div>
    </footer>
@endsection
