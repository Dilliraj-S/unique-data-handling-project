@extends('layouts.system-app')
@section('title', 'Skeleton Permissions')
@section('top-style')
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
                            <a href="javascript:void(0);">Developer</a>
                        </li>
                        <li class="breadcrumb-item">
                            <a href="javascript:void(0);">Skeleton</a> 
                        </li>
                        <li class="breadcrumb-item active fw-bold">Permissions</li>
                    </ol>
                </nav>
            </div>
        </div>
    <div class="col-xl-12">
        <div class="card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <ul class="nav nav-pills data-skl-action" id="skeleton-permissions" role="tablist">
                        @php
                            $tabs = [
                                'permissions' => ['Permissions', 'd-none'],
                                'custom_permissions' => ['Custom Permissions', 'd-block'],
                                'role_permissions' => ['Roles', 'd-none'],
                                'user_permissions' => ['Users', 'd-none'],
                            ];
                        @endphp
                        @foreach($tabs as $id => $label)
                            <li class="nav-item"><a class="nav-link" id="{{ $id }}-tab" data-skl-action="b" data-bs-toggle="tab" href="#{{ $id }}" role="tab" aria-controls="{{ $id }}" aria-selected="false" data-type="add" data-token="@skeletonToken('central_skeleton_' . $id)_a" data-text="Add {{ $label[0] }}" data-target="#permissions-add-btn" data-class="{{ $label[1] }}">{{ $label[0] }}</a></li>
                        @endforeach
                    </ul>

                    <div class="action-area">
                        <button class="btn btn-primary skeleton-popup" id="permissions-add-btn">Default</button>
                    </div>
                </div>
                <div class="tab-content mt-2 pt-2 border-top">
                    @foreach($tabs as $id => $label)
                        <div class="tab-pane fade" id="{{ $id }}" role="tabpanel" aria-labelledby="{{ $id }}-tab">
                            <div data-skeleton-table-set="@skeletonToken('central_skeleton_' . $id)_t"></div>
                        </div>
                    @endforeach
                </div>
            </div>
        </div>
    </div>
</div>
@endsection