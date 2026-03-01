<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApplicantRegistration;
use App\Models\CompanyRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use SendGrid\Mail\Mail as SendGridMessage;
use SendGrid\Response as SendGridResponse;

class OtpController extends Controller
{
    private const OTP_LENGTH = 6;
    private const OTP_TTL_MINUTES = 10;

    public function sendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'mode' => ['nullable', 'string', 'max:50'],
        ]);

        $email = $this->normalizeEmail($validated['email']);
        $mode = strtolower(trim((string) ($validated['mode'] ?? '')));

        if ($mode === 'reset' && !$this->accountExistsForPasswordReset($email)) {
            return response()->json([
                'message' => 'No account found for this email address.',
            ], 404);
        }

        $result = $this->issueOtpForEmail($email, $validated['mode'] ?? null);

        if (!$result['sent']) {
            return response()->json([
                'message' => $result['message'],
            ], 500);
        }

        return response()->json([
            'message' => 'OTP sent successfully.',
            'email' => $email,
            'expiresInSeconds' => self::OTP_TTL_MINUTES * 60,
        ]);
    }

    public function issueOtpForEmail(string $email, ?string $mode = null): array
    {
        $email = $this->normalizeEmail($email);
        $otp = $this->generateOtp();
        $cacheKey = $this->cacheKey($email);

        Cache::put($cacheKey, [
            'otp_hash' => Hash::make($otp),
            'email' => $email,
            'mode' => $mode,
            'attempts' => 0,
            'issued_at' => now()->toIso8601String(),
        ], now()->addMinutes(self::OTP_TTL_MINUTES));

        try {
            $sentViaSendGrid = $this->sendOtpViaSendGrid($email, $otp);

            if (!$sentViaSendGrid) {
                Mail::raw(
                    "Your OTP code is {$otp}. It expires in " . self::OTP_TTL_MINUTES . " minutes.",
                    function ($message) use ($email) {
                        $message->to($email)->subject('Your OTP Verification Code');
                    }
                );
            }
        } catch (\Throwable $e) {
            Log::warning('OTP email send failed', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            return [
                'sent' => false,
                'message' => 'Failed to send OTP email.',
            ];
        }

        return [
            'sent' => true,
            'message' => 'OTP sent successfully.',
        ];
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'otp' => ['required', 'digits:' . self::OTP_LENGTH],
            'mode' => ['nullable', 'string', 'max:50'],
        ]);

        $email = $this->normalizeEmail($validated['email']);
        $otp = (string) $validated['otp'];
        $cacheKey = $this->cacheKey($email);
        $payload = Cache::get($cacheKey);

        if (!is_array($payload) || empty($payload['otp_hash'])) {
            return response()->json([
                'valid' => false,
                'message' => 'OTP not found or expired.',
            ], 422);
        }

        if (!Hash::check($otp, (string) $payload['otp_hash'])) {
            $attempts = (int) ($payload['attempts'] ?? 0) + 1;
            $payload['attempts'] = $attempts;
            Cache::put($cacheKey, $payload, now()->addMinutes(self::OTP_TTL_MINUTES));

            return response()->json([
                'valid' => false,
                'message' => 'Incorrect or expired OTP',
            ], 422);
        }

        Cache::forget($cacheKey);

        $mode = strtolower(trim((string) ($validated['mode'] ?? '')));
        if ($mode === 'reset') {
            Cache::put($this->resetVerifiedCacheKey($email), true, now()->addMinutes(self::OTP_TTL_MINUTES));
        }

        return response()->json([
            'valid' => true,
            'message' => 'OTP verified successfully.',
            'email' => $email,
            'mode' => $validated['mode'] ?? null,
        ]);
    }

    private function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function cacheKey(string $email): string
    {
        return 'otp:' . sha1($this->normalizeEmail($email));
    }

    private function resetVerifiedCacheKey(string $email): string
    {
        return 'otp_reset_verified:' . sha1($this->normalizeEmail($email));
    }

    private function generateOtp(): string
    {
        $max = (10 ** self::OTP_LENGTH) - 1;

        return str_pad((string) random_int(0, $max), self::OTP_LENGTH, '0', STR_PAD_LEFT);
    }

    private function accountExistsForPasswordReset(string $email): bool
    {
        return ApplicantRegistration::where('email', $email)->exists()
            || CompanyRegistration::where('email', $email)->exists();
    }

    private function sendOtpViaSendGrid(string $email, string $otp): bool
    {
        $apiKey = (string) env('SENDGRID_API_KEY', '');
        if ($apiKey === '') {
            return false;
        }

        $fromAddress = (string) config('mail.from.address', 'hello@example.com');
        $fromName = (string) config('mail.from.name', 'HireAble');

        $mail = new SendGridMessage();
        $mail->setFrom($fromAddress, $fromName);
        $mail->setSubject('Your OTP Verification Code');
        $mail->addTo($email);
        $mail->addContent(
            'text/plain',
            "Your OTP code is {$otp}. It expires in " . self::OTP_TTL_MINUTES . " minutes."
        );
        $mail->addContent(
            'text/html',
            '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">'
            . '<p>Your OTP code is:</p>'
            . '<p style="font-size:24px;font-weight:700;letter-spacing:4px;margin:12px 0;">' . e($otp) . '</p>'
            . '<p>This code expires in ' . self::OTP_TTL_MINUTES . ' minutes.</p>'
            . '</div>'
        );

        $sendgrid = new \SendGrid($apiKey);
        $response = $sendgrid->send($mail);

        $this->assertSendGridAccepted($response, $email);

        return true;
    }

    private function assertSendGridAccepted(SendGridResponse $response, string $email): void
    {
        $status = $response->statusCode();
        if ($status >= 200 && $status < 300) {
            return;
        }

        Log::warning('SendGrid OTP send rejected', [
            'email' => $email,
            'status' => $status,
            'body' => $response->body(),
        ]);

        throw new \RuntimeException('SendGrid rejected OTP email request.');
    }
}
