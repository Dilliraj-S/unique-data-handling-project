<?php
namespace App\Http\Helpers;
use Exception;
use App\Facades\Random;
use Illuminate\Support\Facades\{Config, Log};
use Illuminate\Support\Str;
/**
 * Helper class for generating popup form HTML for HRM software with steppers and repeaters.
 */
class PopupHelper
{
    /**
     * Generate form content with predefined fields.
     *
     * @param string $token Skeleton token for validation.
     * @param array $fields Form field definitions.
     * @param string $labelType Label style ('floating' or 'normal').
     * @return string Generated HTML content.
     * @throws Exception If form generation fails.
     */
    public static function generateBuildForm(string $token, array $fields, string $labelType = 'floating'): string
    {
        try {
            $html = sprintf(
                '<input type="hidden" name="save_token" value="%s"><div class="row g-3">',
                htmlspecialchars($token, ENT_QUOTES, 'UTF-8')
            );
            $html .= self::generate($labelType, $fields);
            $html .= '</div>';
            return $html;
        } catch (Exception $e) {
            Log::error('Failed to generate form', ['token' => $token, 'error' => $e->getMessage()]);
            throw new Exception("Failed to generate form: {$e->getMessage()}");
        }
    }
    /**
     * Generate form HTML based on field definitions.
     *
     * @param string $labelType Label style ('floating' or 'normal').
     * @param array $fields Form field definitions.
     * @return string Generated HTML content.
     */
    public static function generate(string $labelType, array $fields): string
    {
        try {
            $labelType = strtolower($labelType) === 'floating' ? 'floating' : 'normal';
            if (empty($fields)) {
                throw new Exception('No fields provided for form generation');
            }
            $html = '';
            foreach ($fields as $index => $field) {
                $html .= self::generateField($field, $labelType, $index);
            }
            return $html;
        } catch (Exception $e) {
            Log::error('Form generation failed', ['error' => $e->getMessage()]);
            return sprintf(
                '<div class="alert alert-danger">Form generation failed: %s</div>',
                htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8')
            );
        }
    }
    /**
     * Generate HTML for a single form field.
     *
     * @param array $field Field definition.
     * @param string $labelType Label style ('floating' or 'normal').
     * @param string $index Field index for error reporting.
     * @return string Generated HTML for the field.
     */
    private static function generateField(array $field, string $labelType, string $index): string
    {
        try {
            if (!isset($field['type'], $field['name'])) {
                throw new Exception("Field at index {$index} missing required 'type' or 'name'");
            }
            $type = $field['type'];
            $name = $field['name'];
            $label = $field['label'] ?? Str::title(str_replace('_', ' ', $name));
            $value = old($name, $field['value'] ?? '');
            $required = $field['required'] ?? false;
            $id = $field['id'] ?? Random::token(Config::get('skeleton.token_length', 16));
            $placeholder = $field['placeholder'] ?? $label;
            $wrapperClasses = array_merge([$labelType === 'floating' ? 'float-input-control' : 'mb-3'], $field['wrapper_class'] ?? []);
            $inputClasses = array_merge(
                [$labelType === 'floating' ? 'form-float-input' : ($type === 'select' || $type === 'multiselect' ? 'form-select' : ($type === 'checkbox' || $type === 'radio' || $type === 'switch' || $type === 'toggle' ? 'form-check-input' : 'form-control'))],
                $field['class'] ?? []
            );
            $labelClasses = array_merge([$labelType === 'floating' ? 'form-float-label' : 'form-label'], $field['label_class'] ?? []);
            $colClasses = self::generateColumnClasses($field['col'] ?? '12');
            $html = sprintf(
                '<div class="%s"><div class="%s">',
                implode(' ', $colClasses),
                implode(' ', $wrapperClasses)
            );
            $attributes = self::buildAttributes($field, $inputClasses, $placeholder);
            switch ($type) {
                // Standard HTML5 Inputs
                case 'label':
                $html .= sprintf(
                    '<label id="%s" class="form-label m-0">%s</label>',
                    htmlspecialchars($id),
                    htmlspecialchars($label ?? '')
                );
                break;
                case 'text':
                case 'password':
                case 'email':
                case 'url':
                case 'tel':
                case 'number':
                case 'date':
                case 'datetime-local':
                case 'time':
                case 'month':
                case 'week':
                case 'color':
                case 'range':
                case 'search':
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="%s" id="%s" name="%s" value="%s" %s>',
                            $type,
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="%s" id="%s" name="%s" value="% Hawkins %s" %s>',
                            $type,
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'textarea':
                    $rows = $field['rows'] ?? 4;
                    $cols = $field['cols'] ?? 50;
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<textarea id="%s" name="%s" rows="%s" cols="%s" %s>%s</textarea>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $rows,
                            $cols,
                            $attributes,
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8')
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<textarea id="%s" name="%s" rows="%s" cols="%s" %s>%s</textarea>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $rows,
                            $cols,
                            $attributes,
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8')
                        );
                    break;
                case 'select':
                case 'multiselect':
                    $multiple = $type === 'multiselect' || (isset($field['attr']['multiple']) && $field['attr']['multiple']);
                    if (!isset($field['options']) || !is_array($field['options'])) {
                        throw new Exception("{$type} field '{$name}' requires options array");
                    }
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<select id="%s" name="%s%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $multiple ? '[]' : '',
                            $attributes
                        ) . self::generateOptions($field['options'], $value, $multiple, $name) . '</select>' . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<select id="%s" name="%s%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $multiple ? '[]' : '',
                            $attributes
                        ) . self::generateOptions($field['options'], $value, $multiple, $name) . '</select>';
                    break;
                case 'checkbox':
                case 'radio':
                    if (!isset($field['options']) || !is_array($field['options'])) {
                        throw new Exception("{$type} field '{$name}' requires options array");
                    }
                    foreach ($field['options'] as $optValue => $optLabel) {
                        $checked = is_array($value)
                            ? in_array((string)$optValue, $value, true)
                            : ((string)$optValue === (string)$value);
                        $optionId = htmlspecialchars($id . '-' . Str::slug($optValue));
                        $html .= sprintf(
                            '<div class="form-check mb-2">
                                <input class="form-check-input" type="%s" id="%s" name="%s" value="%s" %s %s>
                                %s
                            </div>',
                            $type,
                            $optionId,
                            htmlspecialchars($name),
                            htmlspecialchars($optValue),
                            $attributes,
                            $checked ? 'checked' : '',
                            self::generateLabel($optionId, $optLabel, false, ['form-check-label'])
                        );
                    }
                    break;
                case 'file':
                    $accept = $field['accept'] ?? '*/*';
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="file" id="%s" name="%s" accept="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($accept),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="file" id="%s" name="%s" accept="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($accept),
                            $attributes
                        );
                    break;
                case 'file-image':
                    $accept = $field['accept'] ?? 'image/*';
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="file" id="%s" name="%s" accept="%s" %s><img id="%s-preview" class="img-preview mt-2" style="max-width: 100px; display: %s;" src="%s" alt="Image Preview">',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($accept),
                            $attributes,
                            htmlspecialchars($id),
                            $value ? 'block' : 'none',
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8')
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="file" id="%s" name="%s" accept="%s" %s><img id="%s-preview" class="img-preview mt-2" style="max-width: 100px; display: %s;" src="%s" alt="Image Preview">',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($accept),
                            $attributes,
                            htmlspecialchars($id),
                            $value ? 'block' : 'none',
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8')
                        );
                    break;
                case 'hidden':
                    $html .= sprintf(
                        '<input type="hidden" id="%s" name="%s" value="%s" %s>',
                        htmlspecialchars($id),
                        htmlspecialchars($name),
                        htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                        $attributes
                    );
                    break;
                case 'switch':
                case 'toggle':
                    $checked = $value ? 'checked' : '';
                    $html .= sprintf(
                        '<div class="form-check form-switch mb-2">
                            <input type="checkbox" class="form-check-input" id="%s" name="%s" %s %s>
                            %s
                        </div>',
                        htmlspecialchars($id),
                        htmlspecialchars($name),
                        $attributes,
                        $checked,
                        self::generateLabel($id, $label, $required, ['form-check-label'])
                    );
                    break;
                case 'color-picker':
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="color" id="%s" name="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value ?: '#000000', ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="color" id="%s" name="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value ?: '#000000', ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'range-slider':
                    $min = $field['min'] ?? 0;
                    $max = $field['max'] ?? 100;
                    $step = $field['step'] ?? 1;
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="range" id="%s" name="%s" min="%s" max="%s" step="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $min,
                            $max,
                            $step,
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="range" id="%s" name="%s" min="%s" max="%s" step="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $min,
                            $max,
                            $step,
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'autocomplete':
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="text" id="%s" name="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="text" id="%s" name="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'datetime':
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="datetime-local" id="%s" name="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="datetime-local" id="%s" name="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'image':
                    $accept = $field['accept'] ?? 'image/*';
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="file" id="%s" name="%s" accept="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($accept),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="file" id="%s" name="%s" accept="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($accept),
                            $attributes
                        );
                    break;
                case 'submit':
                    $html .= sprintf(
                        '<button type="submit" id="%s" name="%s" class="btn btn-primary" %s>%s</button>',
                        htmlspecialchars($id),
                        htmlspecialchars($name),
                        $attributes,
                        htmlspecialchars($label, ENT_QUOTES, 'UTF-8')
                    );
                    break;
                case 'button':
                    $html .= sprintf(
                        '<button type="button" id="%s" name="%s" class="btn btn-secondary" %s>%s</button>',
                        htmlspecialchars($id),
                        htmlspecialchars($name),
                        $attributes,
                        htmlspecialchars($label, ENT_QUOTES, 'UTF-8')
                    );
                    break;
                case 'reset':
                    $html .= sprintf(
                        '<button type="reset" id="%s" name="%s" class="btn btn-danger" %s>%s</button>',
                        htmlspecialchars($id),
                        htmlspecialchars($name),
                        $attributes,
                        htmlspecialchars($label, ENT_QUOTES, 'UTF-8')
                    );
                    break;
                case 'email-multi':
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="email" id="%s" name="%s" multiple="multiple" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="email" id="%s" name="%s" multiple="multiple" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'tel-intl':
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="tel" id="%s" name="%s" pattern="[0-9]{10,15}" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="tel" id="%s" name="%s" pattern="[0-9]{10,15}" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'number-step':
                    $step = $field['step'] ?? 1;
                    $min = $field['min'] ?? null;
                    $max = $field['max'] ?? null;
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="number" id="%s" name="%s" step="%s"%s%s value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $step,
                            $min !== null ? sprintf(' min="%s"', $min) : '',
                            $max !== null ? sprintf(' max="%s"', $max) : '',
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="number" id="%s" name="%s" step="%s"%s%s value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $step,
                            $min !== null ? sprintf(' min="%s"', $min) : '',
                            $max !== null ? sprintf(' max="%s"', $max) : '',
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'file-multi':
                    $accept = $field['accept'] ?? '*/*';
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="file" id="%s" name="%s[]" multiple="multiple" accept="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($accept),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="file" id="%s" name="%s[]" multiple="multiple" accept="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($accept),
                            $attributes
                        );
                    break;
                case 'date-range':
                    $startId = htmlspecialchars($id . '-start');
                    $endId = htmlspecialchars($id . '-end');
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="date" id="%s" name="%s[start]" value="%s" %s>',
                            $startId,
                            htmlspecialchars($name),
                            htmlspecialchars($value['start'] ?? '', ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($startId, $label . ' Start', $required, $labelClasses) .
                        sprintf(
                            '<input type="date" id="%s" name="%s[end]" value="%s" %s>',
                            $endId,
                            htmlspecialchars($name),
                            htmlspecialchars($value['end'] ?? '', ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($endId, $label . ' End', $required, $labelClasses)
                        : self::generateLabel($startId, $label . ' Start', $required, $labelClasses) . sprintf(
                            '<input type="date" id="%s" name="%s[start]" value="%s" %s>',
                            $startId,
                            htmlspecialchars($name),
                            htmlspecialchars($value['start'] ?? '', ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($endId, $label . ' End', $required, $labelClasses) . sprintf(
                            '<input type="date" id="%s" name="%s[end]" value="%s" %s>',
                            $endId,
                            htmlspecialchars($name),
                            htmlspecialchars($value['end'] ?? '', ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'time-picker':
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="time" id="%s" name="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="time" id="%s" name="%s" value="%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'rating':
                    $maxRating = $field['max'] ?? 5;
                    $html .= sprintf('<div class="rating-group">');
                    for ($i = 1; $i <= $maxRating; $i++) {
                        $optionId = htmlspecialchars($id . '-' . $i);
                        $checked = ((string)$i === (string)$value) ? 'checked' : '';
                        $html .= sprintf(
                            '<input type="radio" id="%s" name="%s" value="%s" class="form-check-input" %s %s>%s',
                            $optionId,
                            htmlspecialchars($name),
                            $i,
                            $attributes,
                            $checked,
                            self::generateLabel($optionId, "★", false, ['form-check-label'])
                        );
                    }
                    $html .= '</div>' . self::generateLabel($id, $label, $required, $labelClasses);
                    break;
                case 'tags':
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<input type="text" id="%s" name="%s" value="%s" data-tags="true" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars(is_array($value) ? implode(',', $value) : $value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<input type="text" id="%s" name="%s" value="%s" data-tags="true" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            htmlspecialchars(is_array($value) ? implode(',', $value) : $value, ENT_QUOTES, 'UTF-8'),
                            $attributes
                        );
                    break;
                case 'richtext':
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<textarea id="%s" name="%s" rows="%s" cols="%s" data-richtext="true" %s>%s</textarea>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $field['rows'] ?? 6,
                            $field['cols'] ?? 50,
                            $attributes,
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8')
                        ) . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<textarea id="%s" name="%s" rows="%s" cols="%s" data-richtext="true" %s>%s</textarea>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $field['rows'] ?? 6,
                            $field['cols'] ?? 50,
                            $attributes,
                            htmlspecialchars($value, ENT_QUOTES, 'UTF-8')
                        );
                    break;
                case 'select-optgroup':
                    if (!isset($field['optgroups']) || !is_array($field['optgroups'])) {
                        throw new Exception("Select-optgroup field '{$name}' requires optgroups array");
                    }
                    $multiple = isset($field['attr']['multiple']) && $field['attr']['multiple'];
                    $html .= $labelType === 'floating'
                        ? sprintf(
                            '<select id="%s" name="%s%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $multiple ? '[]' : '',
                            $attributes
                        ) . self::generateOptgroups($field['optgroups'], $value, $multiple, $name) . '</select>' . self::generateLabel($id, $label, $required, $labelClasses)
                        : self::generateLabel($id, $label, $required, $labelClasses) . sprintf(
                            '<select id="%s" name="%s%s" %s>',
                            htmlspecialchars($id),
                            htmlspecialchars($name),
                            $multiple ? '[]' : '',
                            $attributes
                        ) . self::generateOptgroups($field['optgroups'], $value, $multiple, $name) . '</select>';
                    break;
                case 'repeater':
                    if (!isset($field['fields']) || !is_array($field['fields'])) {
                        throw new Exception("Repeater field '{$name}' requires fields array");
                    }
                    $html .= sprintf('<div class="repeater-group" data-repeater="%s">', htmlspecialchars($name));
                    $values = is_array($value) && !empty($value) ? $value : [[]];
                    foreach ($values as $repIndex => $repValue) {
                        $html .= sprintf('<div class="repeater-item" data-repeater-index="%s">', $repIndex);
                        foreach ($field['fields'] as $subFieldIndex => $subField) {
                            $subFieldName = sprintf('%s[%s][%s]', $name, $repIndex, $subField['name']);
                            $subField['name'] = $subFieldName;
                            $subField['value'] = $repValue[$subField['name']] ?? (is_array($repValue) && isset($repValue[$subField['name']]) ? $repValue[$subField['name']] : '');
                            $subField['id'] = sprintf('%s-%s-%s', $id, $repIndex, $subField['name']);
                            $html .= self::generateField($subField, $labelType, $index . '-' . $repIndex . '-' . $subFieldIndex);
                        }
                        $html .= sprintf('<button type="button" class="btn btn-danger repeater-remove mt-2">Remove %s</button>', htmlspecialchars($label));
                        $html .= '</div>';
                    }
                    $html .= sprintf('<button type="button" class="btn btn-primary repeater-add mt-2">Add %s</button>', htmlspecialchars($label));
                    $html .= '</div>' . self::generateLabel($id, $label, $required, $labelClasses);
                    break;
                case 'stepper':
                    $steps = $field['steps'] ?? [];
                    if (empty($steps)) {
                        throw new Exception("Stepper field '{$name}' requires steps array");
                    }
                    $html .= sprintf('<div class="stepper" data-stepper="%s">', htmlspecialchars($name));
                    $html .= '<div class="stepper-nav mb-3 d-flex justify-content-between">';
                    foreach ($steps as $stepIndex => $step) {
                        $active = $stepIndex === 0 ? 'active' : '';
                        $html .= sprintf(
                            '<div class="stepper-step %s" data-step="%s" style="cursor: pointer;">%s</div>',
                            $active,
                            $stepIndex,
                            htmlspecialchars($step['label'] ?? 'Step ' . ($stepIndex + 1))
                        );
                    }
                    $html .= '</div>';
                    foreach ($steps as $stepIndex => $step) {
                        $display = $stepIndex === 0 ? 'block' : 'none';
                        $html .= sprintf('<div class="stepper-content" data-step-content="%s" style="display: %s;">', $stepIndex, $display);
                        foreach ($step['fields'] as $subFieldIndex => $subField) {
                            $subFieldName = sprintf('%s[%s][%s]', $name, $stepIndex, $subField['name']);
                            $subField['name'] = $subFieldName;
                            $subField['value'] = isset($value[$stepIndex][$subField['name']]) ? $value[$stepIndex][$subField['name']] : (isset($value[$subField['name']]) ? $value[$subField['name']] : '');
                            $subField['id'] = sprintf('%s-%s-%s', $id, $stepIndex, $subField['name']);
                            $html .= self::generateField($subField, $labelType, $index . '-' . $stepIndex . '-' . $subFieldIndex);
                        }
                        $html .= '</div>';
                    }
                    $html .= sprintf(
                        '<div class="stepper-controls mt-3"><button type="button" class="btn btn-secondary stepper-prev" %s>Previous</button><button type="button" class="btn btn-primary stepper-next">Next</button></div>',
                        $stepIndex === 0 ? 'disabled' : ''
                    );
                    $html .= '</div>';
                    break;
                default:
                    throw new Exception("Unsupported field type '{$type}' for field '{$name}'");
            }
            return $html . '</div></div>';
        } catch (Exception $e) {
            Log::warning('Field generation failed', ['index' => $index, 'field' => $field['name'] ?? 'unknown', 'error' => $e->getMessage()]);
            return sprintf(
                '<div class="col-12"><div class="alert alert-warning">Field generation failed: %s</div></div>',
                htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8')
            );
        }
    }
    /**
     * Generate label HTML for a field.
     *
     * @param string $id Field ID.
     * @param string $label Label text.
     * @param bool $required Whether the field is required.
     * @param array $classes CSS classes for the label.
     * @return string Generated label HTML.
     */
    private static function generateLabel(string $id, string $label, bool $required, array $classes): string
    {
        return sprintf(
            '<label for="%s" class="%s">%s%s</label>',
            htmlspecialchars($id),
            implode(' ', array_map('htmlspecialchars', $classes)),
            htmlspecialchars($label, ENT_QUOTES, 'UTF-8'),
            $required ? '<span class="text-danger">*</span>' : ''
        );
    }
    /**
     * Generate options HTML for a select field.
     *
     * @param array $options Options array.
     * @param mixed $selectedValue Selected value(s).
     * @param bool $multiple Whether the select is multiple.
     * @param string $fieldName Field name for debugging.
     * @return string Generated options HTML.
     */
    private static function generateOptions(array $options, $selectedValue, bool $multiple, string $fieldName): string
    {
        $html = '';
        $selectedValues = $multiple ? (array)$selectedValue : [(string)$selectedValue];
        foreach ($options as $value => $option) {
            $text = is_array($option) ? ($option[0] ?? $option['text'] ?? $value) : $option;
            $isSelected = in_array((string)$value, array_map('strval', $selectedValues), true);
            $html .= sprintf(
                '<option value="%s" %s>%s</option>',
                htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                $isSelected ? 'selected' : '',
                htmlspecialchars($text, ENT_QUOTES, 'UTF-8')
            );
        }
        return $html;
    }
    /**
     * Generate optgroups HTML for a select field.
     *
     * @param array $optgroups Optgroups array.
     * @param mixed $selectedValue Selected value(s).
     * @param bool $multiple Whether the select is multiple.
     * @param string $fieldName Field name for debugging.
     * @return string Generated optgroups HTML.
     */
    private static function generateOptgroups(array $optgroups, $selectedValue, bool $multiple, string $fieldName): string
    {
        $html = '';
        $selectedValues = $multiple ? (array)$selectedValue : [(string)$selectedValue];
        foreach ($optgroups as $groupLabel => $options) {
            $html .= sprintf('<optgroup label="%s">', htmlspecialchars($groupLabel));
            foreach ($options as $value => $text) {
                $isSelected = in_array((string)$value, array_map('strval', $selectedValues), true);
                $html .= sprintf(
                    '<option value="%s" %s>%s</option>',
                    htmlspecialchars($value, ENT_QUOTES, 'UTF-8'),
                    $isSelected ? 'selected' : '',
                    htmlspecialchars($text, ENT_QUOTES, 'UTF-8')
                );
            }
            $html .= '</optgroup>';
        }
        return $html;
    }
    /**
     * Build HTML attributes for a field.
     *
     * @param array $field Field definition.
     * @param array $inputClasses CSS classes for the input.
     * @param string $placeholder Placeholder text.
     * @return string Generated attributes string.
     */
    private static function buildAttributes(array $field, array $inputClasses, string $placeholder): string
    {
        $attrs = [];
        if (!empty($inputClasses)) {
            $attrs[] = sprintf('class="%s"', implode(' ', array_map('htmlspecialchars', $inputClasses)));
        }
        if ($field['required'] ?? false) {
            $attrs[] = 'required';
        }
        if ($placeholder && $placeholder !== 'none') {
            $attrs[] = sprintf('placeholder="%s"', htmlspecialchars($placeholder, ENT_QUOTES, 'UTF-8'));
        }
        if (isset($field['pattern'])) {
            $attrs[] = sprintf('pattern="%s"', htmlspecialchars($field['pattern'], ENT_QUOTES, 'UTF-8'));
        }
        if (isset($field['minlength'])) {
            $attrs[] = sprintf('minlength="%s"', htmlspecialchars($field['minlength'], ENT_QUOTES, 'UTF-8'));
        }
        if (isset($field['maxlength'])) {
            $attrs[] = sprintf('maxlength="%s"', htmlspecialchars($field['maxlength'], ENT_QUOTES, 'UTF-8'));
        }
        if (isset($field['validate'])) {
            $attrs[] = sprintf('data-validate="%s"', htmlspecialchars($field['validate'], ENT_QUOTES, 'UTF-8'));
        }
        if (isset($field['attr']) && is_array($field['attr'])) {
            foreach ($field['attr'] as $key => $val) {
                if ($key === 'multiple' && $val) {
                    $attrs[] = 'multiple';
                } else {
                    $attrs[] = sprintf(
                        '%s="%s"',
                        htmlspecialchars($key),
                        htmlspecialchars(is_array($val) ? json_encode($val) : (string)$val, ENT_QUOTES, 'UTF-8')
                    );
                }
            }
        }
        return implode(' ', $attrs);
    }
    /**
     * Generate column classes based on column size.
     *
     * @param mixed $col Column size (1-12).
     * @return array Array of column classes.
     */
    private static function generateColumnClasses($col): array
    {
        $breakpoints = ['sm', 'md', 'lg', 'xl'];
        $colClasses = [];
        if (is_numeric($col) && ($size = (int)$col) >= 1 && $size <= 12) {
            foreach ($breakpoints as $breakpoint) {
                $colClasses[] = "col-{$breakpoint}-{$size}";
            }
        } else {
            $colClasses[] = 'col-12';
        }
        return $colClasses;
    }
}
