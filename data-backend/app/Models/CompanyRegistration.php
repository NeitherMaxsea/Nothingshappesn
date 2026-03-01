<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyRegistration extends Model
{
    use HasFactory;

    protected $table = 'company_registrations';

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'status',
        'company_name',
        'company_address',
        'company_industry',
        'admin_notes',
        'approved_at',
        'rejected_at',
    ];

    protected $hidden = ['password'];
}

