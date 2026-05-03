<div class="row g-2">
    <input type="hidden" name="save_token" value="{{ $token ?? '' }}">
    <!-- Shift ID Dropdown -->
    <div class="col-sm-6 col-md-6 col-lg-12 col-xl-12">
        <div class="float-input-control">
            <select class="form-float-input" name="shift_id" id="shift_id" data-select="dropdown" required>
                <option value="" disabled selected>Select Shift ID</option>
                <option value="shift_1">Shift 1</option>
                <option value="shift_2">Shift 2</option>
                <option value="shift_3">Shift 3</option>
                <!-- Add more shift options as needed -->
            </select>
            <label for="shift_id" class="form-float-label">Shift ID <span class="text-danger">*</span></label>
        </div>
    </div>

    <!-- Shift Type Dropdown -->
    <div class="col-sm-6 col-md-6 col-lg-12 col-xl-12">
        <div class="float-input-control">
            <select class="form-float-input" name="type" id="type" data-select="dropdown"
                onchange="handleTypeChange(this.value)" required>
                <option value="" disabled selected>Select Shift type</option>
                <option value="day">Day Wise</option>
                <option value="month">Month Wise</option>
            </select>
            <label for="type" class="form-float-label">Shift Type <span class="text-danger">*</span></label>
        </div>
    </div>

    <!-- Day Selection -->
    <div id="rules-day-week" class="row mb-3 d-none">
        <label class="form-label ps-3 mt-3">Select Days</label>
        @foreach (['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as $day)
        <div class="col-md-2 form-check ms-3">
            <input class="form-check-input" type="checkbox" name="rules[]" value="{{ $day }}" id="day-{{ $day }}">
            <label class="form-check-label ms-2" for="day-{{ $day }}">{{ $day }}</label>
        </div>
        @endforeach
    </div>

    <!-- Month Selection -->
    <div id="rules-month" class="row mb-3 d-none">
        <label class="form-label ps-3 mt-3">Select Months</label>
        @foreach (['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as $month)
        <div class="col-md-2 form-check ms-3">
            <input class="form-check-input" type="checkbox" name="rules[]" value="{{ $month }}" id="month-{{ $month }}">
            <label class="form-check-label ms-2" for="month-{{ $month }}">{{ $month }}</label>
        </div>
        @endforeach
    </div>

    <!-- Duration Section -->
    <div id="duration-section" class="row mb-3 g-2 d-none">
        <!-- Duration -->
        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
            <div class="float-input-control">
                <input type="number" class="form-float-input" id="duration" name="duration" placeholder="none">
                <label for="duration" class="form-float-label">Duration (Days)</label>
            </div>
        </div>

        <!-- From Date -->
        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
            <div class="float-input-control">
                <input type="date" class="form-float-input" id="from_date" name="from_date" placeholder="none">
                <label for="from_date" class="form-float-label">From Date</label>
            </div>
        </div>

        <!-- To Date -->
        <div class="col-sm-4 col-md-4 col-lg-4 col-xl-4">
            <div class="float-input-control">
                <input type="date" class="form-float-input" id="to_date" name="to_date" placeholder="none">
                <label for="to_date" class="form-float-label">To Date</label>
            </div>
        </div>

        <!-- Start Time -->
        <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
            <div class="float-input-control">
                <input type="time" class="form-float-input" id="start_time" name="start_time" placeholder="none">
                <label for="start_time" class="form-float-label">Start Time</label>
            </div>
        </div>

        <!-- End Time -->
        <div class="col-sm-6 col-md-6 col-lg-6 col-xl-6">
            <div class="float-input-control">
                <input type="time" class="form-float-input" id="end_time" name="end_time" placeholder="none">
                <label for="end_time" class="form-float-label">End Time</label>
            </div>
        </div>
    </div>
</div>
