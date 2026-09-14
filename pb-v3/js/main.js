"use strict";

/* Статическая версия: отправка через FormSubmit, адрес получателя — в index.html. */
const FORM_SETTINGS = {
    maxFileBytes: 10 * 1024 * 1024
};

document.documentElement.classList.add("js-enabled");

setupMobileMenu();
setupImageSlots();
setupCaseDialogs();
setupPracticeExamples();
setupContactForm();

/* Шапка и мобильное меню */
function setupMobileMenu() {
    const header = document.querySelector(".header");
    const button = document.querySelector(".menu-button");
    const menu = document.querySelector("#mobile-nav");

    if (!header || !button || !menu) return;
    button.hidden = false;

    function setOpen(open) {
        menu.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
        button.textContent = open ? "×" : "☰";
    }

    function updateHeader() {
        header.classList.toggle("scrolled", window.scrollY > 20);
    }

    button.addEventListener("click", () => setOpen(menu.hidden));
    menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => setOpen(false));
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !menu.hidden) {
            setOpen(false);
            button.focus();
        }
    });
    window.addEventListener("resize", () => {
        if (window.innerWidth > 950) setOpen(false);
    });
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();
}

/*
 * Фотографии: достаточно положить hero.jpg и about.jpg в images/.
 * При отсутствии файла заглушка остается, сломанная картинка не показывается.
 */
function setupImageSlots() {
    document.querySelectorAll("[data-image-slot]").forEach((slot) => {
        const image = slot.querySelector("img[data-src]");
        const placeholder = slot.querySelector(".image-placeholder");
        if (!image) return;

        image.addEventListener("load", () => {
            image.hidden = false;
            slot.classList.add("has-image");
            if (placeholder) placeholder.hidden = true;
        });
        image.addEventListener("error", () => {
            image.hidden = true;
            slot.classList.remove("has-image");
            if (placeholder) placeholder.hidden = false;
        });
        image.src = image.dataset.src;
    });
}

/* Нативные диалоги: браузер обеспечивает Escape и удержание фокуса. */
function setupCaseDialogs() {
    document.querySelectorAll("[data-dialog]").forEach((button) => {
        const dialog = document.getElementById(button.dataset.dialog);
        if (!dialog) return;

        button.addEventListener("click", () => dialog.showModal());
        dialog.querySelector("[data-close-dialog]")?.addEventListener("click", () => {
            dialog.close();
        });
        dialog.addEventListener("close", () => button.focus());
    });
}

/*
 * Направление → форма → редактируемый пример.
 * Автоматически заменяем только пустое поле или неизмененный прошлый пример.
 * Собственный текст посетителя никогда не перезаписываем автоматически.
 */
function setupPracticeExamples() {
    const message = document.getElementById("message");
    const practice = document.getElementById("practice");
    const status = document.getElementById("example-status");
    const preview = document.getElementById("example-preview");
    const previewText = document.getElementById("example-text");
    const applyButton = document.getElementById("apply-example");
    const undoButton = document.getElementById("undo-example");
    if (!message || typeof PRACTICE_EXAMPLES === "undefined") return;

    let lastInserted = "";
    let previousValue = "";
    let previousPractice = "";
    let selectedExample = null;
    let selectedKey = "";

    function insertExample(example, key) {
        previousValue = message.value;
        previousPractice = practice.value;
        message.value = example.text;
        practice.value = key;
        lastInserted = example.text;
        preview.hidden = true;
        preview.open = false;
        undoButton.hidden = false;
        status.textContent = `Добавлен пример: ${example.title}. Отредактируйте его под свою ситуацию.`;
        message.focus({ preventScroll: true });
        message.setSelectionRange(0, 0);
        message.dispatchEvent(new Event("input", { bubbles: true }));
    }

    document.querySelectorAll("[data-practice]").forEach((link) => {
        link.addEventListener("click", (event) => {
            // Ctrl/Cmd/Shift-клик сохраняет стандартное поведение ссылки.
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const key = link.dataset.practice;
            const example = PRACTICE_EXAMPLES[key];
            if (!example) return;

            selectedExample = example;
            selectedKey = key;
            if (!message.value.trim() || message.value === lastInserted) {
                insertExample(example, key);
            } else {
                // Текст и связанное с ним направление сохраняются до явной замены.
                previewText.textContent = example.text;
                preview.hidden = false;
                preview.open = true;
                status.textContent = `Ваш текст сохранен. Ниже пример по направлению «${example.title}».`;
                message.focus({ preventScroll: true });
            }
            // href="#request" прокручивает к форме и работает без JavaScript.
        });
    });

    applyButton.addEventListener("click", () => {
        if (selectedExample) insertExample(selectedExample, selectedKey);
    });

    undoButton.addEventListener("click", () => {
        message.value = previousValue;
        practice.value = previousPractice;
        lastInserted = "";
        undoButton.hidden = true;
        status.textContent = "Подстановка отменена.";
        message.focus({ preventScroll: true });
    });

    message.addEventListener("input", () => {
        // После ручной правки отмена подстановки не должна стереть новые слова.
        if (message.value !== lastInserted) undoButton.hidden = true;
    });
}

/* Проверка полей и подключаемая отправка обращения */
function setupContactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const button = document.getElementById("submit-request");
    const status = document.getElementById("form-status");
    const fileStatus = document.getElementById("file-status");
    const contact = document.getElementById("contact");
    const fileInput = document.getElementById("document");
    const notice = document.getElementById("intake-notice");
    let pending = false;

    // JS включен: кнопку можно нажать для проверки заполнения формы.
    button.disabled = false;


    function showStatus(text, isError = false) {
        status.textContent = text;
        status.classList.toggle("is-error", isError);
    }

    function validateContact() {
        const value = contact.value.trim();
        const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phone = /^\+?[\d\s()-]{7,30}$/;
        const digits = value.replace(/\D/g, "");
        const valid = email.test(value) || (phone.test(value) && digits.length >= 7);
        contact.setCustomValidity(valid || !value ? "" : "Укажите телефон или email.");
    }

    function validateFile() {
        const file = fileInput.files[0];
        let error = "";
        if (file && !/\.(pdf|doc|docx)$/i.test(file.name)) {
            error = "Выберите документ PDF, DOC или DOCX.";
        } else if (file && file.size > FORM_SETTINGS.maxFileBytes) {
            error = "Размер файла не должен превышать 10 МБ.";
        }
        fileInput.setCustomValidity(error);
        fileStatus.textContent = error || (file ? `Выбран файл: ${file.name}` : "");
        return !error;
    }

    contact.addEventListener("input", validateContact);
    fileInput.addEventListener("change", validateFile);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (pending) return;
        validateContact();
        validateFile();
        if (!form.reportValidity()) return;

        // Обычная HTML-отправка поддерживает вложения и проверку reCAPTCHA.
        // Не показываем локальное «отправлено»: результат сообщает сервис.
        if (!/^https?:$/.test(window.location.protocol)) {
            showStatus("Для отправки откройте сайт по адресу хостинга, а не как файл на компьютере.", true);
            return;
        }
        const replyTo = document.getElementById("reply-to");
        replyTo.value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.value.trim()) ? contact.value.trim() : "";
        replyTo.disabled = !replyTo.value;
        pending = true;
        button.disabled = true;
        button.textContent = "Переходим к отправке…";
        HTMLFormElement.prototype.submit.call(form);
    });
    window.addEventListener("pageshow", () => {
        pending = false;
        button.disabled = false;
        button.textContent = "Отправить запрос";
    });
}
