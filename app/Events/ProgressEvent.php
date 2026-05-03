<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;

class ProgressEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $userId;
    public string $processId;
    public string $type;
    public float $percent;
    public string $message;
    public array $details;

    /**
     * Create a new event instance.
     *
     * @param int $userId
     * @param string $processId Unique process ID
     * @param string $type E.g. 'import_csv', 'export_excel'
     * @param float $percent Completion percent
     * @param string $message Human-readable status
     * @param array $details Optional details like inserted, total, etc.
     */
    public function __construct(int $userId, string $processId, string $type, float $percent, string $message, array $details = [])
    {
        $this->userId = $userId;
        $this->processId = $processId;
        $this->type = $type;
        $this->percent = round($percent, 2);
        $this->message = $message;
        $this->details = $details;
    }

    public function broadcastOn(): Channel
    {
        return new Channel("progress.user.{$this->userId}.{$this->processId}");
    }

    public function broadcastAs(): string
    {
        return 'progress';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'process_id' => $this->processId,
            'type' => $this->type,
            'percent' => $this->percent,
            'message' => $this->message,
            'details' => $this->details,
        ];
    }
}
