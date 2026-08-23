<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\MessageAttachment;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seller;
use App\Models\SellerOrder;
use App\Models\User;
use App\Services\MediaStorageService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessagingController extends Controller
{
    public function __construct(
        private readonly MediaStorageService $media,
        private readonly NotificationService $notifications,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $conversations = Conversation::query()
            ->whereHas('participants', fn ($query) => $this->participantScope($query, $user))
            ->with(['participants.participantable', 'latestMessage.senderable'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (Conversation $conversation) => $this->conversationPayload($conversation, $user))
            ->values();

        return response()->json(['data' => $conversations]);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $participant = $this->participant($conversation, $request->user());
        $conversation->load(['participants.participantable', 'messages.senderable', 'messages.attachments']);

        return response()->json([
            'data' => [
                ...$this->conversationPayload($conversation, $request->user(), $participant),
                'messages' => $conversation->messages
                    ->sortBy(fn (Message $message) => $message->sent_at?->getTimestamp() ?? $message->id)
                    ->map(fn (Message $message) => $this->messagePayload($message, $request->user()))
                    ->values(),
            ],
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'seller_id' => ['required', 'integer', 'exists:sellers,id'],
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'seller_order_id' => ['nullable', 'integer', 'exists:seller_orders,id'],
            'subject' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $seller = Seller::query()->with('user')->findOrFail($data['seller_id']);
        abort_if(! $seller->isApproved() || ! $seller->user || $seller->user->status !== 'active', 422, 'This seller is not available for messaging.');
        abort_if($seller->user_id === $user->id, 422, 'You cannot start a conversation with yourself.');

        $order = null;
        $product = null;
        $sellerOrder = null;
        if (! empty($data['order_id'])) {
            $order = Order::query()
                ->where('buyer_id', $user->id)
                ->whereHas('sellerOrders', fn ($query) => $query->where('seller_id', $seller->id))
                ->findOrFail($data['order_id']);
        }

        if (! empty($data['product_id'])) {
            $product = Product::query()->where('seller_id', $seller->id)->where('status', 'active')->findOrFail($data['product_id']);
        }

        if (! empty($data['seller_order_id'])) {
            $sellerOrder = SellerOrder::query()
                ->where('seller_id', $seller->id)
                ->whereHas('order', fn ($query) => $query->where('buyer_id', $user->id))
                ->findOrFail($data['seller_order_id']);
            $order ??= $sellerOrder->order;
        }

        $conversation = Conversation::query()
            ->where('type', 'direct')
            ->whereHas('participants', fn ($query) => $this->participantScope($query, $user))
            ->whereHas('participants', fn ($query) => $this->participantScope($query, $seller->user))
            ->where('order_id', $order?->id)
            ->where('product_id', $product?->id)
            ->where('seller_order_id', $sellerOrder?->id)
            ->first();
        $created = false;

        if (! $conversation) {
            $created = true;
            $conversation = DB::transaction(function () use ($data, $order, $product, $sellerOrder, $seller, $user) {
                $conversation = Conversation::create([
                    'type' => 'direct',
                    'subject' => $data['subject'] ?? ($order ? 'Order '.$order->order_number : $seller->trade_name ?? $seller->business_name),
                    'order_id' => $order?->id,
                    'product_id' => $product?->id,
                    'seller_order_id' => $sellerOrder?->id,
                    'order_number' => $order?->order_number,
                ]);

                foreach ([$user, $seller->user] as $participantUser) {
                    $conversation->participants()->create([
                        'participantable_type' => User::class,
                        'participantable_id' => $participantUser->id,
                    ]);
                }

                return $conversation;
            });
        }

        $conversation->load(['participants.participantable', 'latestMessage.senderable']);

        return response()->json([
            'message' => 'Conversation ready.',
            'data' => $this->conversationPayload($conversation, $user),
        ], $created ? 201 : 200);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'conversation_id' => ['required', 'integer', 'exists:conversations,id'],
            'body' => ['nullable', 'string', 'max:5000', 'required_without:attachments'],
            'attachments' => ['sometimes', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,webp,pdf,txt', 'max:5120'],
        ]);

        return $this->send($request, Conversation::findOrFail($data['conversation_id']));
    }

    public function send(Request $request, Conversation $conversation): JsonResponse
    {
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000', 'required_without:attachments'],
            'attachments' => ['sometimes', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,webp,pdf,txt', 'max:5120'],
        ]);
        $user = $request->user();
        $participant = $this->participant($conversation, $user);
        $body = trim($data['body']);
        abort_if($body === '' && ! $request->hasFile('attachments'), 422, 'Message text or an attachment is required.');

        $message = DB::transaction(function () use ($body, $conversation, $participant, $user, $request) {
            $message = $conversation->messages()->create([
                'senderable_type' => User::class,
                'senderable_id' => $user->id,
                'body' => $body ?: 'Attachment',
                'status' => 'sent',
                'sent_at' => now(),
                'order_id' => $conversation->order_id,
                'order_number' => $conversation->order_number,
            ]);

            foreach ($request->file('attachments', []) as $file) {
                $stored = $this->media->storePrivateFile($file, "messages/{$conversation->id}/{$message->id}");
                $message->attachments()->create([
                    'storage_disk' => $stored['storage_disk'],
                    'file_name' => basename($stored['storage_path']),
                    'file_path' => $stored['storage_path'],
                    'original_filename' => $stored['original_filename'],
                    'mime_type' => $stored['mime_type'],
                    'file_size' => $stored['file_size'],
                    'kind' => str_starts_with((string) $stored['mime_type'], 'image/') ? 'image' : 'file',
                ]);
            }

            $conversation->forceFill([
                'last_message_preview' => str($body ?: 'Attachment')->limit(160),
                'last_message_at' => $message->sent_at,
            ])->save();
            $conversation->participants()->where('id', '!=', $participant->id)->increment('unread_count');
            $participant->forceFill(['last_read_at' => now(), 'unread_count' => 0])->save();
            $conversation->forceFill(['unread_count' => $conversation->participants()->sum('unread_count')])->save();

            return $message;
        });

        $message->load(['senderable', 'attachments']);
        $conversation->loadMissing('participants.participantable');
        foreach ($conversation->participants as $otherParticipant) {
            $recipient = $otherParticipant->participantable;
            if ($recipient instanceof User && $recipient->id !== $user->id) {
                $this->notifications->publishToUser($recipient, [
                    'category' => 'message',
                    'title' => 'New message',
                    'body' => $user->display_name.' sent you a message.',
                    'action_type' => 'conversation',
                    'action_label' => 'Open conversation',
                    'conversation_id' => $conversation->id,
                ]);
            }
        }

        return response()->json([
            'message' => 'Message sent.',
            'data' => $this->messagePayload($message, $user),
        ], 201);
    }

    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        $participant = $this->participant($conversation, $user);

        DB::transaction(function () use ($conversation, $participant, $user) {
            $participant->forceFill(['unread_count' => 0, 'last_read_at' => now()])->save();
            $conversation->messages()
                ->where(fn ($query) => $query
                    ->where('senderable_type', '!=', User::class)
                    ->orWhere('senderable_id', '!=', $user->id))
                ->update(['status' => 'read']);
            $conversation->forceFill(['unread_count' => $conversation->participants()->sum('unread_count')])->save();
        });

        return response()->json(['message' => 'Conversation marked as read.']);
    }

    public function attachment(Request $request, MessageAttachment $attachment): RedirectResponse
    {
        $conversation = $attachment->message?->conversation;
        abort_unless($conversation, 404);
        $this->participant($conversation, $request->user());

        return redirect()->away($this->media->temporaryUrl($attachment->file_path, 10, $attachment->storage_disk));
    }

    private function participant(Conversation $conversation, User $user): ConversationParticipant
    {
        $participant = $conversation->participants()
            ->where('participantable_type', User::class)
            ->where('participantable_id', $user->id)
            ->first();
        abort_unless($participant, 404);

        return $participant;
    }

    private function participantScope($query, User $user)
    {
        return $query->where('participantable_type', User::class)->where('participantable_id', $user->id);
    }

    private function conversationPayload(Conversation $conversation, User $viewer, ?ConversationParticipant $viewerParticipant = null): array
    {
        $viewerParticipant ??= $conversation->participants->first(fn ($participant) =>
            $participant->participantable_type === User::class && $participant->participantable_id === $viewer->id);
        $other = $conversation->participants->first(fn ($participant) =>
            ! ($participant->participantable_type === User::class && $participant->participantable_id === $viewer->id));
        $identity = $other?->participantable;
        if ($identity instanceof User) {
            $identity->loadMissing('seller');
        }

        return [
            'id' => $conversation->id,
            'subject' => $conversation->subject,
            'order_id' => $conversation->order_id,
            'order_number' => $conversation->order_number,
            'product_id' => $conversation->product_id,
            'seller_order_id' => $conversation->seller_order_id,
            'last_message_preview' => $conversation->last_message_preview,
            'last_message_at' => optional($conversation->last_message_at)->toISOString(),
            'unread_count' => (int) ($viewerParticipant?->unread_count ?? 0),
            'participant' => $identity instanceof User ? [
                'id' => $identity->id,
                'name' => $identity->seller?->trade_name ?? $identity->seller?->business_name ?? $identity->display_name,
                'role' => $identity->role,
            ] : null,
        ];
    }

    private function messagePayload(Message $message, User $viewer): array
    {
        $sender = $message->senderable;

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'body' => $message->body,
            'status' => $message->status,
            'is_system' => (bool) $message->is_system,
            'sent_at' => optional($message->sent_at)->toISOString(),
            'is_mine' => $message->senderable_type === User::class && $message->senderable_id === $viewer->id,
            'sender' => $sender instanceof User ? [
                'id' => $sender->id,
                'name' => $sender->display_name,
                'role' => $sender->role,
            ] : null,
            'attachments' => $message->attachments->map(fn (MessageAttachment $attachment) => [
                'id' => $attachment->id,
                'name' => $attachment->original_filename ?? $attachment->file_name,
                'mime_type' => $attachment->mime_type,
                'file_size' => (int) $attachment->file_size,
                'kind' => $attachment->kind,
                'url' => "/api/messages/attachments/{$attachment->id}",
            ])->values(),
        ];
    }
}
