@php
use App\Facades\{BusinessDB, Developer, Skeleton};
$isUpdate = isset($company);
Developer::info(['isUpdate' => $isUpdate, 'company_id' => $company->company_id ?? 'not set']);
$documents = $isUpdate ? BusinessDB::table('company_documents')->where('company_id', $company->company_id)->get() : collect([]);
Developer::info(['documents_count' => $documents->count(), 'documents' => $documents->toArray()]);
$docMap = $documents->keyBy('document_type');
Developer::info(['docMap' => $docMap->toArray()]);
$companyData = $company ?? (object)[];
$addressJson = isset($companyData->address_json) ? json_decode($companyData->address_json, true) : [];
$socialLinksJson = isset($companyData->social_links_json) ? json_decode($companyData->social_links_json, true) : [];
Developer::info(['company_data' => (array)$companyData, 'address_json' => $addressJson, 'social_links_json' => $socialLinksJson]);
@endphp
<div id="stepper" class="bs-stepper p-2">
    <div class="bs-stepper-header d-flex align-items-center mb-4" role="tablist">
        @foreach (['Basic Info' => '#step-1', 'Contact' => '#step-2', 'Address' => '#step-3', 'Social Links' => '#step-4', 'Documents' => '#step-5'] as $label => $target)
            <div class="step" data-target="{{ $target }}">
                <button type="button" class="step-trigger btn p-1" role="tab">{{ $label }}</button>
            </div>
            @if (!$loop->last)
                <div class="flex-grow-1 border-top border-3 border-primary mx-2"></div>
            @endif
        @endforeach
    </div>
    <div class="bs-stepper-content p-0">
        <!-- Step 1: Basic Info -->
        <div id="step-1" class="content" role="tabpanel">
            <input type="hidden" name="save_token" value="{{ $token ?? '' }}">
            <input type="hidden" name="logo" value="{{ asset(old('profile_image', $companyData->logo ?? '')) }}" data-image="image" data-label="Upload Logo">
            <div class="row">
                @foreach ([
                    'company_id' => ['label' => 'Company ID', 'required' => true, 'type' => 'text','attr' => ['data-validate' => 'company-code']],
                    'name' => ['label' => 'Company Name', 'required' => true, 'type' => 'text'],
                    'legal_name' => ['label' => 'Legal Name', 'required' => true, 'type' => 'text'],
                    'founded_date' => ['label' => 'Founded Date', 'required' => true, 'type' => 'date'],
                    'industry' => ['label' => 'Industry', 'required' => true, 'type' => 'text'],
                    'website' => ['label' => 'Website', 'required' => true, 'type' => 'url'],
                ] as $field => $data)
                    <div class="col-md-6 mb-3">

                        <div class="float-input-control">
                            <input type="{{ $data['type'] }}" id="{{ $field }}" name="{{ $field }}"
                                value="{{ old($field, $companyData->$field ?? '') }}" class="form-float-input"
                                {{ $data['required'] ? 'required' : '' }} placeholder="none">
                            <label for="{{ $field }}" class="form-float-label">
                                {!! $data['label'] . ($data['required'] ? '<span class="text-danger">*</span>' : '') !!}
                            </label>
                        </div>
                    </div>
                @endforeach
            </div>
            <button type="button" class="btn btn-primary mt-3" onclick="stepper.next()">Next <i class="fas fa-arrow-right ms-2"></i></button>
        </div>
        <!-- Step 2: Contact -->
        <div id="step-2" class="content" role="tabpanel">
            <div class="row">
                <h4 class="p-2 ms-2">Manager Details</h4>
                <input type="hidden" name="owner_profile" value="{{ asset(old('profile_image', $companyData->owner_profile ?? '')) }}" data-image="image" data-label="Upload Logo">

   
                @foreach ([
                    'manager_name' => ['label' => 'Manager Name', 'required' => true, 'type' => 'text'],
                    'manager_phone' => ['label' => 'Manager Phone', 'required' => true, 'type' => 'tel'],
                    'manager_email' => ['label' => 'Manager Email', 'required' => false, 'type' => 'email'],
                ] as $field => $data)
                    <div class="col-md-6 mb-3">

                        <div class="float-input-control">
                            <input type="{{ $data['type'] }}" id="{{ $field }}" name="{{ $field }}"
                                value="{{ old($field, $companyData->$field ?? '') }}" class="form-float-input"
                                {{ $data['required'] ? 'required' : '' }} placeholder="none">
                            <label for="{{ $field }}" class="form-float-label">
                                {!! $data['label'] . ($data['required'] ? '<span class="text-danger">*</span>' : '') !!}
                            </label>
                        </div>

                        
                    </div>
                @endforeach
                <h4 class="p-2 ms-2">Company Contact Details</h4>
                @foreach ([
                    'phone' => ['label' => 'Phone', 'required' => true, 'type' => 'tel'],
                    'email' => ['label' => 'Email', 'required' => true, 'type' => 'email'],
                    'tax_id' => ['label' => 'Tax ID', 'required' => false, 'type' => 'text'],
                    'no_of_employees' => ['label' => 'Number of Employees', 'required' => false, 'type' => 'number'],
                ] as $field => $data)
                    <div class="col-md-6 mb-3">
                       <div class="float-input-control">
                            <input type="{{ $data['type'] }}" id="{{ $field }}" name="{{ $field }}"
                                value="{{ old($field, $companyData->$field ?? '') }}" class="form-float-input"
                                {{ $data['required'] ? 'required' : '' }} placeholder="none">
                            <label for="{{ $field }}" class="form-float-label">
                                {!! $data['label'] . ($data['required'] ? '<span class="text-danger">*</span>' : '') !!}
                            </label>
                        </div>
                    </div>
                @endforeach
            </div>
            <div class="d-flex justify-content-between mt-3">
                <button type="button" class="btn btn-outline-secondary px-4" onclick="stepper.previous()">
                    <i class="fas fa-arrow-left me-2"></i>Back
                </button>
                <button type="button" class="btn btn-primary px-4" onclick="stepper.next()">
                    Next <i class="fas fa-arrow-right ms-2"></i>
                </button>
            </div>
        </div>
        <!-- Step 3: Address -->
        <div id="step-3" class="content" role="tabpanel">
            <div class="row">
                @foreach ([
                    'street' => ['label' => 'Street', 'required' => true],
                    'city' => ['label' => 'City', 'required' => true],
                    'state' => ['label' => 'State', 'required' => false],
                    'country' => ['label' => 'Country', 'required' => true],
                    'postal_code' => ['label' => 'Postal Code', 'required' => true],
                ] as $field => $data)
                    <div class="col-md-6 mb-3">
                       
                        <div class="float-input-control">
                            <input type="text" id="address_{{ $field }}" name="address_{{ $field }}"
                                value="{{ old('address_' .$field, $addressJson[$field] ?? '') }}" class="form-float-input"
                                {{ $data['required'] ? 'required' : '' }} placeholder="none">
                            <label for="{{ $field }}" class="form-float-label">
                                {!! $data['label'] !!}@if($data['required'])<span class="text-danger">*</span>@endif
                            </label>
                        </div>

                    </div>
                @endforeach
            </div>
            <div class="d-flex justify-content-between mt-3">
                <button type="button" class="btn btn-outline-secondary px-4" onclick="stepper.previous()">
                    <i class="fas fa-arrow-left me-2"></i>Back
                </button>
                <button type="button" class="btn btn-primary px-4" onclick="stepper.next()">
                    Next <i class="fas fa-arrow-right ms-2"></i>
                </button>
            </div>
        </div>
        <!-- Step 4: Social Links -->
        <div id="step-4" class="content" role="tabpanel">
            <div class="row p-4">
                @foreach ([
                    'facebook' => ['label' => 'Facebook', 'icon' => 'facebook.svg', 'db_key' => 'facebook_url'],
                    'instagram' => ['label' => 'Instagram', 'icon' => 'instagram.svg', 'db_key' => 'instagram_url'],
                    'youtube' => ['label' => 'YouTube', 'icon' => 'youtube.svg', 'db_key' => 'youtube_url'],
                    'x' => ['label' => 'X', 'icon' => 'x.svg', 'db_key' => 'x_url'],
                    'linkedin' => ['label' => 'LinkedIn', 'icon' => 'linkedin.svg', 'db_key' => 'linkedin_url'],
                ] as $platform => $data)
                    <div class="row g-0 align-items-center mb-3">
                        <div class="d-flex align-items-start gap-3 col-lg-5">
                            <img src="{{ asset('treasury/social/' . $data['icon']) }}" alt="{{ $data['label'] }}"
                                 class="img-fluid rounded-circle" style="width: 30px; height: 30px;">
                            <div>
                                <p class="fw-bold sf-16 mb-1">{{ $data['label'] }}</p>
                                <p class="sf-10">Integrate your {{ $data['label'] }} account</p>
                            </div>
                        </div>
                        <div class="col-lg-7">

                            <div class="float-input-control">
                            <input type="text" id="{{ $platform }}_url" name="{{ $platform }}_url"
                                value="{{ old($platform . '_url', $socialLinksJson[$data['db_key']] ?? '') }}" class="form-float-input"
                                 placeholder="none">
                            <label for="{{ $platform }}_url" class="form-float-label">
                                {!! $data['label'] !!}
                            </label>
                        </div>

                          
                        </div>
                    </div>
                @endforeach
            </div>
            <div class="d-flex justify-content-between mt-3">
                <button type="button" class="btn btn-outline-secondary px-4" onclick="stepper.previous()">
                    <i class="fas fa-arrow-left me-2"></i>Back
                </button>
                <button type="button" class="btn btn-primary px-4" onclick="stepper.next()">
                    Next <i class="fas fa-arrow-right ms-2"></i>
                </button>
            </div>
        </div>
        <!-- Step 5: Documents -->
        <div id="step-5" class="content" role="tabpanel">
            <div class="row">
                @foreach ([
                    'aadhar' => ['label' => 'Aadhar Number', 'required' => true, 'description' => 'Aadhar is a unique 12-digit ID issued by the Indian government to residents.'],
                    'pan' => ['label' => 'PAN Number', 'required' => true, 'description' => 'Permanent Account Number used for tax identification in India.'],
                    'uan' => ['label' => 'UAN Number', 'required' => false, 'description' => 'Universal Account Number for EPF accounts in India.'],
                    'gst' => ['label' => 'GST Number', 'required' => false, 'description' => 'Goods and Services Tax number for registered companies.'],
                ] as $field => $data)
                    <div class="col-md-6 mb-4">
                        <div class="card p-3 h-100">
                            <div class="mb-3">
                                <label for="{{ $field }}_number" class="form-label">
                                    {{ $data['label'] }}@if($data['required'])<span class="text-danger">*</span>@endif
                                </label>
                                <input type="text" id="{{ $field }}_number" name="{{ $field }}_number"
                                       value="{{ old($field . '_number', $docMap[$field]->description ?? '') }}"
                                       class="form-control" {{ $data['required'] ? 'required' : '' }}
                                       placeholder="{{ $data['label'] }}">
                                <small class="form-text text-muted">{{ $data['description'] }}</small>
                            </div>
                            <div>
                                <label for="{{ $field }}_file" class="form-label">{{ $data['label'] }} Document</label>
                                <input type="file" id="{{ $field }}_file" name="{{ $field }}_file"
                                       class="form-control" {{ $data['required'] ? 'required' : '' }}>
                                @if ($isUpdate && isset($docMap[$field]->document))
                                    <small class="form-text text-muted">
                                        Current: <a href="{{ asset($docMap[$field]->document) }}" target="_blank">View Document</a>
                                    </small>
                                @endif
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
            <div class="d-flex justify-content-between mt-3">
                <button type="button" class="btn btn-outline-secondary px-4" onclick="stepper.previous()">
                    <i class="fas fa-arrow-left me-2"></i>Back
                </button>
                <button type="submit" class="btn btn-success px-4">
                    {{ $isUpdate ? 'Update' : 'Create' }} Company <i class="fas fa-check ms-2"></i>
                </button>
            </div>
        </div>
    </div>
</div>