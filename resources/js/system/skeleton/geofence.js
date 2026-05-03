/**
 * Initializes GeofenceManager for Google Maps geofencing functionality.
 * Manages map, markers, and circles with event listeners for geofence settings.
 * Uses window.general for logging, toasts, and validation without external libraries.
 *
 * @requires window.general
 * @requires google.maps
 */
export function Geofence() {
  let map = null;
  let marker = null;
  let circle = null;
  let geocoder = null;

  // Validate window.general availability
  if (!window.general) {
    console.error('window.general is required but not available');
    return;
  }

  function initMap() {
    try {
      const apiKey = document.querySelector('meta[name="google-maps-api-key"]')?.content;
      if (!apiKey) {
        window.general.error('Google Maps API key not found');
        window.general.showToast({
          icon: 'error',
          title: 'Configuration Error',
          message: 'Google Maps API key is missing',
          duration: 5000
        });
        return;
      }

      if (window.google?.maps) {
        setupMap();
      } else {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding&callback=initGeofenceMap`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          window.general.error('Failed to load Google Maps API');
          window.general.showToast({
            icon: 'error',
            title: 'API Error',
            message: 'Failed to load Google Maps API',
            duration: 5000
          });
        };
        window.initGeofenceMap = setupMap;
        document.head.appendChild(script);
      }
    } catch (error) {
      window.general.error('Error initializing map', { error: error.message });
      window.general.showToast({
        icon: 'error',
        title: 'Initialization Error',
        message: 'Failed to initialize geofence map',
        duration: 5000
      });
    }
  }

  function setupMap() {
    try {
      if (!window.google?.maps) {
        window.general.error('Google Maps API is required but not loaded');
        window.general.showToast({
          icon: 'error',
          title: 'API Error',
          message: 'Google Maps API failed to load',
          duration: 5000
        });
        return;
      }

      const mapElement = document.getElementById('locationMap');
      if (!mapElement) {
        window.general.error('Map container (locationMap) not found');
        window.general.showToast({
          icon: 'error',
          title: 'Configuration Error',
          message: 'Map container not found',
          duration: 5000
        });
        return;
      }

      map = new google.maps.Map(mapElement, {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        mapTypeId: 'hybrid'
      });
      geocoder = new google.maps.Geocoder();

      map.addListener('click', (e) => {
        try {
          setLocation(e.latLng.lat(), e.latLng.lng());
          getLocationName(e.latLng.lat(), e.latLng.lng());
        } catch (error) {
          window.general.error('Error handling map click', { error: error.message });
        }
      });

      const radiusInput = document.getElementById('geofenceRadius');
      if (radiusInput) {
        radiusInput.addEventListener('change', () => {
          try {
            if (circle) {
              const radius = parseInt(radiusInput.value) || 100;
              circle.setRadius(radius);
            }
          } catch (error) {
            window.general.error('Error updating geofence radius', { error: error.message });
          }
        });
      }

      const latInput = document.getElementById('geofenceLatitude');
      const lngInput = document.getElementById('geofenceLongitude');
      if (latInput && lngInput && latInput.value && lngInput.value) {
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);
        const radius = radiusInput && radiusInput.value ? parseInt(radiusInput.value) : 100;
        if (!isNaN(lat) && !isNaN(lng)) {
          setLocation(lat, lng);
          if (circle) circle.setRadius(radius);
          getLocationName(lat, lng);
        }
      }
    } catch (error) {
      window.general.error('Error setting up map', { error: error.message });
      window.general.showToast({
        icon: 'error',
        title: 'Setup Error',
        message: 'Failed to set up geofence map',
        duration: 5000
      });
    }
  }

  function setLocation(lat, lng) {
    try {
      if (marker) marker.setMap(null);
      if (circle) circle.setMap(null);

      const radiusInput = document.getElementById('geofenceRadius');
      const radius = radiusInput && radiusInput.value ? parseInt(radiusInput.value) : 100;

      marker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        draggable: true
      });

      circle = new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35,
        map: map,
        center: { lat, lng },
        radius: radius
      });

      map.setCenter({ lat, lng });
      map.setZoom(15);

      const latInput = document.getElementById('geofenceLatitude');
      const lngInput = document.getElementById('geofenceLongitude');
      if (latInput) latInput.value = lat;
      if (lngInput) lngInput.value = lng;

      marker.addListener('dragend', () => {
        try {
          const pos = marker.getPosition();
          circle.setCenter(pos);
          if (latInput) latInput.value = pos.lat();
          if (lngInput) lngInput.value = pos.lng();
          getLocationName(pos.lat(), pos.lng());
        } catch (error) {
          window.general.error('Error handling marker drag', { error: error.message });
        }
      });
    } catch (error) {
      window.general.error('Error setting location', { error: error.message });
      window.general.showToast({
        icon: 'error',
        title: 'Location Error',
        message: 'Failed to set geofence location',
        duration: 5000
      });
    }
  }

  function getLocationName(lat, lng) {
    try {
      const nameInput = document.getElementById('geofenceName');
      if (!nameInput) return;

      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        try {
          if (status === 'OK' && results[0]) {
            nameInput.value = results[0].formatted_address;
          } else {
            nameInput.value = '';
            window.general.showToast({
              icon: 'warning',
              title: 'Geocode Warning',
              message: 'Unable to retrieve location name',
              duration: 5000
            });
          }
        } catch (error) {
          window.general.error('Error geocoding location', { error: error.message });
        }
      });
    } catch (error) {
      window.general.error('Error getting location name', { error: error.message });
    }
  }

  initMap();

  return {
    initMap,
    setLocation,
    getLocationName
  };
}

/**
 * AttendanceTracker for handling check-in/check-out with geofence and face detection.
 * Uses DOM element IDs to fetch data and verifies user location against geofence table.
 * Requires window.general for logging/toasts, google.maps for geofencing, and faceapi for face detection.
 *
 * @requires window.general
 * @requires google.maps
 * @requires faceapi
 */
// export class AttendanceTracker {
//     constructor() {
//         this.verificationMap = null;
//         this.stream = null;
//         this.faceDetectionInterval = null;
//         this.currentGeofence = null;
//         this.currentCheck = null;
//         this.faceDetected = false;
//         this.attendanceRecords = [];
//         this.modal = null;
//         this.geofenceId = null;
//         this.checkType = null;
//     }

//   async init() {
//     console.log('AttendanceTracker: Initializing at', new Date().toISOString());
//     try {
//       if (!window.bootstrap) throw new Error('Bootstrap is not loaded');
//       console.log('AttendanceTracker: Bootstrap verified');

//       if (!window.faceapi?.nets?.tinyFaceDetector) {
//         console.log('AttendanceTracker: faceapi not loaded, attempting to load');
//         await this.loadFaceApiScript();
//       }
//       console.log('AttendanceTracker: faceapi verified');

//       const modalElement = document.getElementById('geofenceModal');
//       if (!modalElement) throw new Error('Geofence modal element not found');
//       this.modal = new bootstrap.Modal(modalElement);
//       console.log('AttendanceTracker: Modal initialized');

//       const geofenceIdInput = document.getElementById('geofenceId');
//       const checkTypeInput = document.getElementById('checkType');
//       if (!geofenceIdInput || !checkTypeInput) {
//         throw new Error('Missing geofenceId or checkType input elements');
//       }
//       this.geofenceId = geofenceIdInput.value;
//       this.checkType = checkTypeInput.value;
//       if (!this.geofenceId || !this.checkType) {
//         throw new Error('geofenceId or checkType values are empty');
//       }
//       console.log('AttendanceTracker: Retrieved geofenceId:', this.geofenceId, 'checkType:', this.checkType);

//       const capturePhotoBtn = document.getElementById('capturePhoto');
//       const retakePhotoBtn = document.getElementById('retakePhoto');
//       const submitAttendanceBtn = document.getElementById('submitAttendance');
//       if (!capturePhotoBtn || !retakePhotoBtn || !submitAttendanceBtn) {
//         throw new Error('One or more button elements not found');
//       }
//       console.log('AttendanceTracker: Button elements found');

//       capturePhotoBtn.addEventListener('click', () => this.capturePhoto());
//       retakePhotoBtn.addEventListener('click', () => this.retakePhoto());
//       submitAttendanceBtn.addEventListener('click', () => this.submitAttendance());

//       this.initVerificationMap();
//       await this.loadFaceDetectionModels();
//       await this.loadGeofenceData();
//       this.startAttendanceProcess();
//       console.log('AttendanceTracker: Initialization complete');
//     } catch (error) {
//       window.general.error('Error initializing AttendanceTracker', { error: error.message });
//       window.general.showToast({
//         icon: 'error',
//         title: 'Initialization Error',
//         message: `Failed to initialize: ${error.message}`,
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Initialization failed', error);
//     }
//   }

//   // Update all other methods to use `this.` explicitly
//   loadFaceApiScript() {
//     console.log('AttendanceTracker: Loading face-api.js');
//     return new Promise((resolve, reject) => {
//       if (window.faceapi?.nets?.tinyFaceDetector) {
//         console.log('AttendanceTracker: faceapi already loaded');
//         resolve();
//         return;
//       }
//       const script = document.createElement('script');
//       script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
//       script.async = true;
//       script.onload = () => {
//         console.log('AttendanceTracker: face-api.js loaded successfully');
//         if (window.faceapi?.nets?.tinyFaceDetector) resolve();
//         else reject(new Error('faceapi tinyFaceDetector not available'));
//       };
//       script.onerror = (event) => {
//         console.error('AttendanceTracker: Failed to load face-api.js', event);
//         reject(new Error(`Failed to load face-api.js: ${event.message || 'Unknown error'}`));
//       };
//       document.head.appendChild(script);
//     });
//   }

//   async loadFaceDetectionModels() {
//     console.log('AttendanceTracker: Loading face detection models');
//     try {
//       const maxRetries = 3;
//       let attempts = 0;
//       while (attempts < maxRetries) {
//         try {
//           await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/');
//           console.log('AttendanceTracker: Face detection models loaded');
//           return;
//         } catch (err) {
//           attempts++;
//           console.warn(`AttendanceTracker: Attempt ${attempts} failed`, err);
//           if (attempts === maxRetries) {
//             throw new Error(`Failed to load models: ${err.message}`);
//           }
//           await new Promise(resolve => setTimeout(resolve, 1000));
//         }
//       }
//     } catch (error) {
//       window.general.error('Error loading face detection models', { error: error.message });
//       window.general.showToast({
//         icon: 'error',
//         title: 'Model Error',
//         message: `Failed to load face detection models: ${error.message}`,
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Face detection models load failed', error);
//       this.modal?.hide();
//     }
//   }

//   initVerificationMap() {
//     console.log('AttendanceTracker: Initializing verification map');
//     try {
//       const apiKey = document.querySelector('meta[name="google-maps-api-key"]')?.content;
//       if (!apiKey) throw new Error('Google Maps API key not found');

//       const mapElement = document.getElementById('verificationMap');
//       if (!mapElement) throw new Error('Verification map container not found');

//       if (window.google?.maps) {
//         this.verificationMap = new google.maps.Map(mapElement, {
//           zoom: 15,
//           mapTypeId: 'hybrid'
//         });
//         console.log('AttendanceTracker: Map initialized with existing Google Maps API');
//       } else {
//         console.log('AttendanceTracker: Loading Google Maps API');
//         const script = document.createElement('script');
//         script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding&callback=initVerificationMapCallback`;
//         script.async = true;
//         script.defer = true;
//         script.onerror = () => {
//           throw new Error('Failed to load Google Maps API');
//         };
//         window.initVerificationMapCallback = () => {
//           this.verificationMap = new google.maps.Map(mapElement, {
//             zoom: 15,
//             mapTypeId: 'hybrid'
//           });
//           console.log('AttendanceTracker: Map initialized after API load');
//         };
//         document.head.appendChild(script);
//       }
//     } catch (error) {
//       window.general.error('Error initializing verification map', { error: error.message });
//       window.general.showToast({
//         icon: 'error',
//         title: 'Map Error',
//         message: `Failed to initialize map: ${error.message}`,
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Map initialization failed', error);
//     }
//   }

//   async loadGeofenceData() {
//     console.log('AttendanceTracker: Loading geofence data for ID:', this.geofenceId);
//     try {
//       const response = await fetch(`/api/geofence/${this.geofenceId}`);
//       const data = await response.json();
//       if (!response.ok) throw new Error(`Geofence API request failed: ${response.statusText}`);
//       if (data && data.latitude && data.longitude && data.radius && data.geofence_id) {
//         this.currentGeofence = {
//           id: data.geofence_id,
//           lat: parseFloat(data.latitude),
//           lng: parseFloat(data.longitude),
//           radius: parseInt(data.radius),
//           name: data.name || data.location || 'Geofence Location',
//           company_id: data.company_id,
//           branch_id: data.branch_id,
//           allow_picture: data.allow_picture
//         };
//         console.log('AttendanceTracker: Geofence data loaded', this.currentGeofence);
//         if (this.verificationMap) {
//           this.verificationMap.setCenter({ lat: this.currentGeofence.lat, lng: this.currentGeofence.lng });
//           new google.maps.Circle({
//             strokeColor: '#FF0000',
//             strokeOpacity: 0.8,
//             strokeWeight: 2,
//             fillColor: '#FF0000',
//             fillOpacity: 0.35,
//             map: this.verificationMap,
//             center: { lat: this.currentGeofence.lat, lng: this.currentGeofence.lng },
//             radius: this.currentGeofence.radius
//           });
//           new google.maps.Marker({
//             position: { lat: this.currentGeofence.lat, lng: this.currentGeofence.lng },
//             map: this.verificationMap,
//             title: this.currentGeofence.name
//           });
//           console.log('AttendanceTracker: Geofence marker and circle added');
//         }
//       } else {
//         throw new Error('Invalid geofence data');
//       }
//     } catch (error) {
//       window.general.error('Error loading geofence data', { error: error.message });
//       window.general.showToast({
//         icon: 'error',
//         title: 'Data Error',
//         message: `Failed to load geofence data: ${error.message}`,
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Geofence data load failed', error);
//       this.modal?.hide();
//     }
//   }

//   startAttendanceProcess() {
//     console.log('AttendanceTracker: Starting attendance process');
//     if (!this.geofenceId) {
//       window.general.showToast({
//         icon: 'warning',
//         title: 'Geofence Error',
//         message: 'No geofence data available.',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: No geofenceId available');
//       return;
//     }

//     const capturedImageContainer = document.getElementById('capturedImageContainer');
//     const capturePhotoBtn = document.getElementById('capturePhoto');
//     const retakePhotoBtn = document.getElementById('retakePhoto');
//     const submitAttendanceBtn = document.getElementById('submitAttendance');
//     const attendanceStatus = document.getElementById('attendanceStatus');

//     if (!capturedImageContainer || !capturePhotoBtn || !retakePhotoBtn || !submitAttendanceBtn || !attendanceStatus) {
//       window.general.error('Missing required DOM elements');
//       window.general.showToast({
//         icon: 'error',
//         title: 'Configuration Error',
//         message: 'Required DOM elements not found',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Missing DOM elements');
//       return;
//     }

//     capturedImageContainer.style.display = 'none';
//     capturePhotoBtn.style.display = 'block';
//     capturePhotoBtn.disabled = true;
//     retakePhotoBtn.style.display = 'none';
//     submitAttendanceBtn.disabled = true;
//     attendanceStatus.textContent = 'Verifying your location...';
//     console.log('AttendanceTracker: Modal state initialized');

//     this.modal.show();
//     console.log('AttendanceTracker: Modal shown');

//     this.startWebcam();
//     this.verifyLocation();

//     const modalElement = document.getElementById('geofenceModal');
//     if (modalElement) {
//       modalElement.addEventListener('hidden.bs.modal', () => {
//         console.log('AttendanceTracker: Modal hidden, stopping webcam and face detection');
//         this.stopWebcam();
//         this.stopFaceDetection();
//       }, { once: true });
//     }
//   }

//   startWebcam() {
//     console.log('AttendanceTracker: Starting webcam');
//     const video = document.getElementById('attendanceVideo');
//     const attendanceStatus = document.getElementById('attendanceStatus');
//     if (!video || !attendanceStatus) {
//       window.general.error('Video or status element not found');
//       window.general.showToast({
//         icon: 'error',
//         title: 'Webcam Error',
//         message: 'Video element not found',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Missing video or status element');
//       this.modal?.hide();
//       return;
//     }

//     navigator.mediaDevices.getUserMedia({
//       video: {
//         width: { ideal: 640 },
//         height: { ideal: 480 },
//         facingMode: 'user'
//       }
//     })
//       .then(s => {
//         this.stream = s;
//         video.srcObject = s;
//         console.log('AttendanceTracker: Webcam started');
//         this.startFaceDetection();
//       })
//       .catch(err => {
//         attendanceStatus.textContent = 'Error accessing webcam: ' + err.message;
//         window.general.showToast({
//           icon: 'error',
//           title: 'Webcam Error',
//           message: `Failed to access webcam: ${err.message}`,
//           duration: 5000
//         });
//         console.error('AttendanceTracker: Webcam start failed', err);
//         this.modal?.hide();
//       });
//   }

//   stopWebcam() {
//     console.log('AttendanceTracker: Stopping webcam');
//     if (this.stream) {
//       this.stream.getTracks().forEach(track => track.stop());
//       this.stream = null;
//       console.log('AttendanceTracker: Webcam stopped');
//     }
//   }

//   async startFaceDetection() {
//     console.log('AttendanceTracker: Starting face detection');
//     const video = document.getElementById('attendanceVideo');
//     const faceMessage = document.getElementById('faceDetectionMessage');
//     const capturePhotoBtn = document.getElementById('capturePhoto');

//     if (!video || !faceMessage || !capturePhotoBtn) {
//       window.general.error('Missing required elements for face detection');
//       window.general.showToast({
//         icon: 'error',
//         title: 'Configuration Error',
//         message: 'Required elements not found',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Missing face detection elements');
//       return;
//     }

//     await new Promise(resolve => {
//       video.onloadedmetadata = () => {
//         console.log('AttendanceTracker: Video metadata loaded');
//         resolve();
//       };
//     });

//     this.faceDetectionInterval = setInterval(async () => {
//       try {
//         const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
//         if (detections.length > 0) {
//           faceMessage.innerHTML = '<div class="alert alert-success">Face detected</div>';
//           this.faceDetected = true;
//           capturePhotoBtn.disabled = false;
//           console.log('AttendanceTracker: Face detected');
//         } else {
//           faceMessage.innerHTML = '<div class="alert alert-danger">No face detected</div>';
//           this.faceDetected = false;
//           capturePhotoBtn.disabled = true;
//           console.log('AttendanceTracker: No face detected');
//         }
//       } catch (error) {
//         faceMessage.innerHTML = '<div class="alert alert-warning">Face detection error</div>';
//         window.general.error('Face detection error', { error: error.message });
//         console.error('AttendanceTracker: Face detection failed', error);
//       }
//     }, 500);
//   }

//   stopFaceDetection() {
//     console.log('AttendanceTracker: Stopping face detection');
//     if (this.faceDetectionInterval) {
//       clearInterval(this.faceDetectionInterval);
//       this.faceDetectionInterval = null;
//       console.log('AttendanceTracker: Face detection stopped');
//     }
//     const faceMessage = document.getElementById('faceDetectionMessage');
//     if (faceMessage) faceMessage.innerHTML = '';
//   }

//   capturePhoto() {
//     console.log('AttendanceTracker: Capturing photo');
//     const video = document.getElementById('attendanceVideo');
//     const canvas = document.getElementById('attendanceCanvas');
//     const capturedImage = document.getElementById('capturedImage');
//     const capturedImageContainer = document.getElementById('capturedImageContainer');
//     const capturePhotoBtn = document.getElementById('capturePhoto');
//     const retakePhotoBtn = document.getElementById('retakePhoto');
//     const submitAttendanceBtn = document.getElementById('submitAttendance');

//     if (!video || !canvas || !capturedImage || !capturedImageContainer || !capturePhotoBtn || !retakePhotoBtn || !submitAttendanceBtn) {
//       window.general.error('Missing required elements for photo capture');
//       window.general.showToast({
//         icon: 'error',
//         title: 'Configuration Error',
//         message: 'Required elements not found',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Missing photo capture elements');
//       return;
//     }

//     if (!this.currentGeofence.allow_picture) {
//       window.general.showToast({
//         icon: 'warning',
//         title: 'Permission Error',
//         message: 'Photo capture not allowed for this geofence',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Photo capture not allowed');
//       return;
//     }

//     canvas.width = 150;
//     canvas.height = 150;

//     const videoAspect = video.videoWidth / video.videoHeight;
//     const canvasAspect = canvas.width / canvas.height;
//     let drawWidth, drawHeight, offsetX, offsetY;

//     if (videoAspect > canvasAspect) {
//       drawHeight = video.videoHeight;
//       drawWidth = video.videoHeight * canvasAspect;
//       offsetX = (video.videoWidth - drawWidth) / 2;
//       offsetY = 0;
//     } else {
//       drawWidth = video.videoWidth;
//       drawHeight = video.videoWidth / canvasAspect;
//       offsetX = 0;
//       offsetY = (video.videoHeight - drawHeight) / 2;
//     }

//     canvas.getContext('2d').drawImage(
//       video,
//       offsetX, offsetY, drawWidth, drawHeight,
//       0, 0, canvas.width, canvas.height
//     );

//     video.style.display = 'none';
//     capturedImageContainer.style.display = 'block';
//     capturedImage.src = canvas.toDataURL('image/jpeg', 0.7);
//     capturePhotoBtn.style.display = 'none';
//     retakePhotoBtn.style.display = 'block';
//     submitAttendanceBtn.disabled = false;
//     console.log('AttendanceTracker: Photo captured');

//     this.stopFaceDetection();
//   }

//   retakePhoto() {
//     console.log('AttendanceTracker: Retaking photo');
//     const video = document.getElementById('attendanceVideo');
//     const capturedImageContainer = document.getElementById('capturedImageContainer');
//     const capturePhotoBtn = document.getElementById('capturePhoto');
//     const retakePhotoBtn = document.getElementById('retakePhoto');
//     const submitAttendanceBtn = document.getElementById('submitAttendance');

//     if (!video || !capturedImageContainer || !capturePhotoBtn || !retakePhotoBtn || !submitAttendanceBtn) {
//       window.general.error('Missing required elements for photo retake');
//       window.general.showToast({
//         icon: 'error',
//         title: 'Configuration Error',
//         message: 'Required elements not found',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Missing photo retake elements');
//       return;
//     }

//     video.style.display = 'block';
//     capturedImageContainer.style.display = 'none';
//     capturePhotoBtn.style.display = 'block';
//     retakePhotoBtn.style.display = 'none';
//     submitAttendanceBtn.disabled = true;
//     console.log('AttendanceTracker: Photo retake initiated');

//     this.startFaceDetection();
//   }

//   verifyLocation() {
//     console.log('AttendanceTracker: Verifying location');
//     const attendanceStatus = document.getElementById('attendanceStatus');
//     const capturePhotoBtn = document.getElementById('capturePhoto');
//     const submitAttendanceBtn = document.getElementById('submitAttendance');

//     if (!attendanceStatus || !capturePhotoBtn || !submitAttendanceBtn) {
//       window.general.error('Missing required elements for location verification');
//       window.general.showToast({
//         icon: 'error',
//         title: 'Configuration Error',
//         message: 'Required elements not found',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Missing location verification elements');
//       return;
//     }

//     if (!this.currentGeofence) {
//       attendanceStatus.textContent = 'No geofence set';
//       console.error('AttendanceTracker: No geofence set');
//       return;
//     }

//     if (!navigator.geolocation) {
//       attendanceStatus.textContent = 'Geolocation not supported';
//       window.general.showToast({
//         icon: 'error',
//         title: 'Geolocation Error',
//         message: 'Geolocation not supported by browser',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Geolocation not supported');
//       return;
//     }

//     navigator.geolocation.watchPosition(
//       position => {
//         const userLat = position.coords.latitude;
//         const userLng = position.coords.longitude;
//         const distance = this.calculateDistance(
//           userLat, userLng,
//           this.currentGeofence.lat, this.currentGeofence.lng
//         );
//         const isInside = distance <= this.currentGeofence.radius;

//         if (this.verificationMap) {
//           this.verificationMap.setCenter({ lat: userLat, lng: userLng });
//           new google.maps.Marker({
//             position: { lat: userLat, lng: userLng },
//             map: this.verificationMap,
//             title: 'Your position'
//           });
//           console.log('AttendanceTracker: User position marker added', { lat: userLat, lng: userLng });
//         }

//         if (isInside) {
//           attendanceStatus.textContent = `You're at ${this.currentGeofence.name}! Please face the camera.`;
//           this.currentCheck = {
//             type: this.checkType,
//             userPosition: { lat: userLat, lng: userLng },
//             geofence: this.currentGeofence,
//             distance: distance,
//             timestamp: new Date().toISOString()
//           };
//           capturePhotoBtn.disabled = !this.currentGeofence.allow_picture;
//           console.log('AttendanceTracker: User inside geofence', this.currentCheck);
//         } else {
//           attendanceStatus.textContent = `You're ${Math.round(distance)}m away from ${this.currentGeofence.name}.`;
//           capturePhotoBtn.disabled = true;
//           submitAttendanceBtn.disabled = true;
//           console.log('AttendanceTracker: User outside geofence', { distance });
//         }
//       },
//       error => {
//         attendanceStatus.textContent = 'Error getting location: ' + error.message;
//         window.general.showToast({
//           icon: 'error',
//           title: 'Location Error',
//           message: `Failed to get location: ${error.message}`,
//           duration: 5000
//         });
//         console.error('AttendanceTracker: Location verification failed', error);
//         this.modal?.hide();
//       },
//       { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
//     );
//   }

//   async submitAttendance() {
//     console.log('AttendanceTracker: Submitting attendance');
//     const canvas = document.getElementById('attendanceCanvas');
//     const attendanceStatus = document.getElementById('attendanceStatus');

//     if (!canvas || !this.currentCheck || !attendanceStatus) {
//       window.general.error('Missing required elements for submission');
//       window.general.showToast({
//         icon: 'error',
//         title: 'Configuration Error',
//         message: 'Required elements not found',
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Missing submission elements');
//       return;
//     }

//     const photo = this.currentGeofence.allow_picture ? canvas.toDataURL('image/jpeg', 0.7) : null;
//     const record = {
//       ...this.currentCheck,
//       photo,
//       timestamp: new Date().toISOString(),
//       company_id: this.currentGeofence.company_id,
//       branch_id: this.currentGeofence.branch_id
//     };

//     try {
//       const response = await fetch('/api/attendance', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(record)
//       });
//       if (response.ok) {
//         this.attendanceRecords.push(record);
//         attendanceStatus.textContent = `${this.checkType} recorded at ${this.currentGeofence.name} - ${new Date().toLocaleTimeString()}`;
//         console.log('AttendanceTracker: Attendance submitted successfully', record);
//         this.modal.hide();
//       } else {
//         throw new Error(`Attendance submission failed: ${response.statusText}`);
//       }
//     } catch (error) {
//       window.general.error('Error submitting attendance', { error: error.message });
//       window.general.showToast({
//         icon: 'error',
//         title: 'Submission Error',
//         message: `Failed to submit attendance: ${error.message}`,
//         duration: 5000
//       });
//       console.error('AttendanceTracker: Attendance submission failed', error);
//     }
//   }

//   calculateDistance(lat1, lon1, lat2, lon2) {
//     console.log('AttendanceTracker: Calculating distance');
//     const R = 6371e3; // meters
//     const φ1 = lat1 * Math.PI / 180;
//     const φ2 = lat2 * Math.PI / 180;
//     const Δφ = (lat2 - lat1) * Math.PI / 180;
//     const Δλ = (lon2 - lon1) * Math.PI / 180;

//     const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//               Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//     const distance = R * c;
//     console.log('AttendanceTracker: Distance calculated', distance);
//     return distance;
//   }
// }

// // Instantiate and initialize
// const tracker = new AttendanceTracker();
// tracker.init();

// export default AttendanceTracker;