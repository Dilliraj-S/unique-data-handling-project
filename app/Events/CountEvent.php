<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class CountEvent implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public int $userId;
    public string $processId;
    public string $type;
    public string $count;

    public function __construct(int $userId, string $processId, string $type, string $count)
    {
        $this->userId = $userId;
        $this->processId = $processId;
        $this->type = $type;
        $this->count = $count;
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("progress.user.{$this->userId}.{$this->processId}");
    }

    public function broadcastWith(): array
    {
        return [
            'type' => $this->type,
            'count' => $this->count,
        ];
        
    }

    public function broadcastAs(): string
    {
        return 'CountEvent';
    }
}
