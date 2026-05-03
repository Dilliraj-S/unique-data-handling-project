<div class="row g-3">
    <input type="hidden" name="save_token" value="{{ $token }}">
    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
        <div class="float-input-control">
            <input type="number" class="form-float-input" name="sno" id="sno" placeholder="SNO" value=""
                required>
            <label for="sno" class="form-float-label">SNO<span class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
        <div class="float-input-control">
            <input type="text" class="form-float-input" name="shift_id" id="shift_id" placeholder="Shift ID"
                value="" data-validate="shift-code" required>
            <label for="shift_id" class="form-float-label">Shift ID<span class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
        <div class="float-input-control">
            <input type="text" class="form-float-input" name="shift_name" id="shift_name" placeholder="Shift Name"
                value="" required>
            <label for="shift_name" class="form-float-label">Shift Name<span class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
        <div class="float-input-control">
            <select class="form-float-input" name="shift_type" id="shift_type" data-select="dropdown" required>
                <option value="" disabled selected>Select Shift Type</option>
                <option value="day">Day</option>
                <option value="night">Night</option>
            </select>
            <label for="shift_type" class="form-float-label">Shift Type<span class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-4 col-lg-4 col-xl-4">
        <div class="float-input-control">
            <input type="time" class="form-float-input" name="start_time" id="start_time" placeholder="Start Time"
                value="" required>
            <label for="start_time" class="form-float-label">Start Time<span class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-4 col-lg-4 col-xl-4">
        <div class="float-input-control">
            <input type="time" class="form-float-input" name="end_time" id="end_time" placeholder="End Time"
                value="" required>
            <label for="end_time" class="form-float-label">End Time<span class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-4 col-lg-4 col-xl-4">
        <div class="float-input-control">
            <input type="time" class="form-float-input" name="grace_period" id="grace_period"
                placeholder="Grace Period" value="" required>
            <label for="grace_period" class="form-float-label">Grace Period<span class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
        <div class="float-input-control">
            <select class="form-float-input" name="break_allowed" id="break_allowed" data-select="dropdown"
                onchange="toggleBreakFields(this.value)" required>
                <option value="" disabled selected>Select Break Allowed</option>
                <option value="0">No</option>
                <option value="1">Yes</option>
            </select>
            <label for="break_allowed" class="form-float-label">Break Allowed<span class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
        <div class="float-input-control">
            <input type="text" class="form-float-input" name="working_hours" id="working_hours"
                placeholder="Work Hours" value="" required>
            <label for="working_hours" class="form-float-label">Work Hours<span class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-12 col-xl-12">
        <div class="float-input-control">
            <select class="form-float-input" name="is_holiday_shift" id="is_holiday_shift" data-select="dropdown"
                required>
                <option value="" disabled selected>Select Holiday Shift</option>
                <option value="0">No</option>
                <option value="1">Yes</option>
            </select>
            <label for="is_holiday_shift" class="form-float-label">Is Holiday Shift<span
                    class="text-danger">*</span></label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-4 col-xl-4 break-field" style="display: none;">
        <div class="float-input-control">
            <input type="time" class="form-float-input" name="break_start_time" id="break_start_time"
                placeholder="Break Start Time" value="">
            <label for="break_start_time" class="form-float-label">Break Start Time</label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-4 col-xl-4 break-field" style="display: none;">
        <div class="float-input-control">
            <input type="time" class="form-float-input" name="break_end_time" id="break_end_time"
                placeholder="Break End Time" value="">
            <label for="break_end_time" class="form-float-label">Break End Time</label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-4 col-xl-4 break-field" style="display: none;">
        <div class="float-input-control">
            <input type="time" class="form-float-input" name="break_grace_period" id="break_grace_period"
                placeholder="Break Grace Period" value="">
            <label for="break_grace_period" class="form-float-label">Break Grace Period</label>
        </div>
    </div>
    <div class="col-sm-6 col-md-6 col-lg-12 col-xl-12">
        <div class="float-input-control">
            <select class="form-float-input" name="is_active" id="is_active" data-select="dropdown"
                required>
                <option value="" disabled selected>Select Status</option>
                <option value="0">No</option>
                <option value="1">Yes</option>
            </select>
            <label for="is_active" class="form-float-label">IS Active<span
                    class="text-danger">*</span></label>
        </div>
    </div>
</div>
<script>
    function toggleBreakFields(value) {
        alert("hello");
        const breakFields = document.querySelectorAll('.break-field');
        breakFields.forEach(field => {
            field.style.display = value === '1' ? 'block' : 'none';
        });
        if (value !== '1') {
            document.getElementById('break_start_time').value = '';
            document.getElementById('break_end_time').value = '';
            document.getElementById('break_grace_period').value = '';
        }
    }
    document.addEventListener('DOMContentLoaded', function() {
        const breakAllowed = document.getElementById('break_allowed');
        if (breakAllowed) {
            toggleBreakFields(breakAllowed.value);
        }
    });
</script>
