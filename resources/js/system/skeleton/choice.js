// resources/js/utils/choices.js or similar

import Choices from 'choices.js';
import 'choices.js/public/assets/styles/choices.min.css';

export function choiceSelect() {
    document.querySelectorAll('.choice-select').forEach(selectEl => {
        const token = selectEl.dataset.token;

        // Initialize Choices
        const choices = new Choices(selectEl, {
            removeItemButton: true,
            shouldSort: false,
            placeholderValue: 'Select columns...',
            searchEnabled: true,
            itemSelectText: '',
        });

        // 🟢 Attach the instance for later access
        selectEl._choicesInstance = choices;

        // Add Select All checkbox
        const dropdown = selectEl.closest('.choices').querySelector('.choices__list--dropdown');
        const selectAllId = `select-all-${token}`;

        const selectAllDiv = document.createElement('div');
        selectAllDiv.className = 'choices__item choices__item--selectable';
        selectAllDiv.innerHTML = `
            <input type="checkbox" id="${selectAllId}" />
            <label for="${selectAllId}" style="margin-left: 5px;">Select All</label>
        `;
        dropdown.prepend(selectAllDiv);

        document.getElementById(selectAllId).addEventListener('change', function () {
            if (this.checked) {
                choices.setChoiceByValue([...selectEl.options].map(opt => opt.value));
            } else {
                choices.removeActiveItems();
            }
        });
    });
}


