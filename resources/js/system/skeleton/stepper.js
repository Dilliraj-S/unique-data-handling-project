/**
 * Module for handling multiple steppers and repeaters in backend-generated (PopupHelper) and static (Blade) forms.
 * Optimized for performance and dynamic value updates.
 */

/**
 * Debounce utility to prevent excessive function calls.
 * @param {Function} func - Function to debounce.
 * @param {number} wait - Wait time in milliseconds.
 * @returns {Function}
 */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Initialize image preview for file inputs.
 * @param {HTMLElement} [context=document] - The context to search for inputs.
 */
function imagePreview(context = document) {
    context.querySelectorAll('input[type="file"][accept*="image"]:not([data-preview-initialized])').forEach(input => {
        input.dataset.previewInitialized = true;
        input.addEventListener('change', e => {
            const file = e.target.files[0];
            const preview = document.getElementById(input.id + '-preview');
            if (file && preview) {
                const reader = new FileReader();
                reader.onload = e => {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    });
}

/**
 * Initialize repeater functionality.
 * @param {HTMLElement} [context=document] - The context to search for repeaters.
 */
function repeater(context = document) {
    const initializeRepeater = () => {
        context.querySelectorAll('.repeater-group:not([data-repeater-initialized])').forEach(group => {
            group.dataset.repeaterInitialized = true;
            const repeaterName = group.dataset.repeater;
            if (!repeaterName) return;

            const addBtn = group.querySelector('.repeater-add.btn.btn-primary');
            if (!addBtn) return;

            const populateRepeaterData = debounce(data => {
                try {
                    if (!Array.isArray(data) || data.length === 0) return;

                    // Batch DOM updates
                    const fragment = document.createDocumentFragment();
                    const items = Array.from(group.querySelectorAll('.repeater-item'));
                    items.slice(1).forEach(item => item.remove());

                    data.forEach((itemData, index) => {
                        const item = index === 0 ? items[0] : items[0].cloneNode(true);
                        item.setAttribute('data-repeater-index', index);
                        item.querySelectorAll('[name]').forEach(input => {
                            const fieldName = input.name.match(/\[([^\]]+)\]$/)?.[1];
                            if (fieldName && itemData[fieldName] !== undefined) {
                                input.value = itemData[fieldName];
                                if (input.dataset.select === 'dropdown') {
                                    $(input).val(itemData[fieldName]).trigger('change');
                                }
                                if (input.type === 'file' && input.accept.includes('image')) {
                                    const preview = document.getElementById(input.id + '-preview');
                                    if (preview && itemData[fieldName]) {
                                        preview.src = itemData[fieldName];
                                        preview.style.display = 'block';
                                    }
                                }
                            }
                            if (index !== 0) {
                                input.name = input.name.replace(/\[(\d+)\]/, `[${index}]`);
                                input.id = input.id.replace(/-\d+-/, `-${index}-`);
                                if (input.classList.contains('select2-hidden-accessible')) {
                                    $(input).select2('destroy');
                                }
                            }
                        });
                        if (index !== 0) fragment.appendChild(item);
                    });

                    if (fragment.childNodes.length) group.insertBefore(fragment, addBtn);

                    window.skeleton?.select?.(group);
                    window.skeleton?.unique?.(group);
                    imagePreview(group);
                } catch (e) {
                    window.general?.error?.(`Failed to populate repeater ${repeaterName}:`, e);
                }
            }, 100);

            // Handle remove buttons
            const updateRemoveButtons = () => {
                group.querySelectorAll('.repeater-remove.btn.btn-danger').forEach(btn => {
                    btn.removeEventListener('click', btn._removeHandler); // Remove existing handlers
                    btn._removeHandler = () => {
                        if (group.querySelectorAll('.repeater-item').length > 1) {
                            btn.closest('.repeater-item').remove();
                            window.skeleton?.select?.(group);
                            window.skeleton?.unique?.(group);
                            imagePreview(group);
                        }
                    };
                    btn.addEventListener('click', btn._removeHandler);
                });
            };

            // Handle add button
            addBtn.addEventListener('click', () => {
                const items = group.querySelectorAll('.repeater-item');
                const template = items[0].cloneNode(true);
                const newIndex = items.length;

                template.setAttribute('data-repeater-index', newIndex);
                template.querySelectorAll('[name]').forEach(input => {
                    input.name = input.name.replace(/\[(\d+)\]/, `[${newIndex}]`);
                    input.id = input.id.replace(/-\d+-/, `-${newIndex}-`);
                    input.value = '';
                    if (input.type === 'file') {
                        const preview = template.querySelector(`#${input.id}-preview`);
                        if (preview) {
                            preview.src = '';
                            preview.style.display = 'none';
                        }
                    }
                    if (input.classList.contains('select2-hidden-accessible')) {
                        $(input).select2('destroy');
                    }
                });

                group.insertBefore(template, addBtn);
                updateRemoveButtons();
                window.skeleton?.select?.(group);
                window.skeleton?.unique?.(group);
                imagePreview(group);
            });

            // Initialize remove buttons
            updateRemoveButtons();

            // Populate initial data
            if (group.dataset.value) {
                try {
                    const data = JSON.parse(group.dataset.value);
                    populateRepeaterData(data);
                } catch (e) {
                    window.general?.error?.(`Failed to parse data-value for repeater ${repeaterName}:`, e);
                }
            }

            // Observe data-value changes
            const observer = new MutationObserver(debounce(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName === 'data-value') {
                        try {
                            const data = JSON.parse(group.dataset.value);
                            populateRepeaterData(data);
                        } catch (e) {
                            window.general?.error?.(`Failed to update repeater ${repeaterName}:`, e);
                        }
                    }
                });
            }, 100));
            observer.observe(group, { attributes: true });
        });
    };

    // Retry initialization using requestAnimationFrame
    const retryInitialize = (attempts = 3) => {
        if (context.querySelector('.repeater-group')) {
            initializeRepeater();
        } else if (attempts > 0) {
            requestAnimationFrame(() => retryInitialize(attempts - 1));
        }
    };
    requestAnimationFrame(() => retryInitialize());
}

