// import Cropper from 'cropperjs';

// export function image() {
//   const defaultImage = '/path/to/default-image.jpg';
//   document.querySelectorAll('input[type="hidden"][data-image]').forEach((hiddenInput) => {
//     const type = hiddenInput.getAttribute('data-image');
//     switch (type) {
//       case 'image':
//         setupSingleImage(hiddenInput, defaultImage);
//         break;
//       case 'attachments':
//         setupMultipleAttachments(hiddenInput, defaultImage);
//         break;
//       case 'crop-image':
//         setupImageCropper(hiddenInput, defaultImage);
//         break;
//     }
//   });
// }

// function setupSingleImage(hiddenInput, defaultImage) {
//   const container = document.createElement('div');
//   container.innerHTML = `
//     <div class="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
//       <div class="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
//         <img src="${defaultImage}" alt="preview" class="image-preview w-100 h-100 rounded-circle" style="object-fit: cover;">
//       </div>
//       <div class="profile-upload">
//         <div class="mb-2">
//           <h6 class="mb-1">Profile Photo</h6>
//           <p class="fs-12">Recommended image size is 40px x 40px</p>
//         </div>
//         <div class="profile-uploader d-flex align-items-center">
//           <label class="drag-upload-btn btn btn-sm btn-primary me-2">
//             Upload
//             <input type="file" class="form-control file-input" name="image" hidden accept="image/png, image/jpeg">
//           </label>
//           <a href="javascript:void(0);" class="btn btn-light btn-sm reset-button">Cancel</a>
//         </div>
//       </div>
//     </div>
//   `;
//   hiddenInput.parentNode.insertBefore(container, hiddenInput.nextSibling);
//   const input = container.querySelector('.file-input');
//   const preview = container.querySelector('.image-preview');
//   const resetBtn = container.querySelector('.reset-button');
//   input.addEventListener('change', (e) => {
//     const file = e.target.files[0];
//     if (file && file.size <= 2 * 1024 * 1024) {
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         preview.src = event.target.result;
//         hiddenInput.value = file.name;
//       };
//       reader.readAsDataURL(file);
//     }
//   });
//   resetBtn.addEventListener('click', () => {
//     preview.src = defaultImage;
//     input.value = '';
//     hiddenInput.value = '';
//   });
// }

// function setupMultipleAttachments(hiddenInput, defaultImage) {
//   const count = parseInt(hiddenInput.getAttribute('data-attachment')) || 1;
//   let pathNames = [];
//   const container = document.createElement('div');
//   container.innerHTML = `
//     <div class="flex-container center-content gap-4 my-3">
//       <div class="preview-container d-flex justify-content-center gap-4"></div>
//       <div class="button-container">
//         <label class="btn btn-primary btn-sm me-2 mb-3 upload-label">
//           <span class="hidden-sm">Upload Attachments</span>
//           <i class="mdi mdi-tray-arrow-up show-sm"></i>
//           <input type="file" class="file-input" name="attachment_images[]" hidden accept="image/png, image/jpeg" multiple>
//         </label>
//         <div class="small-text">Allowed JPG, GIF or PNG. Max size of 2MB each. Max ${count} files</div>
//       </div>
//     </div>
//   `;
//   hiddenInput.parentNode.insertBefore(container, hiddenInput.nextSibling);
//   const input = container.querySelector('.file-input');
//   const previewContainer = container.querySelector('.preview-container');
//   input.addEventListener('change', (e) => {
//     const files = Array.from(e.target.files).slice(0, count);
//     previewContainer.innerHTML = '';
//     pathNames = [];
//     files.forEach((file, index) => {
//       if (file.size <= 2 * 1024 * 1024) {
//         const reader = new FileReader();
//         reader.onload = (event) => {
//           const attachmentItem = document.createElement('div');
//           attachmentItem.className = 'position-relative';
//           attachmentItem.innerHTML = `
//             <img src="${event.target.result}" alt="preview" class="image-preview w-px-100 h-px-100 rounded">
//             <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"><i class="fa fa-times"></i></button>
//           `;
//           const cancelBtn = attachmentItem.querySelector('.btn-danger');
//           cancelBtn.addEventListener('click', (e) => {
//             e.preventDefault();
//             attachmentItem.remove();
//             const dt = new DataTransfer();
//             Array.from(input.files).forEach((f) => {
//               if (f !== file) dt.items.add(f);
//             });
//             input.files = dt.files;
//             pathNames[index] = null;
//             hiddenInput.value = JSON.stringify(pathNames.filter(Boolean));
//             if (previewContainer.children.length === 0) input.value = '';
//           });
//           previewContainer.appendChild(attachmentItem);
//         };
//         reader.readAsDataURL(file);
//         pathNames[index] = file.name;
//       }
//     });
//     hiddenInput.value = JSON.stringify(pathNames.filter(Boolean));
//   });
// }

