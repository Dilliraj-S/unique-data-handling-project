<?php
namespace App\Http\Classes;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Carbon\CarbonPeriod;
use App\Models\Organization\{
    Shift,
    Department,
    Designation
};
use App\Models\Helper\Setting;
use InvalidArgumentException;
use RuntimeException;
use Exception;
use TCPDF;
use App\Http\Classes\{
    UserHelper,
    DeviceTableHelper
};
use App\Models\Device\Device;
use App\Models\Organization\Organization;
class AttendanceHelper
{
    /**
     * Fetch Attendance
     *
     * @param array $filters
     * @param string $type
     * @param array $viewSets
     * @param array $reportSets
     * @return \Illuminate\Http\JsonResponse|string
     */
    public static function viewOrGenerate($filters = [], $type = 'view', $viewSets = [], $reportSets = [])
    {
        try {
            $org_id = UserHelper::getCurrentUser('org_id');
            $startDate = $filters['start_date'] ?? date('Y-m-01');
            $endDate = $filters['end_date'] ?? date('Y-m-d');
            $gotitIds = ($filters['gotit_ids'] === 'all' || $filters['gotit_ids'] === null ? null : $filters['gotit_ids']) ?? null;
            $departmentIds = ($filters['dept_ids'] === 'all' || $filters['dept_ids'] === null ? null : $filters['dept_ids']) ?? null;
            $designationIds = ($filters['desg_ids'] === 'all' || $filters['desg_ids'] === null ? null : $filters['desg_ids']) ?? null;
            $groupBy = ($filters['group_by'] === 'all' || $filters['group_by'] === null ? null : $filters['group_by']) ?? null;
            $attendanceData = DB::select('CALL GetAttendance(:startDate, :endDate, :gotitIds, :departmentIds, :designationIds, :groupBy, :ordId, :usersTable, :bioUsersTable, :bioAttndTable)', [
                'startDate' => $startDate,
                'endDate' => $endDate,
                'gotitIds' => $gotitIds,
                'departmentIds' => $departmentIds,
                'designationIds' => $designationIds,
                'groupBy' => $groupBy,
                'ordId' => $org_id,
                'usersTable' => 'users',
                'bioUsersTable' => DeviceTableHelper::table('users'),
                'bioAttndTable' => DeviceTableHelper::table('attendance'),
            ]);
            if (empty($attendanceData) || !is_array($attendanceData)) {
                return response()->json([
                    'error' => $startDate
                ]);
            }
            $headers = ['Gotit-Id', 'Name', 'Department'];
            $dateRange = CarbonPeriod::create($startDate, $endDate);
            $departments = Department::whereNull('deleted_at')->where('org_id', $org_id)->pluck('department', 'dept_id')->toArray();
            $devices = Device::whereNull('deleted_at')->where('org_id', $org_id)->pluck('name', 'device_id')->toArray();
            $shifts = Shift::whereNull('deleted_at')->where('org_id', $org_id)->get()->keyBy('shift_id');
            $settings = Setting::whereNull('deleted_at')->where('org_id', $org_id)->pluck('setting', 'type')->toArray();
            // dd($settings);
            foreach ($dateRange as $date) {
                $headers[] = $date->format('Y-m-d');
            }
            $rows = collect($attendanceData)->map(function ($row) use ($dateRange, $type, $departments, $shifts) {
                $rowArray = (array)$row;
                $transformedRow = [
                    'Gotit-Id' => $rowArray['gotit_id'] ?? '',
                    'Name' => $rowArray['first_name'] . ' ' . $rowArray['last_name'] ?? '',
                    'Department' => $departments[$rowArray['dept_id']] ?? '',
                ];
                $shiftIds = explode(',', $rowArray['shift_ids'] ?? '');
                $shiftData = $shifts->filter(function ($shift) use ($shiftIds) {
                    return in_array($shift->shift_id, $shiftIds);
                });
                foreach ($dateRange as $dayKey) {
                    $key = $dayKey->format('Y-m-d');
                    if (!empty($rowArray[$key])) {
                        $dayData = json_decode($rowArray[$key], true);
                        $transformedRow[$key] = $type === 'view'
                            ? '<div class="d-flex flex-column justify-content-center w-100">' . self::shiftui(self::shiftJson($dayData, $shiftData, $key)) . '</div>'
                            : self::shiftJson($dayData, $shiftData, $key);
                    } else {
                        $transformedRow[$key] = '';
                    }
                }
                return $transformedRow;
            });
            if ($type === 'view') {
                return response()->json([
                    'headers' => $headers,
                    'data' => $rows->values(),
                ]);
            } elseif ($type === 'json') {
                return response()->json([
                    'headers' => $headers,
                    'data' => $rows->values(),
                ]);
            } elseif ($type === 'pdf') {
                return PdfHelper::generatePdf(self::groupAndTransposeRowsByDate($rows, $dateRange), $filters, $settings, 'D');
            } elseif ($type === 'pdf-s') {
                return PdfHelper::generatePdf(self::groupAndTransposeRowsByDate($rows, $dateRange), $filters, $settings, 'S');
            } else {
                return self::reportView(self::groupAndTransposeRowsByDate($rows, $dateRange), $filters, $settings);
            }
        } catch (ValidationException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => 'Invalid argument provided.'], 400);
        } catch (Exception $e) {
            return response()->json(['error' => 'An unexpected error occurred. Please try again later.' . $e->getMessage()], 500);
        }
    }
    private static function groupAndTransposeRowsByDate($rows, $dateRange)
    {
        $groupedTransposed = [];
        $statusOrder = ['Present [PF]', 'Present [OK]', 'Present [AB]', 'Present [CONF]', 'Abnormal [CONF]', 'Present [CINF]', 'Abnormal [CINF]', 'Abnormal', 'Absent', 'On Leave', ''];
        foreach ($dateRange as $date) {
            $formattedDate = $date->format('Y-m-d');
            $groupedDepartments = [];
            foreach ($rows as $row) {
                $department = $row['Department'];
                if (!isset($groupedDepartments[$department])) {
                    $groupedDepartments[$department] = [];
                }
                $shiftDetails = self::processCellData($row[$formattedDate] ?? '');
                $numShifts = count($shiftDetails);
                foreach ($shiftDetails as $index => $shiftDetail) {
                    $status = $shiftDetail['status'] ?? '';
                    $shiftDetail['status_order'] = in_array($status, $statusOrder) ? array_search($status, $statusOrder) : -1;
                    $dateRow = [
                        'Gotit-Id' => $index === 0 ? $row['Gotit-Id'] : '',
                        'Name' => $index === 0 ? $row['Name'] : '',
                        'Shift' => $shiftDetail['name'] ?? '',
                        'Early-In' => $shiftDetail['early_in'] ?? '',
                        'Check-In' => self::formatTime($shiftDetail['checkin'][0]['rec']['time'] ?? ''),
                        'Late-In' => $shiftDetail['late_in'] ?? '',
                        'Early-Out' => $shiftDetail['early_out'] ?? '',
                        'Check-Out' => self::formatTime($shiftDetail['checkout'][0]['rec']['time'] ?? ''),
                        'Late-Out' => $shiftDetail['late_out'] ?? '',
                        'Breaks' => $shiftDetail['breaks'] ?? '',
                        'Work' => $shiftDetail['work'] ?? '',
                        'Overtime' => $shiftDetail['overtime'] ?? '',
                        'Status' => $status,
                        'Others' => self::formatOthers(
                            $shiftDetail['others'] ?? '',
                            $shiftDetail['checkin'][0]['rec'] ?? '',
                            $shiftDetail['checkout'][0]['rec'] ?? ''
                        ),
                        'rowspan' => ($numShifts > 1) ? $numShifts : 0,
                    ];
                    $groupedDepartments[$department][] = $dateRow;
                }
            }
            foreach ($groupedDepartments as &$departmentRows) {
                $groupedByStatus = [];
                foreach ($departmentRows as $row) {
                    $status = $row['Status'];
                    if (!isset($groupedByStatus[$status])) {
                        $groupedByStatus[$status] = [];
                    }
                    $groupedByStatus[$status][] = $row;
                }
                uasort($groupedByStatus, function ($a, $b) use ($statusOrder) {
                    $statusA = $a[0]['Status'];
                    $statusB = $b[0]['Status'];
                    $orderA = array_search($statusA, $statusOrder);
                    $orderB = array_search($statusB, $statusOrder);
                    return ($orderA === false ? -1 : $orderA) <=> ($orderB === false ? -1 : $orderB);
                });
                $departmentRows = [];
                foreach ($groupedByStatus as $statusGroup) {
                    $departmentRows = array_merge($departmentRows, $statusGroup);
                }
            }
            $groupedTransposed[$formattedDate] = $groupedDepartments;
        }
        return $groupedTransposed;
    }
    private static function processCellData($cellData)
    {
        if (empty($cellData)) {
            return [['name' => '', 'early_in' => '', 'checkin' => '', 'late_in' => '', 'early_out' => '', 'checkout' => '', 'late_out' => '', 'breaks' => '', 'work' => '', 'overtime' => '', 'status' => '', 'others' => '']];
        }
        $raw = json_decode($cellData, true);
        $processed = [];
        foreach ($raw as $data) {
            $processed[] = [
                'name' => $data['name'] ?? '',
                'early_in' => $data['checkin'][0]['ein'] ?? '',
                'checkin' => $data['checkin'] ?? '',
                'late_in' => $data['checkin'][0]['lin'] ?? '',
                'early_out' => $data['checkout'][0]['eout'] ?? '',
                'checkout' => $data['checkout'] ?? '',
                'late_out' => $data['checkout'][0]['lout'] ?? '',
                'breaks' => $data['break']['time'] ?? '',
                'work' => $data['work']['wb'] ?? '',
                'overtime' => $data['overtime']['wb'] ?? '',
                'status' => $data['status'] ?? '',
                'others' => json_encode($data['others'] ?? []),
            ];
        }
        return $processed;
    }
    private static function formatCheckData($checkData, $setting, $type)
    {
        try {
            // Return empty string if $checkData is empty
            if (empty($checkData)) {
                return '';
            }
            // Extract and process data with null coalescing operator
            $chk = $checkData['chk'] ?? '';
            $meth = $checkData['meth'] ?? '';
            $time = isset($checkData['time']) ? date($setting['date'] ? 'Y-m-d H:i:s' : 'H:i:s', strtotime($checkData['time'])) : '';
            $device = SelectHelper::getValue('DEV', $checkData['device_id'] ?? '') ?? '';
            // Determine check type and method
            $checkType = match ($chk) {
                '0' => 'IN',
                '1' => 'OUT',
                default => 'Unknown'
            };
            $method = match ($meth) {
                '0' => 'PN',
                '1' => 'FG',
                default => 'Unknown'
            };
            // Build output string based on $type and $setting
            $color = ($type === 'P') ? '#336f04' : '#950000';
            $output = '<span style="color:' . $color . '">';
            $output .= '<span style="font-weight:bold">' . $checkType . '</span> (' . $method . '';
            if ($setting['device'] !== 0) {
                $output .= ", $device) - ";
            } else {
                $output .= ") - ";
            }
            $output .= $time;
            $output .= '</span>';
            return $output;
        } catch (Exception $e) {
            return '';
        }
    }
    private static function formatOthers($othersData, $checkIn = '', $checkOut = '')
    {
        if (empty($othersData)) {
            return '';
        }
        $settings = Setting::where('type', 'attendance_pdf_other_data')
            ->where('status', 'active')
            ->value('setting');
        $setting = $settings ? json_decode($settings, true) : [
            'data' => 1,
            'date' => 0,
            'device' => 0
        ];
        $formatted = [];
        try {
            $entries = json_decode($othersData, true);
            if (is_array($entries)) {
                if ($setting['data'] === '1') {
                    if ($checkIn) {
                        $formatted[] = self::formatCheckData($checkIn, $setting, 'P');
                    }
                    if ($checkOut) {
                        $formatted[] = self::formatCheckData($checkOut, $setting, 'P');
                    }
                }
                foreach ($entries as $entry) {
                    $formatted[] = self::formatCheckData($entry, $setting, 'I');
                }
            }
        } catch (Exception $e) {
            return '';
        }
        return implode(', ', $formatted);
    }
    private static function reportView($transposedRows, $filters, $settings)
    {
        $repoTable = '';
        $isSingleGotitId = $filters['gotit_ids'] !== 'all' && $filters['gotit_ids'] !== null && count(explode(',', $filters['gotit_ids'])) == 1;
        if ($isSingleGotitId) {
            $repoTable .= '<caption style="font-weight: bold; text-align: left; padding: 10px;">';
            // $repoTable .= 'Date: ' . htmlspecialchars($date) . ' | Department: ' . htmlspecialchars($department);
            $repoTable .= '</caption>';
            $repoTable .= '<table border="1" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size:10px">';
            $repoTable .= '<thead><tr>';
            $repoTable .= '<th>SLN</th><th>Gotit-Id</th><th>Name</th><th>Shift</th><th>Check-In</th><th>Late-In</th><th>Check-Out</th><th>Early-Out</th><th>Breaks</th><th>Work</th><th>Overtime</th><th>Status</th><th>Others</th>';
            $repoTable .= '</tr></thead>';
            $repoTable .= '<tbody>';
            $i = 1;
            foreach ($transposedRows as $date => $departments) {
                foreach ($departments as $department => $dateRows) {
                    foreach ($dateRows as $row) {
                        $repoTable .= '<tr>';
                        $rowspan = $row['rowspan'] > 0 ? ' rowspan="' . $row['rowspan'] . '"' : '';
                        if ($row['Gotit-Id']) {
                            $repoTable .= '<td' . $rowspan . '>' . $i . '</td>';
                            $repoTable .= '<td' . $rowspan . '>' . htmlspecialchars($row['Gotit-Id']) . '</td>';
                        }
                        if ($row['Name']) {
                            $repoTable .= '<td' . $rowspan . '>' . htmlspecialchars($row['Name']) . '</td>';
                        }
                        foreach (['Shift', 'Check-In', 'Late-In', 'Check-Out', 'Early-Out', 'Breaks', 'Work', 'Overtime', 'Status', 'Others'] as $column) {
                            $repoTable .= '<td>' . $row[$column] . '</td>';
                        }
                        $repoTable .= '</tr>';
                    }
                }
                $i++;
            }
            $repoTable .= '</tbody></table>';
        } else {
            foreach ($transposedRows as $date => $departments) {
                foreach ($departments as $department => $dateRows) {
                    $repoTable .= '<caption style="font-weight: bold; text-align: left; padding: 10px;">';
                    $repoTable .= 'Date: ' . htmlspecialchars($date) . ' | Department: ' . htmlspecialchars($department);
                    $repoTable .= '</caption>';
                    $repoTable .= '<table border="1" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size:10px">';
                    $repoTable .= '<thead><tr>';
                    $repoTable .= '<th>SLN</th><th>Gotit-Id</th><th>Name</th><th>Shift</th><th>Check-In</th><th>Late-In</th><th>Check-Out</th><th>Early-Out</th><th>Breaks</th><th>Work</th><th>Overtime</th><th>Status</th><th>Others</th>';
                    $repoTable .= '</tr></thead>';
                    $repoTable .= '<tbody>';
                    $i = 1;
                    foreach ($dateRows as $row) {
                        $repoTable .= '<tr>';
                        $rowspan = $row['rowspan'] > 0 ? ' rowspan="' . $row['rowspan'] . '"' : '';
                        if ($row['Gotit-Id']) {
                            $repoTable .= '<td' . $rowspan . '>' . $i . '</td>';
                            $repoTable .= '<td' . $rowspan . '>' . htmlspecialchars($row['Gotit-Id']) . '</td>';
                            $i++;
                        }
                        if ($row['Name']) {
                            $repoTable .= '<td' . $rowspan . '>' . htmlspecialchars($row['Name']) . '</td>';
                        }
                        foreach (['Shift', 'Check-In', 'Late-In', 'Check-Out', 'Early-Out', 'Breaks', 'Work', 'Overtime', 'Status', 'Others'] as $column) {
                            $repoTable .= '<td>' . $row[$column] . '</td>';
                        }
                        $repoTable .= '</tr>';
                    }
                    $repoTable .= '</tbody></table>';
                }
            }
        }
        return $repoTable;
    }
    /* ----------------------------------------------------------------------------------------------
    Shifts and Return Json
    ---------------------------------------------------------------------------------------------- */
    private static function shiftJson($cellArray, $shiftData, $date)
    {
        if (empty($cellArray) || !is_array($cellArray)) {
            throw new InvalidArgumentException("Invalid or empty cellArray provided.");
        }
        if (!strtotime($date)) {
            throw new InvalidArgumentException("Invalid date format. Expected YYYY-MM-DD.");
        }
        if ($shiftData->isEmpty()) {
            throw new RuntimeException("No shift data found for the provided IDs.");
        }
        $groupedData = [];
        foreach ($cellArray as $record) {
            if (!isset($record['time'])) {
                throw new InvalidArgumentException("Invalid record format: 'time' field missing.");
            }
            $recordDate = date('Y-m-d', strtotime($record['time']));
            $groupedData[$recordDate][] = $record;
        }
        $result = [];
        foreach ($shiftData as $shift) {
            $shiftId = $shift->shift_id;
            // Get shift start and end times
            $minStartTime = strtotime("$date " . $shift->min_start_time);
            $startTime = strtotime("$date " . $shift->start_time);
            $maxStartTime = strtotime("$date " . $shift->max_start_time);
            $minEndTime = strtotime("$date " . $shift->min_end_time);
            $endTime = strtotime("$date " . $shift->end_time);
            $maxEndTime = strtotime("$date " . $shift->max_end_time);
            // Check if it's a cross-day shift
            $isCrossDay = $startTime > $endTime;
            if ($isCrossDay) {
                $minEndTime = strtotime("$date " . $shift->min_end_time . " +1 day");
                $endTime = strtotime("$date " . $shift->end_time . " +1 day");
                $maxEndTime = strtotime("$date " . $shift->max_end_time . " +1 day");
            }
            // Merge records from today and next day if cross-day
            $shiftRecords = $groupedData[$date] ?? [];
            if ($isCrossDay) {
                $shiftRecords = array_merge($shiftRecords, $groupedData[date('Y-m-d', strtotime($date . ' +1 day'))] ?? []);
            }
            $status = '';
            $checkin = null;
            $checkout = null;
            usort($shiftRecords, function ($a, $b) {
                return strtotime($a['time']) <=> strtotime($b['time']);
            });
            // Identify checkin and checkout
            foreach ($shiftRecords as $record) {
                $recordTime = strtotime($record['time']);
                if ($recordTime >= $minStartTime && $recordTime <= $maxStartTime && $checkin === null) {
                    $checkin = $record;
                    continue;
                }
                if ($recordTime >= $minEndTime && $recordTime <= $maxEndTime && $checkout === null) {
                    $checkout = $record;
                    continue;
                }
            }
            $breaks = [];
            $others = [];
            // Process records after identifying checkin and checkout
            foreach ($shiftRecords as $record) {
                $recordTime = strtotime($record['time']);
                // Skip if it's the checkin or checkout record
                if ($checkin && $record['time'] === $checkin['time']) {
                    continue;
                }
                if ($checkout && $record['time'] === $checkout['time']) {
                    continue;
                }
                // If it's a non-cross-day shift, exclude next day's records from others
                if (!$isCrossDay && date('Y-m-d', strtotime($record['time'])) !== $date) {
                    continue;
                }
                // Breaks fall between checkin and checkout
                if ($checkin && $checkout && $recordTime > strtotime($checkin['time']) && $recordTime < strtotime($checkout['time'])) {
                    $breaks[] = $record;
                    continue;
                }
                // Else, record goes into 'others'
                $others[] = $record;
            }
            // Pair breaks and calculate total break time
            $pairedBreaks = [];
            $breakTimeInSeconds = 0;
            // If there's an unpaired break, we'll add it to 'others'
            for ($i = 0; $i < count($breaks); $i++) {
                if ($i + 1 < count($breaks)) {
                    $start = strtotime($breaks[$i]['time']);
                    $end = strtotime($breaks[$i + 1]['time']);
                    if ($start < $end) {
                        $pairedBreaks[] = [
                            'start' => $breaks[$i],
                            'end' => $breaks[$i + 1],
                            'duration' => gmdate("H:i:s", $end - $start)
                        ];
                        $breakTimeInSeconds += $end - $start;
                        $i++;
                    }
                } else {
                    // If there's no pair, add it to 'others'
                    $others[] = $breaks[$i];
                }
            }
            // Calculate work times
            $workedWithBreaks = "";
            $workedWithoutBreaks = "";
            $overtimeWithBreaks = "";
            $overtimeWithoutBreaks = "";
            if ($checkin && $checkout) {
                $checkinTime = strtotime($checkin['time']);
                $checkoutTime = strtotime($checkout['time']);
                $totalWorkSeconds = $checkoutTime - $checkinTime;
                // Calculate time worked without breaks
                $workedWithoutBreaks = gmdate("H:i:s", $totalWorkSeconds);
                // Calculate time worked with breaks (subtract break time from total time)
                $workedWithBreaks = gmdate("H:i:s", max(0, $totalWorkSeconds - $breakTimeInSeconds));
                // Calculate overtime without breaks
                [$expectedShiftHours, $expectedShiftMinutes] = explode(":", $shift->work_hours);
                $expectedShiftSeconds = ($expectedShiftHours * 3600) + ($expectedShiftMinutes * 60);
                if ($totalWorkSeconds > $expectedShiftSeconds) {
                    $overtimeWithoutBreaks = gmdate("H:i:s", $totalWorkSeconds - $expectedShiftSeconds);
                }
                // Calculate overtime with breaks
                if ($totalWorkSeconds - $breakTimeInSeconds > $expectedShiftSeconds) {
                    $overtimeWithBreaks = gmdate("H:i:s", ($totalWorkSeconds - $breakTimeInSeconds) - $expectedShiftSeconds);
                }
            }
            if ($checkin && $checkout && empty($others)) {
                $status = 'Present [PF]';
            } elseif ($checkin && $checkout && !empty($others)) {
                $status = 'Present [OK]';
            } elseif ($checkin && $checkout == null && !empty($others)) {
                $status = 'Present [AB]';
            } elseif ($checkin && $checkout == null && empty($others)) {
                $status = 'Present [CONF]';
            } elseif ($checkin && $checkout == null && !empty($others)) {
                $status = 'Abnormal [CONF]';
            } elseif ($checkin == null && $checkout && empty($others)) {
                $status = 'Present [CINF]';
            } elseif ($checkin == null && $checkout && !empty($others)) {
                $status = 'Abnormal [CINF]';
            } elseif ($checkin == null && $checkout == null && !empty($others)) {
                $status = 'Abnormal';
            } elseif ($checkin == null && $checkout == null && empty($others)) {
                $status = 'Absent';
            } else {
                $status = 'On Leave';
            }
            // Prepare result for the current shift
            $result[$shiftId] = [
                "status" => $status,
                "name" => $shift->name,
                "hour" => $shift->work_hours,
                "checkin" => $checkin ? [
                    [
                        "rec" => $checkin,
                        "ein" => $checkin && strtotime($checkin['time']) < $startTime ? gmdate("H:i:s", $startTime - strtotime($checkin['time'])) : "",
                        "lin" => $checkin && strtotime($checkin['time']) > $startTime ? gmdate("H:i:s", strtotime($checkin['time']) - $startTime) : ""
                    ]
                ] : [],
                "checkout" => $checkout ? [
                    [
                        "rec" => $checkout,
                        "eout" => $checkout && strtotime($checkout['time']) < $endTime ? gmdate("H:i:s", $endTime - strtotime($checkout['time'])) : "",
                        "lout" => $checkout && strtotime($checkout['time']) > $endTime ? gmdate("H:i:s", strtotime($checkout['time']) - $endTime) : ""
                    ]
                ] : [],
                "break" => [
                    "rec" => $pairedBreaks,
                    "time" => gmdate("H:i:s", $breakTimeInSeconds),
                ],
                "work" => [
                    "wb" => $workedWithBreaks,
                    "wob" => $workedWithoutBreaks,
                ],
                "overtime" => [
                    "wb" => $overtimeWithBreaks,
                    "wob" => $overtimeWithoutBreaks,
                ],
                "others" => $others
            ];
        }
        return json_encode($result, JSON_PRETTY_PRINT);
    }
    /* ----------------------------------------------------------------------------------------------
    Shift Ui
    ---------------------------------------------------------------------------------------------- */
    private static function shiftui($jsonInput)
    {
        // Decode the input JSON
        $data = json_decode($jsonInput, true);
        if ($data === null) {
            throw new InvalidArgumentException("Invalid JSON input.");
        }
        $output = ''; // To store the final HTML
        // Iterate through each shift in the input
        foreach ($data as $shiftDetails) {
            $shiftBadge = "<span class='shft-badge atd-shift-model' data-json='" . $jsonInput . "'>";
            // Check for checkin
            if (!empty($shiftDetails['checkin'])) {
                foreach ($shiftDetails['checkin'] as $checkinRecord) {
                    $shiftBadge .= "<span class='shft-pill bg-success' data-bs-toggle='tooltip' data-bs-placement='top' title='IN : " . $checkinRecord['rec']['time'] . "'><i class='fas fa-sign-in-alt'></i></span>";
                }
            }
            // Check for checkout
            if (!empty($shiftDetails['checkout'])) {
                foreach ($shiftDetails['checkout'] as $checkoutRecord) {
                    $shiftBadge .= "<span class='shft-pill bg-info' data-bs-toggle='tooltip' data-bs-placement='top' title='OUT : " . $checkoutRecord['rec']['time'] . "'><i class='fas fa-sign-out-alt'></i></span>";
                }
            }
            // Check for others
            if (!empty($shiftDetails['others'])) {
                $shiftBadge .= "<span class='shft-pill bg-warning'><i class='fa-regular fa-lightbulb-exclamation'></i></span>";
            }
            // Close the badge
            $shiftBadge .= "</span> ";
            // Append to the output
            $output .= $shiftBadge;
        }
        // Return the final output HTML string
        return $output;
    }
    /* ----------------------------------------------------------------------------------------------
    Helper function to format time
    ---------------------------------------------------------------------------------------------- */
    private static function formatTime($dateTime)
    {
        if ($dateTime === '' || empty($dateTime)) {
            return '';
        }
        try {
            $time = new \DateTime($dateTime);
            return $time->format('H:i:s');
        } catch (Exception $e) {
            return $dateTime;
        }
    }
}
class PdfHelper extends TCPDF
{
    protected $range;
    protected $organization;
    public function __construct(
        $orientation = 'L',
        $unit = 'mm',
        $format = 'A4',
        $unicode = true,
        $encoding = 'UTF-8',
        $diskcache = false,
        $range,
        $organization
    ) {
        try {
            parent::__construct($orientation, $unit, $format, $unicode, $encoding, $diskcache);
            $this->range = $range;
            $this->organization = $organization;
        } catch (Exception $e) {
            throw new Exception('Error initializing PDF: ' . $e->getMessage());
        }
    }
    // Custom Header
    public function Header()
    {
        $style = self::style();
        $header = $style . '<table class="fs-15 fw-bold center" cellpadding="0">' .
            '<tr><td>Attendance Report (Detailed View)</td></tr></table>' .
            '<table class="fs-10 center" cellpadding="0">' .
            '<tr><td>' . htmlspecialchars($this->range) . '</td></tr></table>' .
            '<table class="fs-10" cellpadding="2">' .
            '<tr><td width="50%" class="left"><strong>Organization : </strong>' . htmlspecialchars($this->organization) . '</td>' .
            '<td width="50%" class="right"><strong>Printed On : </strong>' . date('Y-m-d H:i:s') . '</td></tr></table><hr>';
        $this->writeHTML($header, true, false, true, false, '');
        $this->Ln(2);
    }
    // Custom Footer
    public function Footer()
    {
        $this->SetY(-8);
        $style = self::style();
        $footer = $style . '<hr><span class="spacing"></span>' .
            '<table class="fs-10" cellpadding="0">' .
            '<tr>' .
            '<td width="30%" class="left">Generated by <a href="https://gotit4all.com/" style="text-decoration: none; color: #000;"><strong>Got It</strong></a></td>' .
            '<td width="40%" class="center"><a href="https://digitalkuppam.com/" style="text-decoration: none; color: #000;">Powered by <strong>Digital Kuppam</strong></a></td>' .
            '<td width="30%" class="right">Page <strong>' . $this->getAliasNumPage() . '/' . $this->getAliasNbPages() . '</strong></td>' .
            '</tr></table>';
        $this->writeHTML($footer, true, false, true, false, '');
    }
    // Generate PDF Report
    public static function generatePdf($transposedRows, $filters = [], $output)
    {
        try {
            $startDate = $filters['start_date'] ?? date('Y-m-01');
            $endDate = $filters['end_date'] ?? date('Y-m-d');
            $range = $startDate . ' To ' . $endDate;
            $organization = Organization::where('org_id', UserHelper::getCurrentUser('org_id'))->firstOrFail();
            // Create a new instance of the class
            $pdf = new PdfHelper(
                'L',        // Landscape orientation
                'mm',       // Unit of measurement (must be valid)
                PDF_PAGE_FORMAT,
                true,       // Unicode support
                'UTF-8',    // Encoding
                false,      // Disk cache
                $range,     // Date range
                $organization->name // Organization name
            );
            // Set document information
            $pdf->SetCreator('Got-It :) -- Your one-stop solution for HR needs');
            $pdf->SetAuthor('Got-It Team');
            $pdf->SetTitle('Attendance Report: ' . $organization->name);
            $pdf->SetSubject('Attendance Report From ' . $startDate . ' To ' . $endDate);
            $pdf->SetKeywords('Got-It, Attendance, PDF, Report');
            $pdf->SetFont('dejavusans', '', 11);
            // Set margins and page breaks
            $pdf->SetMargins(5, 24, 5);
            $pdf->SetHeaderMargin(3);
            $pdf->SetFooterMargin(3);
            $pdf->SetAutoPageBreak(true, 10);
            // Add a page
            $pdf->AddPage();
            // Fetch attendance report settings
            $orgId = UserHelper::getCurrentUser('org_id');
            $attendanceReport = Setting::where('org_id', $orgId)
                ->where('type', 'attendance_report_settings')
                ->where('status', 'active')
                ->first();
            $pdfStatusColorData = Setting::where('org_id', $orgId)
                ->where('type', 'attendance_pdf_status_colors')
                ->where('status', 'active')
                ->first();
            $defaultColors = [
                "present_pf" => "#28a745",
                "present_ok" => "#007bff",
                "present_ab" => "#ffc107",
                "present_conf" => "#6c757d",
                "abnormal_conf" => "#dc3545",
                "present_cinf" => "#17a2b8",
                "abnormal_cinf" => "#fd7e14",
                "abnormal" => "#dc3545",
                "absent" => "#f8f9fa"
            ];
            
            $existingpdfStatusColorData = $pdfStatusColorData ? json_decode($pdfStatusColorData->setting, true) : [];
            
            // If empty, assign default colors
            $existingpdfStatusColorData = !empty($existingpdfStatusColorData) ? $existingpdfStatusColorData : $defaultColors;
            $headers = $attendanceReport ? json_decode($attendanceReport->setting, true) : [];
            if (empty($headers)) {
                $headers = [
                    'SLN' => 27,
                    'Gotit-Id' => 64,
                    'Name' => 90,
                    'Shift' => 47,
                    'Check-In' => 50,
                    'Late-In' => 50,
                    'Check-Out' => 57,
                    'Early-Out' => 57,
                    'Breaks' => 50,
                    'Work' => 50,
                    'Overtime' => 50,
                    'Status' => 82,
                    'Records' => 140
                ];
            }
            $style = PdfHelper::style();
            $repoTable = '';
            foreach ($transposedRows as $date => $departments) {
                foreach ($departments as $department => $dateRows) {
                    $repoTable .= $style;
                    $repoTable .= '<table class="fs-10" cellpadding="3">
                        <tr><td width="50%" class="left"><strong>Department : </strong>' . htmlspecialchars($department) . '</td>
                        <td width="50%" class="right"><strong>Date : </strong>' . htmlspecialchars($date) . '</td></tr></table>';
                    // Create table with headers
                    $repoTable .= '<table cellspacing="0" cellpadding="3" border="0" class="atd-table">';
                    $repoTable .= '<thead><tr class="header">';
                    foreach ($headers as $key => $value) {
                        $repoTable .= '<th class="header" style="width: ' . $value . 'px;">' . htmlspecialchars($key) . '</th>';
                    }
                    $repoTable .= '</tr></thead>';
                    $repoTable .= '<tbody>';
                    $i = 1;
                    $printedRowspan = false;
                    foreach ($dateRows as $row) {
                        $repoTable .= '<tr>';
                        $rowspan = isset($row['rowspan']) && $row['rowspan'] > 0 ? ' rowspan="' . $row['rowspan'] . '"' : '';
                        foreach ($headers as $label => $columnWidth) {
                            $columnWidth = $columnWidth ?? 50;
                            if ($label == 'Gotit-Id') {
                                if ($row['rowspan'] > 0 && !$printedRowspan) {
                                    $repoTable .= '<td style="width: ' . $headers['Gotit-Id'] . 'px;" ' . $rowspan . '>' . htmlspecialchars($row['Gotit-Id']) . '</td>';
                                } elseif ($row['rowspan'] == 0) {
                                    $repoTable .= '<td style="width: ' . $headers['Gotit-Id'] . 'px;" ' . $rowspan . '>' . htmlspecialchars($row['Gotit-Id']) . '</td>';
                                }
                            } elseif ($label == 'SLN') {
                                if ($row['rowspan'] > 0 && !$printedRowspan) {
                                    $repoTable .= '<td style="width: ' . $headers['SLN'] . 'px; padding: 10px" ' . $rowspan . '>' . $i . '</td>';
                                } elseif ($row['rowspan'] == 0) {
                                    $repoTable .= '<td style="width: ' . $headers['SLN'] . 'px; padding: 10px" ' . $rowspan . '>' . $i . '</td>';
                                }
                            } elseif ($label == 'Name') {
                                if ($row['rowspan'] > 0 && !$printedRowspan) {
                                    $repoTable .= '<td style="width: ' . $headers['Name'] . 'px;" ' . $rowspan . '>' . htmlspecialchars($row['Name']) . '</td>';
                                } elseif ($row['rowspan'] == 0) {
                                    $repoTable .= '<td style="width: ' . $headers['Name'] . 'px;" ' . $rowspan . '>' . htmlspecialchars($row['Name']) . '</td>';
                                }
                            } elseif ($label == 'Breaks' && $row[$label] == '00:00:00') {
                                $repoTable .= '<td class="cellPadding" style="width: ' . $columnWidth . 'px;"></td>';
                            } elseif ($label == 'Status') {
                                $statusColorMapping = [
                                    'Present [PF]' => 'present_pf',
                                    'Present [OK]' => 'present_ok',
                                    'Present [AB]' => 'present_ab',
                                    'Present [CONF]' => 'present_conf',
                                    'Abnormal [CONF]' => 'abnormal_conf',
                                    'Present [CINF]' => 'present_cinf',
                                    'Abnormal [CINF]' => 'abnormal_cinf',
                                    'Abnormal' => 'abnormal',
                                    'Absent' => 'absent',
                                ];
                                $statusKey = $statusColorMapping[$row[$label]] ?? null;
                                $color = $statusKey ? $existingpdfStatusColorData[$statusKey] : '#28a745'; // Fallback color
                                $repoTable .= '<td class="cellPadding" style="width: ' . $columnWidth . 'px; color: ' . $color . ';">' . htmlspecialchars($row[$label]) . '</td>';
                            } elseif ($label == 'Records') {
                                $repoTable .= '<td style="width: ' . $columnWidth . 'px; font-size:7px;">' . html_entity_decode($row['Others'] ?? '') . '</td>';
                            } else {
                                $repoTable .= '<td style="width: ' . $columnWidth . 'px;">' . htmlspecialchars($row[$label] ?? '') . '</td>';
                            }
                        }
                        $repoTable .= '</tr>';
                        if ($row['rowspan'] > 0) {
                            if (!$printedRowspan) {
                                $i++;
                            }
                            $printedRowspan = true;
                        } else {
                            $i++;
                        }
                    }
                    $repoTable .= '</tbody></table>';
                }
            }
            $pdf->writeHTML($repoTable, true, false, true, false, '');
            // Add a new page for the status legend
            
// Add a new page for the summary
$pdf->AddPage();

// Define styles
$summaryTable = $style;
$summaryTable .= '<h2 class="summary-header">Attendance Summary</h2>';
$summaryTable .= '<table cellspacing="0" cellpadding="3" border="1" class="atd-table">
    <thead>
        <tr class="header">
            <th class="header" style="width: 200px;">Employee Name</th>
            <th class="header" style="width: 50px;">PF</th>
            <th class="header" style="width: 50px;">OK</th>
            <th class="header" style="width: 50px;">AB</th>
            <th class="header" style="width: 50px;">CONF</th>
            <th class="header" style="width: 50px;">AB CONF</th>
            <th class="header" style="width: 50px;">CINF</th>
            <th class="header" style="width: 50px;">AB CINF</th>
            <th class="header" style="width: 55px;">Abnormal</th>
            <th class="header" style="width: 55px;">Absent</th>
            <th class="header" style="width: 150px;">Total (PF+OK)/Days</th>
        </tr>
    </thead>
    <tbody>';

// Initialize array for attendance counts per employee
$employeeAttendance = [];

foreach ($transposedRows as $date => $departments) {
    foreach ($departments as $department => $dateRows) {
        foreach ($dateRows as $row) {
            $employeeName = $row['Name'] ?? 'Unknown';
            $status = $row['Status'] ?? 'Absent';

            // Initialize if not exists
            if (!isset($employeeAttendance[$employeeName])) {
                $employeeAttendance[$employeeName] = [
                    'PF' => 0, 'OK' => 0, 'AB' => 0, 'CONF' => 0, 'AB CONF' => 0, 
                    'CINF' => 0, 'AB CINF' => 0, 'Abnormal' => 0, 'Absent' => 0, 'Total' => 0
                ];
            }

            // Categorize the status
            if (strpos($status, 'PF') !== false) {
                $employeeAttendance[$employeeName]['PF']++;
            } elseif (strpos($status, 'OK') !== false) {
                $employeeAttendance[$employeeName]['OK']++;
            } elseif (strpos($status, 'AB]') !== false) { 
                $employeeAttendance[$employeeName]['AB']++;
            } elseif (strpos($status, 'CONF]') !== false) { 
                $employeeAttendance[$employeeName]['CONF']++;
            } elseif (strpos($status, 'Abnormal [CONF]') !== false) { 
                $employeeAttendance[$employeeName]['AB CONF']++;
            } elseif (strpos($status, 'CINF]') !== false) { 
                $employeeAttendance[$employeeName]['CINF']++;
            } elseif (strpos($status, 'Abnormal [CINF]') !== false) { 
                $employeeAttendance[$employeeName]['AB CINF']++;
            } elseif (strpos($status, 'Abnormal') !== false) {
                $employeeAttendance[$employeeName]['Abnormal']++;
            } elseif (strpos($status, 'Absent') !== false) {
                $employeeAttendance[$employeeName]['Absent']++;
            }

            // Calculate Total (PF + OK)
            $employeeAttendance[$employeeName]['Total'] = $employeeAttendance[$employeeName]['PF'] + $employeeAttendance[$employeeName]['OK'];
        }
    }
}

// Populate the summary table
foreach ($employeeAttendance as $employee => $data) {
    $totalDays = array_sum($data) - $data['Total']; // Total Days excluding 'Total (PF+OK)'

    $summaryTable .= '<tr>
    <td style="width: 200px;">' . htmlspecialchars($employee) . '</td>
    <td style="width: 50px;">' . $data['PF'] . '</td>
    <td style="width: 50px;">' . $data['OK'] . '</td>
    <td style="color: orange; width: 50px;">' . $data['AB'] . '</td>
    <td style="color: purple; width: 50px;">' . $data['CONF'] . '</td>
    <td style="color: brown; width: 50px;">' . $data['AB CONF'] . '</td>
    <td style="color: teal; width: 50px;">' . $data['CINF'] . '</td>
    <td style="color: darkred; width: 50px;">' . $data['AB CINF'] . '</td>
    <td style="color: gray; width: 55px;">' . $data['Abnormal'] . '</td>
    <td style="color: red; font-weight: bold; width: 55px;">' . $data['Absent'] . '</td>
    <td style="color: darkblue; font-weight: bold; width: 150px;">' . $data['Total'] . '/' . $totalDays . '</td>
</tr>';
}

$summaryTable .= '</tbody></table>';

$pdf->writeHTML($summaryTable, true, false, true, false, '');















           // Add a new page for the summary
            $pdf->AddPage();
            $legendTable = $style;
            $legendTable .= '<table class="fs-10" cellpadding="3">
        <tr>
            <td width="50%" class="left"><strong>Legend Title:</strong> Attendance Status</td>
            <td width="50%" class="right"><strong>Date:</strong> ' . date('Y-m-d') . '</td>
        </tr>
    </table>';
            $legendTable .= '<table cellspacing="0" cellpadding="3" border="0" class="atd-table">
        <thead>
            <tr class="header">
                <th class="header" style="width: 30%;">Status</th>
                <th class="header" style="width: 70%;">Description</th>
            </tr>
        </thead>
        <tbody>';
            $statusLegend = [
                'Present [PF]' => 'Successfully checked in and checked out at the correct time.',
                'Present [OK]' => 'Checked in and/or checked out slightly late, but still within acceptable limits.',
                'Present [AB]' => 'Present but with an abnormal check-in or check-out time.',
                'Present [CONF]' => 'Present, but the checkout time is missing or unrecorded.',
                'Abnormal [CONF]' => 'Abnormal check-in or check-out times with no checkout recorded.',
                'Present [CINF]' => 'Present, but the check-in time is missing or unrecorded.',
                'Abnormal [CINF]' => 'Abnormal check-in or check-out times and the check-in time is missing.',
                'Abnormal' => 'Check-in or check-out times don’t align with the shift schedule.',
                'Absent' => 'No check-in or check-out recorded.'
            ];
            foreach ($statusLegend as $status => $description) {
                $color = isset($statusColorMapping[$status]) ? $existingpdfStatusColorData[$statusColorMapping[$status]] : '#28a745';
                $legendTable .= '
        <tr>
            <td style="font-weight:bold; color: ' . $color . '; width: 30%;">' . $status . '</td>
            <td style="width: 70%;">' . $description . '</td>
        </tr>';
            }
            $legendTable .= '</tbody></table>';
            // Add to the PDF
            $pdf->writeHTML($legendTable, true, false, true, false, '');
            //return $repoTable;
            return $pdf->Output('', 'S');
        } catch (Exception $e) {
            return 'Error generating PDF: ' . $e->getMessage();
        }
    }
    /*----------------------------------------------------------------------------------------
    PDF Styles
    ----------------------------------------------------------------------------------------*/
    public static function style()
    {
        return '<style>
        p, div{
            font-size: 11px;
            line-height: 18px;
        }
        .spacing{
        line-height: 10px;
        }
        .atd-table{
            width: 100%;
            border-collapse: collapse;
            color: #143143;
            font-size: 8px;
        }
        .atd-table th, .atd-table td {
            border: 0.3px solid #ababab;
        }
        .header {
            color: #000;
            font-weight: bold;
            font-size: 8px;
            text-transform: uppercase;
            background-color:#dddddd;
            padding:10px;
        }
        .fs-16 { font-size: 16px; }
        .fs-15 { font-size: 15px; }
        .fs-14 { font-size: 14px; }
        .fs-13 { font-size: 13px; }
        .fs-11 { font-size: 11px; }
        .fs-10 { font-size: 10px; }
        .fs-9 { font-size: 9px; }
        .fs-8 { font-size: 8px; }
        .fs-7 { font-size: 7px; }
        .lh-5 { line-height: 5px !important; }
        .lh-10 { line-height: 10px !important; }
        .lh-15 { line-height: 15px !important; }
        .lh-20 { line-height: 20px !important; }
        .fw-bold { font-weight: bold; }
        .heading { border-collapse: collapse !important; }
        .left { text-align: left; }
        .center { text-align: center; }
        .right { text-align: right; }
        </style>';
    }
}