/**
 * Initialize stepper functionality.
 * @param {HTMLElement} [context=document] - The context to search for steppers.
 */
function stepper(context = document) {
    const initializeStepper = () => {
        context.querySelectorAll('.stepper:not([data-stepper-initialized])').forEach(stepper => {
            stepper.dataset.stepperInitialized = true;
            const stepperName = stepper.dataset.stepper;
            if (!stepperName) return;

            const steps = stepper.querySelectorAll('.stepper-step');
            const contents = stepper.querySelectorAll('.stepper-content');
            const prevBtn = stepper.querySelector('.stepper-prev.btn.btn-secondary');
            const nextBtn = stepper.querySelector('.stepper-next.btn.btn-primary');
            const dataStorage = stepper.dataset.storage || 'json';
            let currentStep = 0;

            const updateStep = () => {
                steps.forEach((step, index) => {
                    step.classList.toggle('active', index === currentStep);
                    step.classList.toggle('text-primary', index === currentStep);
                    step.classList.toggle('text-muted', index !== currentStep);
                    contents[index].style.display = index === currentStep ? 'block' : 'none';
                });
                if (prevBtn) prevBtn.disabled = currentStep === 0;
                if (nextBtn) nextBtn.disabled = currentStep === steps.length - 1;
                window.skeleton?.select?.(contents[currentStep]);
                window.skeleton?.unique?.(contents[currentStep]);
                imagePreview(contents[currentStep]);
                repeater(contents[currentStep]);
            };

            const populateStepperData = debounce(data => {
                try {
                    if (dataStorage === 'json' && Array.isArray(data)) {
                        contents.forEach((content, stepIndex) => {
                            content.querySelectorAll('[name]').forEach(input => {
                                const fieldName = input.name.match(/\[([^\]]+)\]$/)?.[1];
                                if (fieldName && data[stepIndex] && data[stepIndex][fieldName] !== undefined) {
                                    input.value = data[stepIndex][fieldName];
                                    if (input.dataset.select === 'dropdown') {
                                        $(input).val(data[stepIndex][fieldName]).trigger('change');
                                    }
                                    if (input.type === 'file' && input.accept.includes('image')) {
                                        const preview = document.getElementById(input.id + '-preview');
                                        if (preview && data[stepIndex][fieldName]) {
                                            preview.src = data[stepIndex][fieldName];
                                            preview.style.display = 'block';
                                        }
                                    }
                                }
                            });
                            repeater(content);
                        });
                    } else if (dataStorage === 'columns' && data) {
                        contents.forEach(content => {
                            content.querySelectorAll('[name]').forEach(input => {
                                const fieldName = input.name;
                                if (data[fieldName] !== undefined) {
                                    input.value = data[fieldName];
                                    if (input.dataset.select === 'dropdown') {
                                        $(input).val(data[fieldName]).trigger('change');
                                    }
                                    if (input.type === 'file' && input.accept.includes('image')) {
                                        const preview = document.getElementById(input.id + '-preview');
                                        if (preview && data[fieldName]) {
                                            preview.src = data[fieldName];
                                            preview.style.display = 'block';
                                        }
                                    }
                                }
                            });
                            repeater(content);
                        });
                    }
                    window.skeleton?.select?.(stepper);
                    window.skeleton?.unique?.(stepper);
                    imagePreview(stepper);
                } catch (e) {
                    window.general?.error?.(`Failed to populate stepper ${stepperName}:`, e);
                }
            }, 100);

            // Initialize step navigation
            steps.forEach((step, index) => {
                step.removeEventListener('click', step._clickHandler); // Remove existing handlers
                step._clickHandler = () => {
                    currentStep = index;
                    updateStep();
                };
                step.addEventListener('click', step._clickHandler);
            });

            if (prevBtn) {
                prevBtn.removeEventListener('click', prevBtn._clickHandler);
                prevBtn._clickHandler = () => {
                    if (currentStep > 0) {
                        currentStep--;
                        updateStep();
                    }
                };
                prevBtn.addEventListener('click', prevBtn._clickHandler);
            }

            if (nextBtn) {
                nextBtn.removeEventListener('click', nextBtn._clickHandler);
                nextBtn._clickHandler = () => {
                    if (currentStep < steps.length - 1) {
                        currentStep++;
                        updateStep();
                    }
                };
                nextBtn.addEventListener('click', nextBtn._clickHandler);
            }

            // Populate initial data
            if (stepper.dataset.value) {
                try {
                    const data = JSON.parse(stepper.dataset.value);
                    populateStepperData(data);
                } catch (e) {
                    window.general?.error?.(`Failed to parse data-value for stepper ${stepperName}:`, e);
                }
            }

            // Observe data-value changes
            const observer = new MutationObserver(debounce(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName === 'data-value') {
                        try {
                            const data = JSON.parse(stepper.dataset.value);
                            populateStepperData(data);
                        } catch (e) {
                            window.general?.error?.(`Failed to update stepper ${stepperName}:`, e);
                        }
                    }
                });
            }, 100));
            observer.observe(stepper, { attributes: true });

            updateStep();
        });
    };

    // Retry initialization using requestAnimationFrame
    const retryInitialize = (attempts = 3) => {
        if (context.querySelector('.stepper')) {
            initializeStepper();
        } else if (attempts > 0) {
            requestAnimationFrame(() => retryInitialize(attempts - 1));
        }
    };
    requestAnimationFrame(() => retryInitialize());
}

/**
 * Initialize select fields (Select2 integration).
 * @param {HTMLElement} [context=document] - The context to search for selects.
 */
function select(context = document) {
    context.querySelectorAll('select[data-select="dropdown"]:not(.select2-hidden-accessible)').forEach(select => {
        $(select).select2({ width: '100%' });
        if (select.dataset.value) {
            try {
                const value = JSON.parse(select.dataset.value);
                $(select).val(value).trigger('change');
            } catch (e) {
                window.general?.error?.(`Failed to parse data-value for select ${select.name}:`, e);
            }
        }
    });
}

export { stepper, repeater, imagePreview, select };