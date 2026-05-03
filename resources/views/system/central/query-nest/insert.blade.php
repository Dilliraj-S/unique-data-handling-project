{{-- Template: Insert Page - Auto-generated --}}
@extends('layouts.system-app')
@section('title', 'Insert')
@section('top-style')
    <style>



    </style>
@endsection
@section('bottom-script')


@endsection
@section('content')
    <div class="container-xxl flex-grow-1 container-p-y">
        <div class="row gy-2">
            <div class="col-xl-12">
                <div class="container-fluid px-0 d-flex justify-content-between align-items-center">
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item">
                                <a href="javascript:void(0);">Query Nest</a>
                            </li>
                            <li class="breadcrumb-item active fw-bold">Insert</li>
                        </ol>
                    </nav>
                </div>
            </div>


            <div class="col-xl-12">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <ul class="nav nav-pills data-skl-action" id="skeleton-configs" role="tablist">
                                <li class="nav-item"><a class="nav-link active" id="configs-tab" data-skl-action="b"
                                        data-bs-toggle="tab" href="#import" role="tab" aria-controls="import"
                                        aria-selected="true">Import</a></li>
                                <li class="nav-item"><a class="nav-link" id="configs-tab" data-skl-action="b"
                                        data-bs-toggle="tab" href="#history" role="tab" aria-controls="history"
                                        aria-selected="true" data-target="#import-add-btn">History</a></li>
                            </ul>
                        </div>
                        <div class="tab-content mt-2 pt-2 border-top">
                            <div class="tab-pane fade show active" id="import" role="tabpanel"
                                aria-labelledby="import-tab">
                                <div class="mt-2">
                                    <form class="static" method="POST">
                                        @csrf
                                        <input type="hidden" name="save_token" value="@skeletonToken('central_unique_import')_m">

                                        <div class="row g-3">
                                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                                <div class="float-input-control">
                                                    <select name="database" class="form-float-input" data-select="dropdown"
                                                        data-target="@skeletonToken('central_unique_database')_s">
                                                        <option value="" disabled selected>Select an option</option>
                                                        <option value="sun">Sun</option>
                                                        <option value="moon">Moon</option>
                                                        <option value="pluto">Pluto</option>
                                                        <option value="unique">Unique</option>
                                                        <option value="testingg">Testing</option>
                                                    </select>
                                                    <label class="form-float-label">Database </label>
                                                </div>
                                            </div>

                                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                                <div class="float-input-control">
                                                    <select name="table" class="form-float-input" data-select="dynamic"
                                                        data-source="@skeletonToken('central_unique_database')_s">
                                                    </select>
                                                    <label class="form-float-label">Table </label>
                                                </div>
                                            </div>
                                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                                <div class="float-input-control">
                                                    <select name="type" class="form-float-input" data-select="dropdown">
                                                        <option value="normal">normal</option>
                                                        <option value="bulk">Bulk</option>
                                                    </select>
                                                    <label class="form-float-label"> Type </label>
                                                </div>
                                            </div>
                                            @php
                                                use Illuminate\Support\Facades\Storage;
                                                $csvFiles = collect(Storage::disk('local')->files('imports'))->filter(
                                                    fn($file) => str_ends_with($file, '.csv'),
                                                );
                                            @endphp

                                            <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
                                                <div class="float-input-control">
                                                    <select class="form-float-input" name="file" data-select="dropdown">
                                                        <option value="" disabled selected>Select an option</option>
                                                        @foreach ($csvFiles as $file)
                                                            <option value="{{ $file }}">{{ basename($file) }}
                                                            </option>
                                                        @endforeach
                                                    </select>
                                                    <label class="form-float-label">Choose File </label>
                                                </div>
                                            </div>
                                            <div class="text-end mt-2">
                                                <button type="button" data-role="reset"
                                                    class="btn btn-warning skeleton-form-btn d-none ms-2">Reset</button>
                                                <button type="submit" data-role="match"
                                                    class="btn btn-primary skeleton-form-btn">Match Headers</button>
                                                <button type="submit" data-role="import"
                                                    class="btn btn-primary skeleton-form-btn d-none">Import</button>
                                            </div>
                                        </div>
                                    </form>
                                    <div data-role="mapping-container" class="col-12 mt-3 text-center p-0"></div>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="history" role="tabpanel" aria-labelledby="history-tab">
                                <div data-skeleton-table-set="@skeletonToken('central_unique_import_logs')_t"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
