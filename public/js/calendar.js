/* ==============================================
   Bridges Pulse — Deloitte Monthly Calendar
   calendar.js
   ============================================== */

'use strict';

// ── Constants ──────────────────────────────────
const MONTH_NAMES = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
];

// ── Calendar Event Data ────────────────────────
// Keys: "YYYY-MM-DD"  |  Values: string[]
const calendarEvents = {
    // June 2026
    '2026-06-01': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-02': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-03': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-04': ['Daily Batch, Issuance, Mass Update and Send process.', 'RD-1010 Packet'],
    '2026-06-05': ['Daily Batch, Issuance, Mass Update and Send process.', 'CDC, SER, SDA Payroll'],
    '2026-06-06': ['Daily Batch, Issuance, Mass Update and Send process.', 'RD-1010 Packet'],
    '2026-06-07': ['Maintenance'],
    '2026-06-08': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-09': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-10': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-11': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-12': ['Daily Batch, Issuance, Mass Update and Send process.', 'CDC, SER, SDA Payroll'],
    '2026-06-13': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-14': ['Maintenance'],
    '2026-06-15': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-16': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-17': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-18': ['Daily Batch, Issuance, Mass Update and Send process.', 'Negative Action Date'],
    '2026-06-19': ['Holiday Batch'],
    '2026-06-20': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-21': ['Maintenance'],
    '2026-06-22': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-23': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-24': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-25': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-26': ['Daily Batch, Issuance, Mass Update and Send process.', 'CDC, SER, SDA Payroll'],
    '2026-06-27': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-28': ['Maintenance'],
    '2026-06-29': ['Daily Batch, Issuance, Mass Update and Send process.'],
    '2026-06-30': ['Daily Batch, Issuance, Mass Update and Send process.', 'BI Cut Off Date'],
};

// ── Helpers ────────────────────────────────────
function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function firstWeekdayOfMonth(year, month) {
    return new Date(year, month, 1).getDay(); // 0=Sun … 6=Sat
}

function zeroPad(n) {
    return String(n).padStart(2, '0');
}

// ── Render Calendar ────────────────────────────
function renderCalendar(year, month, keyDates) {
    const titleEl = document.getElementById('cal-title-text');
    const tbody   = document.getElementById('cal-tbody');

    if (!titleEl || !tbody) return;

    keyDates = keyDates || { negativeAction: null, maCutoff: null, biCutoff: null, redet: null, holidays: [] };

    const monthName = MONTH_NAMES[month];
    titleEl.innerHTML = `Monthly Calendar &ndash; ${monthName.toUpperCase()} ${year}`;

    const totalDays  = daysInMonth(year, month);
    const startDay   = firstWeekdayOfMonth(year, month);
    const totalCells = Math.ceil((startDay + totalDays) / 7) * 7;

    tbody.innerHTML = '';

    for (let cell = 0; cell < totalCells; cell += 7) {
        const dateRow    = document.createElement('tr');
        dateRow.classList.add('cal-date-row');
        const contentRow = document.createElement('tr');
        contentRow.classList.add('cal-content-row');

        let rowHasDate = false;

        for (let col = 0; col < 7; col++) {
            const dayNum    = cell + col - startDay + 1;
            const dateTd    = document.createElement('td');
            const contentTd = document.createElement('td');

            if (dayNum < 1 || dayNum > totalDays) {
                dateTd.classList.add('cal-empty');
                contentTd.classList.add('cal-empty');
            } else {
                rowHasDate = true;
                dateTd.classList.add('cal-has-date');

                const numSpan = document.createElement('span');
                numSpan.className = 'cal-day-num';
                numSpan.textContent = dayNum;
                dateTd.appendChild(numSpan);

                contentTd.classList.add('cal-content-cell');

                const dateKey      = `${year}-${zeroPad(month + 1)}-${zeroPad(dayNum)}`;
                const isSunday     = col === 0;
                const isHoliday    = keyDates.holidays.includes(dateKey);
                const contentItems = [];

                if (isSunday) {
                    contentItems.push('Maintenance');
                } else if (isHoliday) {
                    contentItems.push('Holiday Batch');
                } else {
                    contentItems.push('Daily Batch, Issuance, Mass Update and Send process');
                    if (col === 5)                             contentItems.push('CDC, SER, SDA Payroll');
                    if (keyDates.negativeAction === dateKey)   contentItems.push('Negative Action Date');
                    if (keyDates.maCutoff       === dateKey)   contentItems.push('MA Card Cutoff Date');
                    if (keyDates.biCutoff       === dateKey)   contentItems.push('BI Cut Off Date');
                    if (keyDates.redet          === dateKey)   contentItems.push('Redet Schedule Date');
                }

                if (contentItems.length > 0) {
                    const ul = document.createElement('ul');
                    ul.className = 'cal-events';
                    contentItems.forEach(function (text) {
                        const li = document.createElement('li');
                        li.textContent = text;
                        ul.appendChild(li);
                    });
                    contentTd.appendChild(ul);
                }
            }

            dateRow.appendChild(dateTd);
            contentRow.appendChild(contentTd);
        }

        if (rowHasDate) {
            tbody.appendChild(dateRow);
            tbody.appendChild(contentRow);
        }
    }
}

