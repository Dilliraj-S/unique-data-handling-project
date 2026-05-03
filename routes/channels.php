<?php

use App\Facades\Developer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return Auth::check() && (int) $user->id === (int) $id;
});

Broadcast::channel('match.headers.{userId}', function ($user, $userId) {
    return true;
});
Broadcast::channel('progress.user.{userId}.{processId}', function ($user, $userId) {
    return true;
});