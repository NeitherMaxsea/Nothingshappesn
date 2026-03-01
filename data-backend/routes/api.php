<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\AdminRegistrationReviewController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::get('/auth/registration-status', [AuthController::class, 'registrationStatus']);
Route::post('/auth/send-otp', [OtpController::class, 'sendOtp']);
Route::post('/auth/verify-otp', [OtpController::class, 'verifyOtp']);

Route::get('/admin/registrations', [AdminRegistrationReviewController::class, 'index']);
Route::get('/admin/registrations/{type}/{id}', [AdminRegistrationReviewController::class, 'show']);
Route::patch('/admin/registrations/{type}/{id}/account', [AdminRegistrationReviewController::class, 'updateAccount']);
Route::delete('/admin/registrations/{type}/{id}/account', [AdminRegistrationReviewController::class, 'destroyAccount']);
Route::patch('/admin/registrations/{type}/{id}/approve', [AdminRegistrationReviewController::class, 'approve']);
Route::patch('/admin/registrations/{type}/{id}/reject', [AdminRegistrationReviewController::class, 'reject']);
