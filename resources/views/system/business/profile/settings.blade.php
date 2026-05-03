@extends('layouts.system-app')
@section('title', 'Account Settings | Gotit HR Management Software')

@section('top-style')
    <link rel="stylesheet" href="{{ asset('treasury/libs/visuals/datatables/datatables.min.css') }}">
    <style>
        /* Root Variables */
        :root {
            --primary: #4e73df;
            --primary-dark: #3a5bc7;
            --secondary: #6b7280;
            --background: #f9fafb;
            --card-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
            --card-hover-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
            --border-radius: 12px;
            --transition: all 0.3s ease-in-out;
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        body {
            background-color: var(--background);
            font-family: var(--font-family);
            line-height: 1.6;
            color: #1f2937;
        }

        /* Card Styling */
        .settings-card {
            background: white;
            border-radius: var(--border-radius);
            box-shadow: var(--card-shadow);
            transition: var(--transition);
            overflow: hidden;
        }

        .settings-card:hover {
            box-shadow: var(--card-hover-shadow);
        }

        /* Sidebar Header */
        .sidebar-header {
            background: linear-gradient(135deg, #6e8efb, #a777e3);
            color: white;
            padding: 1.5rem;
            text-align: center;
            border-radius: var(--border-radius) var(--border-radius) 0 0;
        }

        .sidebar-header h4 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }

        .sidebar-header p {
            font-size: 0.9rem;
            opacity: 0.85;
            margin: 0;
        }

        /* Navigation */
        .nav-pills .nav-link {
            color: var(--secondary);
            font-weight: 500;
            padding: 0.75rem 1.5rem;
            margin: 0.5rem 0;
            border-radius: 8px;
            transition: var(--transition);
        }

        .nav-pills .nav-link:hover {
            background-color: #f1f5f9;
            color: var(--primary);
        }

        .nav-pills .nav-link.active {
            background-color: var(--primary);
            color: white;
        }

        .nav-pills .nav-link i {
            margin-right: 0.75rem;
        }

        /* Form Elements */
        .form-control,
        .form-select {
            border-radius: 8px;
            padding: 0.75rem 1rem;
            border: 1px solid #d1d5db;
            font-size: 0.95rem;
            transition: var(--transition);
        }

        .form-control:focus,
        .form-select:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 0.2rem rgba(78, 115, 223, 0.2);
        }

        .form-label {
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.5rem;
        }

        /* Section Title */
        .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--primary);
            margin-bottom: 1.5rem;
            position: relative;
            padding-left: 1rem;
        }

        .section-title:before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 60%;
            background: var(--primary);
            border-radius: 4px;
        }

        /* Toggle Switch */
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 56px;
            height: 28px;
        }

        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #d1d5db;
            transition: var(--transition);
            border-radius: 28px;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: var(--transition);
            border-radius: 50%;
        }

        input:checked+.toggle-slider {
            background-color: var(--primary);
        }

        input:checked+.toggle-slider:before {
            transform: translateX(28px);
        }

        /* Security Badge */
        .security-badge {
            background: #f8fafc;
            border-radius: 8px;
            padding: 1.25rem;
            margin-bottom: 1.25rem;
            border-left: 4px solid var(--primary);
            transition: var(--transition);
        }

        .security-badge:hover {
            background: #f1f5f9;
        }

        /* Social Connect */
        .social-connect {
            display: flex;
            align-items: center;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            background: #f8fafc;
            transition: var(--transition);
        }

        .social-connect:hover {
            background: #f1f5f9;
        }

        .social-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
            color: white;
            font-size: 1.5rem;
            transition: var(--transition);
        }

        /* Buttons */
        .btn-save {
            background-color: var(--primary);
            border: none;
            padding: 0.75rem 2rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            border-radius: 8px;
            transition: var(--transition);
        }

        .btn-save:hover {
            background-color: var(--primary-dark);
        }

        .btn-cancel {
            padding: 0.75rem 2rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            border-radius: 8px;
            transition: var(--transition);
            border: 1px solid #d1d5db;
        }

        .btn-cancel:hover {
            background-color: #f1f5f9;
        }

        /* Modal Styling */
        .modal-content {
            border-radius: var(--border-radius);
            box-shadow: var(--card-shadow);
        }

        .modal-header {
            border-bottom: none;
            padding: 1.5rem;
            background: linear-gradient(135deg, #f8fafc, #ffffff);
        }

        .modal-footer {
            border-top: none;
            padding: 1rem 1.5rem;
        }

        /* Responsive Design */
        @media (max-width: 991px) {
            .settings-card {
                margin-bottom: 2rem;
            }

            .sidebar-header {
                padding: 1rem;
            }
        }

        @media (max-width: 767px) {
            .settings-card {
                padding: 1rem;
            }

            .nav-pills .nav-link {
                padding: 0.5rem 1rem;
            }

            .section-title {
                font-size: 1.1rem;
            }
        }
    </style>
@endsection

@section('bottom-script')
    <script src="{{ asset('treasury/libs/visuals/datatables/datatables.min.js') }}"></script>
    <script src="{{ asset('treasury/libs/visuals/datatables/pdfmake.min.js') }}"></script>
    <script src="{{ asset('treasury/libs/visuals/datatables/vfs_fonts.js') }}"></script>
    <script>
        $(document).ready(function() {
            // Two-factor authentication toggle
            $('#twoFactorToggle').change(function() {
                if ($(this).is(':checked')) {
                    $('#twoFactorModal').modal('show');
                } else {
                    if (confirm('Are you sure you want to disable two-factor authentication?')) {
                        // Implement disable logic
                    } else {
                        $(this).prop('checked', true);
                    }
                }
            });

            // Password visibility toggle
            $('.toggle-password').click(function() {
                const input = $(this).siblings('input');
                const icon = $(this).find('i');
                if (input.attr('type') === 'password') {
                    input.attr('type', 'text');
                    icon.removeClass('fa-eye').addClass('fa-eye-slash');
                } else {
                    input.attr('type', 'password');
                    icon.removeClass('fa-eye-slash').addClass('fa-eye');
                }
            });

            // Copy 2FA code
            $('#copyCodeBtn').click(function() {
                const code = $(this).siblings('input').val();
                navigator.clipboard.writeText(code).then(() => {
                    alert('Code copied to clipboard!');
                });
            });

            // Form submission feedback (example)
            $('.btn-save').click(function() {
                // Simulate form submission
                alert('Settings saved successfully!');
            });
        });
    </script>
@endsection

@section('content')
    <div class="container-fluid py-5">
        <div class="row">
            <div class="col-lg-4">
                <div class="settings-card mb-4">
                    <div class="sidebar-header">
                        <h4>{{ auth()->user()->name }}</h4>
                        <p>{{ auth()->user()->email }}</p>
                        <p>Member since {{ auth()->user()->created_at->format('M Y') }}</p>
                    </div>
                    <div class="card-body p-4">
                        <ul class="nav nav-pills flex-column">
                            <li class="nav-item">
                                <a class="nav-link active" href="#security" data-bs-toggle="tab">
                                    <i class="fas fa-shield-alt"></i> Security
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="#notifications" data-bs-toggle="tab">
                                    <i class="fas fa-bell"></i> Notifications
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="#social" data-bs-toggle="tab">
                                    <i class="fas fa-share-alt"></i> Social Links
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="#preferences" data-bs-toggle="tab">
                                    <i class="fas fa-sliders-h"></i> Preferences
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="settings-card">
                    <div class="card-body p-4">
                        <h6 class="section-title">Account Status</h6>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span>Email Verified</span>
                            <span class="badge bg-success rounded-pill px-3 py-2">Verified</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span>Last Login</span>
                            <span class="text-muted">2 hours ago</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span>Account Activity</span>
                            <span class="text-muted">Active</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-lg-8">
                <div class="settings-card">
                    <div class="card-body p-4">
                        <div class="tab-content">
                            <!-- Security Tab -->
                            <div class="tab-pane fade show active" id="security">
                                <h5 class="section-title">Security Settings</h5>

                                <div class="security-badge">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="mb-0">Two-Factor Authentication</h6>
                                        <label class="toggle-switch">
                                            <input type="checkbox" id="twoFactorToggle">
                                            <span class="toggle-slider"></span>
                                        </label>
                                    </div>
                                    <p class="mb-0 text-muted">Add an extra layer of security to your account.</p>
                                </div>

                                <div class="security-badge">
                                    <h6 class="mb-3">Change Password</h6>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Current Password</label>
                                            <div class="input-group">
                                                <input type="password" class="form-control" required>
                                                <button class="btn btn-outline-secondary toggle-password" type="button">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">New Password</label>
                                            <div class="input-group">
                                                <input type="password" class="form-control" required>
                                                <button class="btn btn-outline-secondary toggle-password" type="button">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Confirm New Password</label>
                                            <div class="input-group">
                                                <input type="password" class="form-control" required>
                                                <button class="btn btn-outline-secondary toggle-password" type="button">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="btn btn-primary btn-save">Update Password</button>
                                </div>

                                <div class="security-badge">
                                    <h6 class="mb-3">Active Sessions</h6>
                                    <div class="d-flex align-items-center mb-3">
                                        <div class="me-3">
                                            <i class="fas fa-desktop fa-2x text-primary"></i>
                                        </div>
                                        <div class="flex-grow-1">
                                            <h6 class="mb-0">MacBook Pro</h6>
                                            <small class="text-muted">San Francisco, CA • Chrome • Just now</small>
                                        </div>
                                        <button class="btn btn-sm btn-outline-danger">Sign Out</button>
                                    </div>
                                    <div class="d-flex align-items-center">
                                        <div class="me-3">
                                            <i class="fas fa-mobile-alt fa-2x text-primary"></i>
                                        </div>
                                        <div class="flex-grow-1">
                                            <h6 class="mb-0">iPhone 12</h6>
                                            <small class="text-muted">New York, NY • Safari • 2 days ago</small>
                                        </div>
                                        <button class="btn btn-sm btn-outline-danger">Sign Out</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Notifications Tab -->
                            <div class="tab-pane fade" id="notifications">
                                <h5 class="section-title">Notification Preferences</h5>

                                <div class="mb-4">
                                    <h6 class="mb-3">Email Notifications</h6>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="emailAnnouncements" checked>
                                        <label class="form-check-label" for="emailAnnouncements">Company
                                            Announcements</label>
                                    </div>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="emailUpdates" checked>
                                        <label class="form-check-label" for="emailUpdates">Product Updates</label>
                                    </div>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="emailReminders">
                                        <label class="form-check-label" for="emailReminders">Reminders</label>
                                    </div>
                                </div>

                                <div class="mb-4">
                                    <h6 class="mb-3">Push Notifications</h6>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="pushMessages" checked>
                                        <label class="form-check-label" for="pushMessages">New Messages</label>
                                    </div>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="pushTasks" checked>
                                        <label class="form-check-label" for="pushTasks">Task Assignments</label>
                                    </div>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="pushApprovals">
                                        <label class="form-check-label" for="pushApprovals">Approval Requests</label>
                                    </div>
                                </div>

                                <div class="mb-4">
                                    <h6 class="mb-3">SMS Notifications</h6>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="smsUrgent">
                                        <label class="form-check-label" for="smsUrgent">Urgent Alerts</label>
                                    </div>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="smsSecurity">
                                        <label class="form-check-label" for="smsSecurity">Security Alerts</label>
                                    </div>
                                </div>

                                <button type="button" class="btn btn-primary btn-save">Save Preferences</button>
                            </div>

                            <!-- Social Links Tab -->
                            <div class="tab-pane fade" id="social">
                                <h5 class="section-title">Connected Accounts</h5>

                                <div class="social-connect">
                                    <div class="social-icon bg-primary">
                                        <i class="fab fa-google"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <h6 class="mb-0">Google</h6>
                                        <small class="text-muted">Connected for authentication</small>
                                    </div>
                                    <button class="btn btn-sm btn-outline-danger">Disconnect</button>
                                </div>

                                <div class="social-connect">
                                    <div class="social-icon bg-info">
                                        <i class="fab fa-linkedin-in"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <h6 class="mb-0">LinkedIn</h6>
                                        <small class="text-muted">Not connected</small>
                                    </div>
                                    <button class="btn btn-sm btn-primary">Connect</button>
                                </div>

                                <div class="social-connect">
                                    <div class="social-icon bg-secondary">
                                        <i class="fab fa-github"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <h6 class="mb-0">GitHub</h6>
                                        <small class="text-muted">Connected for development</small>
                                    </div>
                                    <button class="btn btn-sm btn-outline-danger">Disconnect</button>
                                </div>

                                <h5 class="section-title mt-5">Social Media Links</h5>
                                <form>
                                    <div class="row mb-3">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Twitter</label>
                                            <div class="input-group">
                                                <span class="input-group-text"><i class="fab fa-twitter"></i></span>
                                                <input type="text" class="form-control" placeholder="@username">
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Facebook</label>
                                            <div class="input-group">
                                                <span class="input-group-text"><i class="fab fa-facebook-f"></i></span>
                                                <input type="text" class="form-control" placeholder="username">
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Instagram</label>
                                            <div class="input-group">
                                                <span class="input-group-text"><i class="fab fa-instagram"></i></span>
                                                <input type="text" class="form-control" placeholder="username">
                                            </div>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">LinkedIn</label>
                                            <div class="input-group">
                                                <span class="input-group-text"><i class="fab fa-linkedin-in"></i></span>
                                                <input type="text" class="form-control" placeholder="profile-url">
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="btn btn-primary btn-save">Save Links</button>
                                </form>
                            </div>

                            <!-- Preferences Tab -->
                            <div class="tab-pane fade" id="preferences">
                                <h5 class="section-title">Account Preferences</h5>

                                <div class="mb-4">
                                    <h6 class="mb-3">Language & Region</h6>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Language</label>
                                            <select class="form-select">
                                                <option selected>English (US)</option>
                                                <option>English (UK)</option>
                                                <option>Spanish</option>
                                                <option>French</option>
                                                <option>German</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Time Zone</label>
                                            <select class="form-select">
                                                <option>(UTC-08:00) Pacific Time</option>
                                                <option>(UTC-07:00) Mountain Time</option>
                                                <option selected>(UTC-05:00) Eastern Time</option>
                                                <option>(UTC) Greenwich Mean Time</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="mb-4">
                                    <h6 class="mb-3">Display Preferences</h6>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="darkMode" checked>
                                        <label class="form-check-label" for="darkMode">Dark Mode</label>
                                    </div>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="compactMode">
                                        <label class="form-check-label" for="compactMode">Compact Mode</label>
                                    </div>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="highContrast">
                                        <label class="form-check-label" for="highContrast">High Contrast Mode</label>
                                    </div>
                                </div>

                                <div class="mb-4">
                                    <h6 class="mb-3">Data & Privacy</h6>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="dataCollection" checked>
                                        <label class="form-check-label" for="dataCollection">Allow data collection for
                                            analytics</label>
                                    </div>
                                    <div class="form-check form-switch mb-2">
                                        <input class="form-check-input" type="checkbox" id="personalizedAds">
                                        <label class="form-check-label" for="personalizedAds">Personalized
                                            advertising</label>
                                    </div>
                                </div>

                                <button type="button" class="btn btn-primary btn-save">Save Preferences</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Two-Factor Modal -->
    <div class="modal fade" id="twoFactorModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Enable Two-Factor Authentication</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted">Enable two-factor authentication (2FA) for enhanced account security.</p>

                    <div class="text-center my-4">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example"
                            alt="QR Code" class="img-fluid mb-3">
                        <p class="text-muted">Scan this QR code with your authenticator app</p>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Or enter this code manually:</label>
                        <div class="input-group">
                            <input type="text" class="form-control text-center font-monospace"
                                value="JBSWY3DPEHPK3PXP" readonly>
                            <button class="btn btn-outline-secondary" type="button" id="copyCodeBtn">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Enter verification code:</label>
                        <input type="text" class="form-control text-center" placeholder="6-digit code">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline-secondary btn-cancel"
                        data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary btn-save">Verify & Enable</button>
                </div>
            </div>
        </div>
    </div>
@endsection
