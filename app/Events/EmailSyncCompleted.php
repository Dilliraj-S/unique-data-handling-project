<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EmailSyncCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $email;
    public $category;
    public $newEmailsCount;
    public $totalEmails;

    public function __construct($email, $category, $newEmailsCount = 0, $totalEmails = 0)
    {
        $this->email = $email;
        $this->category = $category;
        $this->newEmailsCount = $newEmailsCount;
        $this->totalEmails = $totalEmails;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('email-sync.' . (auth()->id() ?? 'guest'));
    }

    public function broadcastAs()
    {
        return 'email.sync.completed';
    }

    public function broadcastWith()
    {
        return [
            'email' => $this->email,
            'category' => $this->category,
            'newEmailsCount' => $this->newEmailsCount,
            'totalEmails' => $this->totalEmails,
            'timestamp' => now()->toISOString()
        ];
    }
} 