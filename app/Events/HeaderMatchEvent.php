<?php
namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HeaderMatchEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $userId;
    public $map;

    public function __construct(int $userId, array $map)
    {
        $this->userId = $userId;
        $this->map = $map;
    }

    public function broadcastOn()
    {
        return new Channel('match.headers.' . $this->userId);
    }

    public function broadcastAs()
    {
        return 'headers';
    }

    public function broadcastWith()
    {
        return [
            'user_id' => $this->userId,
            'map' => $this->map,
        ];
    }
}