// ── Collect Key Dates from inputs ─────────────
function collectKeyDates() {
    function val(id) {
        var el = document.getElementById(id);
        return (el && el.value) ? el.value : null;
    }
    var holidays = Array.from(
        document.querySelectorAll('.cal-holiday-chip')
    ).map(function (chip) { return chip.dataset.date; }).filter(Boolean);

    return {
        negativeAction: val('kd-negative-action'),
        maCutoff:       val('kd-ma-cutoff'),
        biCutoff:       val('kd-bi-cutoff'),
        redet:          val('kd-redet'),
        holidays:       holidays
    };
}

// ── Populate Year Selector ─────────────────────
function populateYearSelect() {
    const yearSelect = document.getElementById('year-select');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const startYear   = currentYear - 2;
    const endYear     = currentYear + 3;

    for (let y = startYear; y <= endYear; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

// ── Sync month/year selectors to current date ──
// Only overrides if the HTML default has no events defined for that month/year.
function syncMonthSelect() {
    const monthSelect = document.getElementById('month-select');
    if (!monthSelect) return;
    // Keep the HTML-selected month (June 2026) as the default;
    // do NOT override to the current calendar month.
}

// ── Export as Image ────────────────────────────
function exportAsImage(year, month) {
    const printArea = document.getElementById('calendar-print-area');
    if (!printArea || typeof html2canvas === 'undefined') {
        alert('Export library not loaded. Please check your connection.');
        return;
    }

    const btn = document.getElementById('export-image-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>Generating…</span>';
    btn.disabled = true;

    html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
    }).then(function (canvas) {
        const link = document.createElement('a');
        const monthName = MONTH_NAMES[month];
        link.download = `Deloitte_Monthly_Calendar_${monthName}_${year}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(function (err) {
        console.error('Export failed:', err);
        alert('Export failed. Please try again.');
    }).finally(function () {
        btn.innerHTML = originalText;
        btn.disabled = false;
        if (window.feather) feather.replace();
    });
}

// ── Print / PDF ────────────────────────────────
function printCalendar() {
    window.print();
}

// ── Live Clock ─────────────────────────────────
function updateClock() {
    const el = document.getElementById('current-time');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// ── Theme Toggle ───────────────────────────────
function initThemeToggle() {
    const btn   = document.getElementById('theme-toggle');
    const icon  = document.getElementById('theme-icon');
    const body  = document.body;

    const saved = localStorage.getItem('bp-theme') || 'light';
    body.className = `theme-${saved}`;
    updateThemeIcon(saved, icon);

    if (!btn) return;
    btn.addEventListener('click', function () {
        const isDark = body.classList.contains('theme-dark');
        const next   = isDark ? 'light' : 'dark';
        body.className = `theme-${next}`;
        localStorage.setItem('bp-theme', next);
        updateThemeIcon(next, icon);
        if (window.feather) feather.replace();
    });
}

function updateThemeIcon(theme, iconEl) {
    if (!iconEl) return;
    iconEl.setAttribute('data-feather', theme === 'dark' ? 'moon' : 'sun');
    if (window.feather) feather.replace();
}

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    populateYearSelect();
    syncMonthSelect();

    const monthSelect = document.getElementById('month-select');
    const yearSelect  = document.getElementById('year-select');
    const generateBtn = document.getElementById('generate-btn');
    const exportImgBtn = document.getElementById('export-image-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    function getSelected() {
        return {
            month: parseInt(monthSelect.value, 10),
            year:  parseInt(yearSelect.value, 10)
        };
    }

    function zeroPad2(n) { return String(n).padStart(2, '0'); }

    function syncDateInputsToMonth() {
        const { year, month } = getSelected();
        const minVal = `${year}-${zeroPad2(month + 1)}-01`;
        const maxVal = `${year}-${zeroPad2(month + 1)}-${zeroPad2(new Date(year, month + 1, 0).getDate())}`;

        // Clear holiday chips when month changes
        const chipsContainer = document.getElementById('holidays-chips');
        if (chipsContainer) chipsContainer.innerHTML = '';

        // Clear any key date inputs that fall outside the new month
        [
            document.getElementById('kd-negative-action'),
            document.getElementById('kd-ma-cutoff'),
            document.getElementById('kd-bi-cutoff'),
            document.getElementById('kd-redet'),
            document.getElementById('holiday-date-input')
        ].forEach(function (inp) {
            if (!inp) return;
            if (inp.value && (inp.value < minVal || inp.value > maxVal)) {
                inp.value = '';
            }
        });
    }

    // Set min on mousedown so picker opens at selected month, remove after to keep mm/dd/yyyy placeholder
    [
        document.getElementById('kd-negative-action'),
        document.getElementById('kd-ma-cutoff'),
        document.getElementById('kd-bi-cutoff'),
        document.getElementById('kd-redet'),
        document.getElementById('holiday-date-input')
    ].forEach(function (inp) {
        if (!inp) return;
        inp.addEventListener('mousedown', function () {
            const { year, month } = getSelected();
            inp.min = `${year}-${zeroPad2(month + 1)}-01`;
        });
        inp.addEventListener('change', function () { inp.removeAttribute('min'); });
        inp.addEventListener('blur',   function () { inp.removeAttribute('min'); });
    });

    // Initial render
    const init = getSelected();
    syncDateInputsToMonth();
    renderCalendar(init.year, init.month, collectKeyDates());

    // Generate button
    if (generateBtn) {
        generateBtn.addEventListener('click', function () {
            const sel = getSelected();
            renderCalendar(sel.year, sel.month, collectKeyDates());
        });
    }

    // Also regenerate on select change
    [monthSelect, yearSelect].forEach(function (sel) {
        if (sel) {
            sel.addEventListener('change', function () {
                const s = getSelected();
                syncDateInputsToMonth();
                renderCalendar(s.year, s.month, collectKeyDates());
            });
        }
    });

    // Add Holiday button
    const addHolidayBtn = document.getElementById('add-holiday-btn');
    if (addHolidayBtn) {
        addHolidayBtn.addEventListener('click', function () {
            const inp   = document.getElementById('holiday-date-input');
            const chips = document.getElementById('holidays-chips');
            if (!inp || !chips || !inp.value) return;

            // Format date as "Mon DD"
            var parts = inp.value.split('-');
            var d     = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            var label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            // Build chip
            var chip = document.createElement('span');
            chip.className   = 'cal-holiday-chip';
            chip.dataset.date = inp.value;
            chip.innerHTML   = label +
                ' <button class="cal-chip-remove" title="Remove" aria-label="Remove holiday">&times;</button>';

            chip.querySelector('.cal-chip-remove').addEventListener('click', function () {
                chip.remove();
            });

            chips.appendChild(chip);
            inp.value = '';
            if (window.feather) feather.replace();
        });
    }

    // Export as Image
    if (exportImgBtn) {
        exportImgBtn.addEventListener('click', function () {
            const sel = getSelected();
            exportAsImage(sel.year, sel.month);
        });
    }

    // Print / PDF
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', printCalendar);
    }

    // Clock
    updateClock();
    setInterval(updateClock, 1000);

    // Theme
    initThemeToggle();

    // Key Dates Help Modal
    const kdModal     = document.getElementById('key-dates-modal');
    const kdOpenBtn   = document.getElementById('key-dates-help-btn');
    const kdCloseBtn  = document.getElementById('key-dates-modal-close');

    function buildKdQueries() {
        const { year, month } = getSelected();
        const lastDay  = new Date(year, month + 1, 0).getDate();
        const startStr = `${zeroPad2(month + 1)}/01/${year}`;
        const endStr   = `${zeroPad2(month + 1)}/${zeroPad2(lastDay)}/${year}`;
        const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' });

        const periodLabel = document.getElementById('kdhelp-period-label');
        if (periodLabel) periodLabel.textContent = `${monthName} ${year}`;

        const allDates = document.getElementById('q-all-keydates');
        if (allDates) {
            allDates.textContent =
`SET SERVEROUTPUT ON;

DECLARE
    v_start_date DATE := TO_DATE('${startStr}', 'MM/DD/YYYY');
    v_end_date   DATE := TO_DATE('${endStr}',   'MM/DD/YYYY');
BEGIN
    DBMS_OUTPUT.PUT_LINE('--- Negative Action Date ---');

    FOR r IN (
        SELECT NEGACTIONDATE AS result_value
        FROM rt_ednegactiondate_mv
        WHERE TO_DATE(TRIM(NEGACTIONDATE), 'YYYY-MM-DD') >= v_start_date
          AND TO_DATE(TRIM(NEGACTIONDATE), 'YYYY-MM-DD') <  v_end_date + 1
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(r.result_value);
    END LOOP;

    DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- MA Card Cutoff Date ---');

    FOR r IN (
        SELECT MACUTOFFDATE AS result_value
        FROM rt_EDMACARDCUTOFF_mv
        WHERE TO_DATE(TRIM(MACUTOFFDATE), 'YYYY-MM-DD') >= v_start_date
          AND TO_DATE(TRIM(MACUTOFFDATE), 'YYYY-MM-DD') <  v_end_date + 1
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(r.result_value);
    END LOOP;

    DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- BI Cutoff Date ---');

    FOR r IN (
        SELECT DESCRIPTION AS result_value
        FROM RT_BICUTOFFDATE_MV
        WHERE TO_DATE(TRIM(DESCRIPTION), 'MM/DD/YYYY') >= v_start_date
          AND TO_DATE(TRIM(DESCRIPTION), 'MM/DD/YYYY') <  v_end_date + 1
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(r.result_value);
    END LOOP;

    DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- Redet Schedule Date ---');

    FOR r IN (
        SELECT DESCRIPTION AS result_value
        FROM RT_REDETSCHEDULE_MV
        WHERE TO_DATE(TRIM(DESCRIPTION), 'MM/DD/YYYY') >= v_start_date
          AND TO_DATE(TRIM(DESCRIPTION), 'MM/DD/YYYY') <  v_end_date + 1
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(r.result_value);
    END LOOP;

    DBMS_OUTPUT.PUT_LINE(CHR(10) || '--- Holiday Dates ---');

    FOR r IN (
        SELECT CODE AS result_value
        FROM RT_HOLIDAY_MV
        WHERE TO_DATE(TRIM(CODE), 'MM/DD/YYYY') >= v_start_date
          AND TO_DATE(TRIM(CODE), 'MM/DD/YYYY') <  v_end_date + 1
    ) LOOP
        DBMS_OUTPUT.PUT_LINE(r.result_value);
    END LOOP;
END;
/`;
        }
    }

    function openKdModal()  {
        if (!kdModal) return;
        buildKdQueries();
        kdModal.hidden = false;
        if (window.feather) feather.replace();
    }
    function closeKdModal() { if (kdModal) kdModal.hidden = true; }

    if (kdOpenBtn)  kdOpenBtn.addEventListener('click', openKdModal);
    if (kdCloseBtn) kdCloseBtn.addEventListener('click', closeKdModal);

    if (kdModal) {
        kdModal.addEventListener('click', function (e) {
            if (e.target === kdModal) closeKdModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !kdModal.hidden) closeKdModal();
        });

        // Copy buttons
        kdModal.addEventListener('click', function (e) {
            const btn = e.target.closest('.kdhelp-copy-btn');
            if (!btn) return;
            const block = btn.closest('.kdhelp-query-block');
            const code  = block ? block.querySelector('code') : null;
            if (!code) return;
            navigator.clipboard.writeText(code.textContent.trim()).then(function () {
                const orig = btn.innerHTML;
                btn.innerHTML = '<i data-feather="check"></i> Copied!';
                if (window.feather) feather.replace();
                setTimeout(function () { btn.innerHTML = orig; if (window.feather) feather.replace(); }, 2000);
            });
        });
    }

    // Init icons
    if (window.feather) feather.replace();
});
