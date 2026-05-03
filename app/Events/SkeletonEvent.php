<?php

namespace App\Events;

use App\Facades\Developer;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SkeletonEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $system;
    public string $table;
    public string $operation;
    public array $condition;
    public array $preVal;
    public string $key;
    public array $map;

    /**
     * SkeletonEvent constructor.
     */
    public function __construct(string $system, string $table, string $operation, array $condition, array $preVal, string $key, array $map)
    {
        $this->system = $system;
        $this->table = $table;
        $this->operation = $operation;
        $this->condition = $condition;
        $this->preVal = $preVal;
        $this->key = $key;
        $this->map = $map;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('skeleton-channel');
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'skeleton.update';
    }

    /**
     * The data to broadcast.
     */
    public function broadcastWith(): array
    {
        $key = $this->key;
        return [
            'token' => $key,
        ];
    }
}

