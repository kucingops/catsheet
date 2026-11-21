<?php

namespace App\Http\Controllers;

use App\Notes\NoteData;
use App\Notes\NoteRepository;
use App\Notes\NoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Controller tipis: validasi input, authorize, delegasi ke service/repository, format output.
 * Constructor injection: container yang memutuskan NoteRepository implementasinya apa.
 */
class NoteController extends Controller
{
    public function __construct(
        private readonly NoteRepository $notes,
        private readonly NoteService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'driver' => config('catsheet.notes_driver'),
            'data' => array_map(fn (NoteData $n) => $n->toArray(), $this->notes->forUser($request->user()->id)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:255'], 'body' => ['required', 'string']]);

        $note = $this->service->create($request->user()->id, $data['title'], $data['body']);

        return response()->json($note->toArray(), 201);
    }

    public function show(int $note): JsonResponse
    {
        $found = $this->findOrFail($note);
        Gate::authorize('view', $found);

        return response()->json($found->toArray());
    }

    public function update(Request $request, int $note): JsonResponse
    {
        $found = $this->findOrFail($note);
        Gate::authorize('update', $found);
        $data = $request->validate(['title' => ['required', 'string', 'max:255'], 'body' => ['required', 'string']]);

        return response()->json($this->service->update($found, $data['title'], $data['body'])->toArray());
    }

    public function destroy(int $note): JsonResponse
    {
        Gate::authorize('delete', $this->findOrFail($note));
        $this->notes->delete($note);

        return response()->json(status: 204);
    }

    private function findOrFail(int $id): NoteData
    {
        return $this->notes->find($id) ?? abort(404);
    }
}
