<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApplicantRegistration;
use App\Models\CompanyRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminRegistrationReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $type = $request->query('type');

        $items = collect();

        if (!$type || $type === 'applicant') {
            $applicantQuery = ApplicantRegistration::query()->orderByDesc('created_at');
            if (is_string($status) && in_array($status, ['pending', 'approved', 'rejected'], true)) {
                $applicantQuery->where('status', $status);
            }
            $items = $items->merge($applicantQuery->get()->map(
                fn (ApplicantRegistration $item) => $this->serializeApplicant($item)
            ));
        }

        if (!$type || $type === 'company') {
            $companyQuery = CompanyRegistration::query()->orderByDesc('created_at');
            if (is_string($status) && in_array($status, ['pending', 'approved', 'rejected'], true)) {
                $companyQuery->where('status', $status);
            }
            $items = $items->merge($companyQuery->get()->map(
                fn (CompanyRegistration $item) => $this->serializeCompany($item)
            ));
        }

        $items = $items->sortByDesc('submittedAt')->values();

        return response()->json([
            'items' => $items,
            'counts' => [
                'pending' => ApplicantRegistration::where('status', 'pending')->count() + CompanyRegistration::where('status', 'pending')->count(),
                'approved' => ApplicantRegistration::where('status', 'approved')->count() + CompanyRegistration::where('status', 'approved')->count(),
                'rejected' => ApplicantRegistration::where('status', 'rejected')->count() + CompanyRegistration::where('status', 'rejected')->count(),
                'applicant_pending' => ApplicantRegistration::where('status', 'pending')->count(),
                'company_pending' => CompanyRegistration::where('status', 'pending')->count(),
            ],
        ]);
    }

    public function show(string $type, int $id): JsonResponse
    {
        [$model, $normalizedType] = $this->resolveModel($type, $id);

        return response()->json([
            'item' => $normalizedType === 'applicant'
                ? $this->serializeApplicant($model)
                : $this->serializeCompany($model),
        ]);
    }

    public function approve(Request $request, string $type, int $id): JsonResponse
    {
        $validated = $request->validate([
            'adminNotes' => ['nullable', 'string'],
        ]);

        [$item, $normalizedType] = $this->resolveModel($type, $id);

        $item->status = 'approved';
        $item->admin_notes = $validated['adminNotes'] ?? $item->admin_notes;
        $item->approved_at = now();
        $item->rejected_at = null;
        $item->save();

        return response()->json([
            'message' => 'Registration approved.',
            'status' => $item->status,
            'id' => $item->id,
            'type' => $normalizedType,
        ]);
    }

    public function reject(Request $request, string $type, int $id): JsonResponse
    {
        $validated = $request->validate([
            'adminNotes' => ['nullable', 'string'],
        ]);

        [$item, $normalizedType] = $this->resolveModel($type, $id);

        $item->status = 'rejected';
        $item->admin_notes = $validated['adminNotes'] ?? $item->admin_notes;
        $item->rejected_at = now();
        $item->approved_at = null;
        $item->save();

        return response()->json([
            'message' => 'Registration rejected.',
            'status' => $item->status,
            'id' => $item->id,
            'type' => $normalizedType,
        ]);
    }

    public function updateAccount(Request $request, string $type, int $id): JsonResponse
    {
        [$item, $normalizedType] = $this->resolveModel($type, $id);

        $table = $normalizedType === 'applicant'
            ? (new ApplicantRegistration())->getTable()
            : (new CompanyRegistration())->getTable();

        $validated = $request->validate([
            'username' => [
                'required',
                'string',
                'max:255',
                Rule::unique($table, 'username')->ignore($item->id),
            ],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique($table, 'email')->ignore($item->id),
            ],
        ]);

        $item->username = strtolower(trim($validated['username']));
        $item->email = strtolower(trim($validated['email']));
        $item->save();

        return response()->json([
            'message' => 'Account details updated.',
            'id' => $item->id,
            'type' => $normalizedType,
            'username' => $item->username,
            'email' => $item->email,
        ]);
    }

    public function destroyAccount(string $type, int $id): JsonResponse
    {
        [$item, $normalizedType] = $this->resolveModel($type, $id);

        $reference = ($normalizedType === 'applicant' ? 'APP-' : 'COM-')
            . str_pad((string) $item->id, 6, '0', STR_PAD_LEFT);

        $item->delete();

        return response()->json([
            'message' => 'Registration account deleted.',
            'id' => $id,
            'type' => $normalizedType,
            'reference' => $reference,
        ]);
    }

    /**
     * @return array{0: ApplicantRegistration|CompanyRegistration, 1: string}
     */
    private function resolveModel(string $type, int $id): array
    {
        $normalized = strtolower(trim($type));

        if ($normalized === 'applicant') {
            return [ApplicantRegistration::findOrFail($id), 'applicant'];
        }

        if ($normalized === 'company' || $normalized === 'employer' || $normalized === 'company_admin') {
            return [CompanyRegistration::findOrFail($id), 'company'];
        }

        abort(404, 'Invalid registration type.');
    }

    private function serializeApplicant(ApplicantRegistration $item): array
    {
        return [
            'id' => $item->id,
            'type' => 'applicant',
            'reference' => 'APP-' . str_pad((string) $item->id, 6, '0', STR_PAD_LEFT),
            'submittedAt' => optional($item->created_at)->toDateTimeString(),
            'firstName' => $item->first_name,
            'lastName' => $item->last_name,
            'name' => $item->name,
            'sex' => $item->sex,
            'birthDate' => $item->birth_date,
            'disabilityType' => $item->disability_type,
            'email' => $item->email,
            'username' => $item->username,
            'role' => $item->role,
            'status' => $item->status,
            'addressProvince' => $item->address_province,
            'addressCity' => $item->address_city,
            'addressBarangay' => $item->address_barangay,
            'pwdIdNumber' => $item->pwd_id_number,
            'pwdIdImageName' => $item->pwd_id_image_name,
            'adminNotes' => $item->admin_notes,
            'approvedAt' => optional($item->approved_at)->toDateTimeString(),
            'rejectedAt' => optional($item->rejected_at)->toDateTimeString(),
        ];
    }

    private function serializeCompany(CompanyRegistration $item): array
    {
        return [
            'id' => $item->id,
            'type' => 'company',
            'reference' => 'COM-' . str_pad((string) $item->id, 6, '0', STR_PAD_LEFT),
            'submittedAt' => optional($item->created_at)->toDateTimeString(),
            'name' => $item->name,
            'email' => $item->email,
            'username' => $item->username,
            'role' => $item->role,
            'status' => $item->status,
            'companyName' => $item->company_name,
            'companyAddress' => $item->company_address,
            'companyIndustry' => $item->company_industry,
            'adminNotes' => $item->admin_notes,
            'approvedAt' => optional($item->approved_at)->toDateTimeString(),
            'rejectedAt' => optional($item->rejected_at)->toDateTimeString(),
        ];
    }
}
