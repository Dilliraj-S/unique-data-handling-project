<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EmailSyncProgress implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $email;
    public $category;
    public $syncedCount;
    public $totalCount;
    public $progress;

    /**
     * Create a new event instance.
     */
    public function __construct($email, $category, $syncedCount, $totalCount)
    {
        $this->email = $email;
        $this->category = $category;
        $this->syncedCount = $syncedCount;
        $this->totalCount = $totalCount;
        $this->progress = $totalCount > 0 ? round(($syncedCount / $totalCount) * 100, 1) : 0;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('email-sync-progress'),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'email' => $this->email,
            'category' => $this->category,
            'synced_count' => $this->syncedCount,
            'total_count' => $this->totalCount,
            'progress' => $this->progress,
            'timestamp' => now()->toISOString()
        ];
    }
} 