// function setupImageCropper(hiddenInput, defaultImage) {
//   const container = document.createElement('div');
//   container.innerHTML = `
//     <div class="cropper-container flex-container center-content gap-4 my-3" style="position: relative; overflow: hidden;">
//       <img class="croppie-preview" src="${defaultImage}" alt="preview" style="max-width: 100%; max-height: 300px;">
//       <div class="button-container">
//         <label class="btn btn-primary btn-sm me-2 mb-3 upload-label">
//           <span class="hidden-sm">Upload</span>
//           <input type="file" class="file-input" hidden accept="image/png, image/jpeg">
//         </label>
//         <button type="button" class="btn btn-success btn-sm mb-3 crop-button" style="display: none;">Crop</button>
//       </div>
//     </div>
//   `;
//   hiddenInput.parentNode.insertBefore(container, hiddenInput.nextSibling);
//   const input = container.querySelector('.file-input');
//   const preview = container.querySelector('.croppie-preview');
//   const cropBtn = container.querySelector('.crop-button');
//   const cropperContainer = container.querySelector('.cropper-container');
//   const modalWidth = cropperContainer.parentElement.offsetWidth || 300;
//   const boundaryHeight = 300;
//   const boundaryWidth = Math.min(modalWidth, 400);
//   let cropper = new Cropper(preview, {
//     aspectRatio: NaN,
//     viewMode: 1,
//     movable: true,
//     zoomable: true,
//     rotatable: true,
//     scalable: true,
//     autoCropArea: 0.8,
//     minContainerWidth: boundaryWidth,
//     minContainerHeight: boundaryHeight,
//     cropBoxMovable: true,
//     cropBoxResizable: true,
//   });
//   input.addEventListener('change', (e) => {
//     const file = e.target.files[0];
//     if (file && file.size <= 2 * 1024 * 1024) {
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         preview.src = event.target.result;
//         hiddenInput.value = file.name;
//         cropper.destroy();
//         cropper = new Cropper(preview, {
//           aspectRatio: NaN,
//           viewMode: 1,
//           movable: true,
//           zoomable: true,
//           rotatable: true,
//           scalable: true,
//           autoCropArea: 0.8,
//           minContainerWidth: boundaryWidth,
//           minContainerHeight: boundaryHeight,
//           cropBoxMovable: true,
//           cropBoxResizable: true,
//           ready: () => {
//             cropBtn.style.display = 'block';
//           },
//         });
//       };
//       reader.readAsDataURL(file);
//     }
//   });
//   cropBtn.addEventListener('click', (e) => {
//     e.preventDefault();
//     const dataUrl = cropper.getCroppedCanvas({
//       width: 500,
//       height: 500,
//       minWidth: 500,
//       minHeight: 500,
//       maxWidth: 1000,
//       maxHeight: 1000,
//       fillColor: '#fff',
//       imageSmoothingEnabled: true,
//       imageSmoothingQuality: 'high',
//     }).toDataURL('image/png', 1);
//     preview.src = dataUrl;
//     preview.style.maxWidth = '100px';
//     preview.style.maxHeight = '100px';
//     preview.style.objectFit = 'cover';
//     cropBtn.style.display = 'none';
//     hiddenInput.value = dataUrl;
//     cropper.destroy();
//   });
//   const resizeObserver = new ResizeObserver(() => {
//     const newWidth = cropperContainer.parentElement.offsetWidth || 300;
//     cropper.options.minContainerWidth = Math.min(newWidth, 400);
//     cropper.reset();
//   });
//   resizeObserver.observe(cropperContainer.parentElement);
// }