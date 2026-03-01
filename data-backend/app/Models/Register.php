<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Register extends Model
{
    use HasFactory;

    protected $table = 'register';

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'status',
        'disability_type',
        'first_name',
        'last_name',
        'sex',
        'birth_date',
        'address_province',
        'address_city',
        'address_barangay',
        'pwd_id_number',
        'pwd_id_image_name',
        'company_name',
        'company_address',
        'company_industry',
        'admin_notes',
        'approved_at',
        'rejected_at',
    ];

    protected $hidden = [
        'password',
    ];
}

