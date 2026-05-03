<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewEmailReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $email;
    public $category;
    public $newEmails;
    public $count;

    public function __construct($email, $category, $newEmails = [], $count = 0)
    {
        $this->email = $email;
        $this->category = $category;
        $this->newEmails = $newEmails;
        $this->count = $count;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('email-sync.' . (auth()->id() ?? 'guest'));
    }

    public function broadcastAs()
    {
        return 'email.new.received';
    }

    public function broadcastWith()
    {
        return [
            'email' => $this->email,
            'category' => $this->category,
            'newEmails' => $this->newEmails,
            'count' => $this->count,
            'timestamp' => now()->toISOString()
        ];
    }
} 