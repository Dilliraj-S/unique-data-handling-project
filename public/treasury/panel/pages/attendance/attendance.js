/*----------------------------------------------------------------------------------------
Attendance Table
----------------------------------------------------------------------------------------*/
const url_prefix = window.location.origin + '/panel/' + $('meta[name="logged-user"]').attr('role');
const table = $('#attendance-table');
// Function to load attendance data
function loadAttendanceData(filters) {
    $('.attendance-table').addClass('d-none');
    $('.attendance-loading').removeClass('d-none');
    const adt_url = url_prefix + '/adt-table/load-attendance';
    $.ajax({
        url: adt_url,
        type: 'POST',
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        data: filters,
        success: function (response) {
            $('.attendance-table').removeClass('d-none');
            $('.attendance-loading').addClass('d-none');
            if (response.headers && response.data) {
                // Clear and Rebuild Table Headers
                $('#table-headers').empty();
                response.headers.forEach(header => {
                    $('#table-headers').append(`<th>${header}</th>`);
                });
                // Destroy and Reinitialize DataTable
                if ($.fn.DataTable.isDataTable(table)) {
                    table.DataTable().destroy();
                }
                table.DataTable({
                    data: response.data,
                    columns: response.headers.map(header => ({
                        data: header
                    })),
                    autoWidth: true,
                    lengthMenu: [10, 25, 50, 100, 250],
                    pageLength: 10,
                    scrollX: true,
                    scrollCollapse: true,
                    ordering: true,
                    searching: true,
                    paging: true,
                    processing: true,
                    stateSave: true,
                    fixedColumns: {
                        leftColumns: 1
                    },
                    order: [
                        [1, 'desc']
                    ],
                    columnDefs: [{
                        orderable: false,
                        targets: [-1]
                    },
                    {
                        width: '10%',
                        targets: '_all'
                    },
                    {
                        width: 'auto',
                        targets: [0, -1]
                    },
                    {
                        className: 'dt-left',
                        targets: '_all'
                    }
                    ],
                    language: {
                        lengthMenu: "Size _MENU_",
                        zeroRecords: "No records found",
                        info: "Page _PAGE_ of _PAGES_",
                        infoEmpty: "No records available",
                        infoFiltered: "Filtered from _MAX_ total records",
                        search: "",
                        searchPlaceholder: "Search..."
                    },
                    dom: '<"top"<"adt-top-first-row"<"adt-top-first-info"i><"adt-top-first-btns">f>>>rt<"bottom"<"adt-btm-first-row"i<"adt-btm-first-paging"lp>>>',
                });
                tooltip();
            }
        },
        error: function (xhr) {
            warningToast(
                'Warning.',
                xhr.responseText,
                3000
            );
            console.error(xhr.responseText);
        }
    });
}
// Function to set filters from localStorage
function setFiltersFromLocalStorage() {
    const filters = JSON.parse(localStorage.getItem('attendanceFilters')) || {
        from_date: '',
        to_date: '',
        department: '',
        employee: ''
    };
    $('#from_date').val(filters.from_date);
    $('#to_date').val(filters.to_date);
    $('#department').val(filters.department);
    $('#employee').val(filters.employee);
}
// Function to save filters to localStorage
function saveFiltersToLocalStorage() {
    const filters = {
        from_date: $('#from_date').val(),
        to_date: $('#to_date').val(),
        department: $('#department').val(),
        employee: $('#employee').val(),
    };
    localStorage.setItem('attendanceFilters', JSON.stringify(filters));
}
// Initialize Data Load with filters from localStorage
function initializeData() {
    setFiltersFromLocalStorage(); // Set filters from localStorage
    const filters = JSON.parse(localStorage.getItem('attendanceFilters')) || {};
    loadAttendanceData(filters); // Load the attendance data based on filters
}
// Filter Button Click - Reload the page with new filters
$('#filter-btn').on('click', function () {
    saveFiltersToLocalStorage(); // Save the new filters to localStorage
    location.reload(); // Reload the page
});
// Initialize the page with the correct data
initializeData();
// Event listeners to update filters on input change
$('#from_date, #to_date, #department, #employee').on('change', function () {
    saveFiltersToLocalStorage(); // Save filter when the user makes a change
});
function tooltip1() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}
$(document).ready(function () {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    $(document).on("click", ".atd-shift-model", function () {
        const jsonData = $(this).data("json");
        if (!jsonData) {
            return;
        }
        const parsedData = JSON.parse(JSON.stringify(jsonData));
        const modalContent = $("#shiftDetailsContent");
        modalContent.empty();
        let hasOthers = false;
        for (const shiftId in parsedData) {
            const shift = parsedData[shiftId];
            if (shift.others && shift.others.length > 0) {
                hasOthers = true;
                break;
            }
        }
        modalContent.append(`
                    <ul class="nav nav-tabs" id="shiftDetailsTab" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="normal-tab" data-bs-toggle="tab" data-bs-target="#normal-content" type="button" role="tab" aria-controls="normal-content" aria-selected="true">Normal</button>
                        </li>
                        ${hasOthers ? `
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="others-tab" data-bs-toggle="tab" data-bs-target="#others-content" type="button" role="tab" aria-controls="others-content" aria-selected="false">Others</button>
                                    </li>
                                    ` : ''}
                    </ul>
                    <div class="tab-content" id="shiftDetailsTabContent">
                        <div class="tab-pane fade show active" id="normal-content" role="tabpanel" aria-labelledby="normal-tab">
                            <div id="normalTabContent"></div>
                        </div>
                        ${hasOthers ? `
                                        <div class="tab-pane fade" id="others-content" role="tabpanel" aria-labelledby="others-tab">
                                            <div id="othersTabContent"></div>
                                        </div>
                                    ` : ''}
                    </div>
                `);
        const normalTabContent = $("#normalTabContent");
        const othersTabContent = $("#othersTabContent");
        for (const shiftId in parsedData) {
            const shift = parsedData[shiftId];
            const shiftName = shift.name || "Unknown Shift";
            normalTabContent.append(`
                    <div class="card shadow-none">
                        <div class="card-body rounded-2" style="background-color:#F8F9FA">
                            <div class="row align-items-center justify-content-start">
                                <div class="col-lg-12">
                                    <div class="row">
                                        <div class="col-sm-4">
                                            <div class="d-flex gap-1 align-items-start">
                                                <div>
                                                    <span class="badge bg-dark rounded-circle p-2">
                                                        <i class="fas fa-calendar-alt text-white"></i>
                                                    </span>
                                                </div>
                                                <div>
                                                    <span>Date</span>
                                                    <h6 class="fw-medium">${shift.checkin?.[0]?.rec?.time.split(" ")[0] || "N/A"}</h6>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-sm-4">
                                            <div class="d-flex gap-1 align-items-start">
                                                <div>
                                                <span class="badge bg-success rounded-circle p-2">
                                                        <i class="fas fa-sign-in-alt text-white"></i>
                                                    </span>
                                                </div>
                                                <div>
                                                    <span>Punch-In</span>
                                                    <h6>${shift.checkin?.[0]?.rec?.time.split(" ")[1] || "N/A"}</h6>
                                                </div>
                                            </div>
                                            ${shift.checkin?.[0]?.lin ? `<span class="badge bg-success">Late-In: ${shift.checkin[0].lin}</span>` : '<span class="badge bg-success">Late In: N/A</span>'}  
                                        </div>
                                        <div class="col-sm-4">
                                            <div class="d-flex gap-1 align-items-start">
                                                <div>
                                                    <span class="badge bg-info rounded-circle p-2">
                                                        <i class="fas fa-sign-out-alt text-white"></i>
                                                    </span>
                                                </div>
                                                <div>
                                                    <span>Punch-Out</span>
                                                    <h6>${shift.checkout?.[0]?.rec?.time.split(" ")[1] || "N/A"}</h6>
                                                </div>
                                            </div>
                                            ${shift.checkout?.[0]?.eout ? `<span class="badge bg-info">Early Out: ${shift.checkout[0].eout}</span>` : '<span class="badge bg-info">Early Out: N/A</span>'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>  
                        <div class="card shadow-none border-1 mt-3">
                            <div class="card-body">
                                <div class="col-lg-12">
                                    <div class="row">
                                        <div class="col-sm-4">
                                            <div class="d-flex gap-2 align-items-start">
                                                <div>
                                                    <span class="badge bg-light rounded-circle p-1"></span>
                                                </div>
                                                <div>
                                                    <span>Shift-<span class="badge bg-light text-white">${shiftId}</span></span>
                                                    <h6 class="fw-medium">${shift.name || "N/A"}</h6>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-sm-4">
                                            <div class="d-flex gap-2 align-items-start">
                                                <div>
                                                    <span class="badge bg-warning rounded-circle p-1">
                                                    </span>
                                                </div>
                                                <div>
                                                    <span>Total Working Hours</span>
                                                    <h6 class="fw-medium">${shift.hour || "N/A"}</h6>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-sm-4">
                                            <div class="d-flex gap-2 align-items-start">
                                                <div>
                                                    <span class="badge bg-success rounded-circle p-1">
                                                    </span>
                                                </div>
                                                <div>
                                                    <span>Productive Hours</span>
                                                    <h6 class="fw-medium">${shift.work?.wb || "N/A"}</h6>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>  
                            </div>
                        </div>
                        </div>
                `);
            if (hasOthers && shift.others && shift.others.length > 0) {
                const others = shift.others;
                othersTabContent.append(`
        <div class="card shadow-none bg-transparent-light">
            <div class="card-body p-2 rounded-2" style="background-color:#F8F9FA">
                <div class="row align-items-center justify-content-start">
                    <div class="col-sm-4">
                        <div class="d-flex gap-1 align-items-start">
                            <div>
                                <span class="badge bg-dark rounded-circle p-2">
                                    <i class="fas fa-calendar-alt text-white"></i>
                                </span>
                            </div>
                            <div>
                                <span>Date</span>
                                <h6 class="fw-medium">${others[0]?.time.split(" ")[0] || "N/A"}</h6>
                            </div>
                        </div>
                    </div>
                    ${others[0] ? `
                            <div class="col-sm-4">
                                <div class="d-flex gap-1 align-items-start">
                                    <div>
                                        <span class="badge ${others[0].chk === "0" ? 'bg-success' : 'bg-info'} rounded-circle p-2">
                                            <i class="fas ${others[0].chk === "0" ? 'fa-sign-in-alt' : 'fa-sign-out-alt'} text-white"></i>
                                        </span>
                                    </div>
                                    <div>
                                        <span>${others[0].chk === "0" ? "Punch-In" : "Punch-Out"}</span>
                                        <h6 class="fw-medium">${others[0].time.split(" ")[1] || "N/A"}</h6>
                                    </div>
                                </div>
                            </div>` : ''}
                    ${others[1] ? `
                            <div class="col-sm-4">
                                <div class="d-flex gap-1 align-items-start">
                                    <div>
                                        <span class="badge ${others[1].chk === "0" ? 'bg-success' : 'bg-info'} rounded-circle p-2">
                                            <i class="fas ${others[1].chk === "0" ? 'fa-sign-in-alt' : 'fa-sign-out-alt'} text-white"></i>
                                        </span>
                                    </div>
                                    <div>
                                        <span>${others[1].chk === "0" ? "Punch-In" : "Punch-Out"}</span>
                                        <h6 class="fw-medium">${others[1].time.split(" ")[1] || "N/A"}</h6>
                                    </div>
                                </div>
                            </div>` : ''}
                </div>
            </div>
        </div>
    `);
            }
        }
        const modal = new bootstrap.Modal($("#shiftDetailsModal"));
        modal.show();
    });
    function getProgressPercentage(hours) {
        const [hh, mm, ss] = hours.split(":").map(Number);
        const totalSeconds = hh * 3600 + mm * 60 + ss;
        const maxSeconds = 8 * 3600; // Assume 8-hour shift
        return Math.min((totalSeconds / maxSeconds) * 100, 100);
    }
    select();
});