<input type="hidden" name="save_token" value="{{ $token }}">
<input type="hidden" name="permission_ids" id="permission_ids" value="[]">
<input type="hidden" name="role_id" value="{{ $role_id }}">

@php
$array = ['create', 'view', 'edit', 'delete', 'import', 'export'];
@endphp

<div class="container-fluid p-0">
    <div class="table-responsive">
        <table class="table table-hover align-middle">
            <thead class="table-primary bg-light">
                <tr>
                    <th class="col-4">Name</th>
                    <th class="col-1 text-center">View</th>
                    <th class="col-1 text-center">Create</th>
                    <th class="col-1 text-center">Edit</th>
                    <th class="col-1 text-center">Delete</th>
                    <th class="col-1 text-center">Import</th>
                    <th class="col-1 text-center">Export</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($modules as $module)
                    <tr class="module-row">
                        <td class="col-4 fw-bold">
                            <i class="fas fa-cube fa-lg me-2 text-info"></i>{{ $module->name }}
                        </td>
                        @foreach ($array as $perm)
                            @php
                                $key = trim("{$perm}:{$module->name}");
                                $permId = $permissions[$key] ?? null;
                            @endphp
                            <td class="col-1 text-center">
                                @if ($permId)
                                    <div class="form-check form-check-sm">
                                        <input class="form-check-input permission-checkbox mx-auto"
                                               type="checkbox"
                                               value="{{ $permId }}"
                                               data-scope="module"
                                               data-permission="{{ $perm }}"
                                               data-name="{{ $key }}"
                                               {{ in_array($permId, $rolePermissionIds) ? 'checked' : '' }}>
                                    </div>
                                @endif
                            </td>
                        @endforeach
                    </tr>

                    @foreach ($module->sections as $section)
                        <tr class="section-row">
                            <td class="col-4 ps-4">
                                <i class="fas fa-folder-open me-2 text-warning"></i>{{ $section->name }}
                            </td>
                            @foreach ($array as $perm)
                                @php
                                    $key = trim("{$perm}:{$module->name}::{$section->name}");
                                    $permId = $permissions[$key] ?? null;
                                @endphp
                                <td class="col-1 text-center">
                                    @if ($permId)
                                        <div class="form-check form-check-sm">
                                            <input class="form-check-input permission-checkbox mx-auto"
                                                   type="checkbox"
                                                   value="{{ $permId }}"
                                                   data-scope="section"
                                                   data-permission="{{ $perm }}"
                                                   data-name="{{ $key }}"
                                                   {{ in_array($permId, $rolePermissionIds) ? 'checked' : '' }}>
                                        </div>
                                    @endif
                                </td>
                            @endforeach
                        </tr>

                        @foreach ($section->items as $item)
                            <tr class="item-row">
                                <td class="col-4 ps-5">
                                    <i class="fas fa-file-alt text-success me-2"></i>{{ $item->name }}
                                </td>
                                @foreach ($array as $perm)
                                    @php
                                        $key = trim("{$perm}:{$module->name}::{$section->name}::{$item->name}");
                                        $permId = $permissions[$key] ?? null;
                                    @endphp
                                    <td class="col-1 text-center">
                                        @if ($permId)
                                            <div class="form-check form-check-sm">
                                                <input class="form-check-input permission-checkbox mx-auto"
                                                       type="checkbox"
                                                       value="{{ $permId }}"
                                                       data-scope="item"
                                                       data-permission="{{ $perm }}"
                                                       data-name="{{ $key }}"
                                                       {{ in_array($permId, $rolePermissionIds) ? 'checked' : '' }}>
                                            </div>
                                        @endif
                                    </td>
                                @endforeach
                            </tr>
                        @endforeach
                    @endforeach
                @endforeach
            </tbody>
        </table>
    </div>
</div>