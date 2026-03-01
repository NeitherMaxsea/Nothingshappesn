<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\OtpController;
use App\Models\ApplicantRegistration;
use App\Models\CompanyRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', 'in:applicant,employer,company_admin'],

            'disabilityType' => ['nullable', 'string', 'max:255'],
            'firstName' => ['nullable', 'string', 'max:255'],
            'lastName' => ['nullable', 'string', 'max:255'],
            'sex' => ['nullable', 'string', 'max:100'],
            'birthDate' => ['nullable', 'date'],
            'addressProvince' => ['nullable', 'string', 'max:255'],
            'addressCity' => ['nullable', 'string', 'max:255'],
            'addressBarangay' => ['nullable', 'string', 'max:255'],
            'pwdIdNumber' => ['nullable', 'string', 'max:255'],
            'pwdIdImageName' => ['nullable', 'string', 'max:255'],

            'companyName' => ['nullable', 'string', 'max:255'],
            'companyAddress' => ['nullable', 'string', 'max:255'],
            'companyIndustry' => ['nullable', 'string', 'max:255'],
        ]);

        $email = strtolower($validated['email']);
        $username = $validated['username'];

        $emailExists = ApplicantRegistration::where('email', $email)->exists()
            || CompanyRegistration::where('email', $email)->exists();
        $usernameExists = ApplicantRegistration::where('username', $username)->exists()
            || CompanyRegistration::where('username', $username)->exists();

        if ($emailExists || $usernameExists) {
            throw ValidationException::withMessages([
                ...($emailExists ? ['email' => 'Email is already registered.'] : []),
                ...($usernameExists ? ['username' => 'Username is already registered.'] : []),
            ]);
        }

        $common = [
            'name' => $validated['name'] ?? trim(($validated['firstName'] ?? '') . ' ' . ($validated['lastName'] ?? '')) ?: null,
            'username' => $username,
            'email' => $email,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'status' => 'pending',
        ];

        if ($validated['role'] === 'applicant') {
            $record = ApplicantRegistration::create([
                ...$common,
                'disability_type' => $validated['disabilityType'] ?? null,
                'first_name' => $validated['firstName'] ?? null,
                'last_name' => $validated['lastName'] ?? null,
                'sex' => $validated['sex'] ?? null,
                'birth_date' => $validated['birthDate'] ?? null,
                'address_province' => $validated['addressProvince'] ?? null,
                'address_city' => $validated['addressCity'] ?? null,
                'address_barangay' => $validated['addressBarangay'] ?? null,
                'pwd_id_number' => $validated['pwdIdNumber'] ?? null,
                'pwd_id_image_name' => $validated['pwdIdImageName'] ?? null,
            ]);
        } else {
            $record = CompanyRegistration::create([
                ...$common,
                'company_name' => $validated['companyName'] ?? null,
                'company_address' => $validated['companyAddress'] ?? null,
                'company_industry' => $validated['companyIndustry'] ?? null,
            ]);
        }

        $otpResult = app(OtpController::class)->issueOtpForEmail($email, 'register');

        return response()->json([
            'message' => 'Registration submitted. Waiting for admin approval.',
            'status' => $record->status,
            'id' => $record->id,
            // Keep frontend compatible behavior.
            'otpRequired' => true,
            'otpSent' => (bool) ($otpResult['sent'] ?? false),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $identifier = trim($validated['identifier']);
        $normalizedIdentifier = strtolower($identifier);

        $record = ApplicantRegistration::query()
            ->where('email', $normalizedIdentifier)
            ->orWhere('username', $identifier)
            ->first();

        $recordType = 'applicant';

        if (!$record) {
            $record = CompanyRegistration::query()
                ->where('email', $normalizedIdentifier)
                ->orWhere('username', $identifier)
                ->first();
            $recordType = 'company';
        }

        if (!$record || !Hash::check($validated['password'], $record->password)) {
            return response()->json([
                'message' => 'Login details are incorrect!',
            ], 401);
        }

        if ($record->status === 'pending') {
            return response()->json([
                'message' => 'Your account is pending admin approval.',
                'status' => 'pending',
            ], 403);
        }

        if ($record->status === 'rejected') {
            return response()->json([
                'message' => 'Your registration was rejected. Please contact admin.',
                'status' => 'rejected',
            ], 403);
        }

        return response()->json([
            'message' => 'Login successful!',
            'status' => 'approved',
            'user' => [
                'id' => $record->id,
                'name' => $record->name ?: trim(($record->first_name ?? '') . ' ' . ($record->last_name ?? '')),
                'email' => $record->email,
                'username' => $record->username,
                'role' => $record->role,
                'registrationType' => $recordType,
            ],
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $email = strtolower(trim($validated['email']));
        $verifiedResetKey = 'otp_reset_verified:' . sha1($email);

        if (!Cache::get($verifiedResetKey)) {
            return response()->json([
                'message' => 'Failed to reset password. Verify OTP first.',
            ], 403);
        }

        $record = ApplicantRegistration::where('email', $email)->first();
        if (!$record) {
            $record = CompanyRegistration::where('email', $email)->first();
        }

        if (!$record) {
            return response()->json([
                'message' => 'No account found for this email address.',
            ], 404);
        }

        $record->password = Hash::make($validated['password']);
        $record->save();

        Cache::forget($verifiedResetKey);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    public function registrationStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));

        $record = ApplicantRegistration::where('email', $email)->first();
        $registrationType = 'applicant';

        if (!$record) {
            $record = CompanyRegistration::where('email', $email)->first();
            $registrationType = 'company';
        }

        if (!$record) {
            return response()->json([
                'message' => 'Registration not found.',
                'found' => false,
            ], 404);
        }

        return response()->json([
            'found' => true,
            'status' => $record->status,
            'email' => $record->email,
            'registrationType' => $registrationType,
            'approvedAt' => optional($record->approved_at)->toDateTimeString(),
            'rejectedAt' => optional($record->rejected_at)->toDateTimeString(),
            'adminNotes' => $record->admin_notes,
        ]);
    }
}
