
// ======================================
// SKYWORTH SOLAR CALCULATOR
// HOUSE / SHOP / FACTORY
// ======================================

// HOUSE - ORIGINAL RATES
const TENAGA_RATE = 0.2703;
const KAPASITI_RATE = 0.0455;
const RANGKAIAN_RATE = 0.1285;
const AFA_RATE = 0.038;
const KWTBB_RATE = 0.016;

// NON-DOMESTIC GENERAL
// Base tariff assumptions - verify for quotations.
const NON_DOMESTIC = {
    LV: {
        energy: 0.2703,
        capacity: 0.0883,
        network: 0.1482,
        retail: 20
    },
    MV: {
        energy: 0.2983,
        capacity: 29.43,
        network: 59.84,
        retail: 200
    }
};

// ======================================
// FORMAT AND INPUT
// ======================================

function round2(value) {
    return Math.round(
        (value + Number.EPSILON) * 100
    ) / 100;
}

function formatRM(value) {
    return "RM " + round2(value).toLocaleString(
        "en-MY", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

function formatKWh(value) {
    return value.toFixed(2) + " kWh";
}

function numeric(id) {
    const el = document.getElementById(id);

    if (!el || el.value.trim() === "") return 0;

    const value = Number(el.value);

    return Number.isFinite(value) && value >= 0
        ? value
        : 0;
}

function signedNumeric(id) {
    const el = document.getElementById(id);

    if (!el || el.value.trim() === "") return 0;

    const value = Number(el.value);

    return Number.isFinite(value) ? value : 0;
}

function detail(label, value) {
    return `<p>${label}<span>${value}</span></p>`;
}

function resultCard(title, subtitle, total, details) {
    return `
        <article class="result-card">
            <h3>${title}</h3>
            <p>${subtitle}</p>
            <h2>${formatRM(total)}</h2>
            <div class="details">${details}</div>
        </article>
    `;
}

function savingCard(title, saving) {
    return `
        <div class="saving-card">
            <h3>${title}</h3>
            <h2>${formatRM(saving)}</h2>
        </div>
    `;
}

// ======================================
// HOUSE ICT TABLE
// ======================================

function getICTRate(usage) {
    if (usage <= 0) return 0;
    if (usage <= 200) return 25.00;
    if (usage <= 250) return 24.50;
    if (usage <= 300) return 22.50;
    if (usage <= 350) return 21.00;
    if (usage <= 400) return 17.00;
    if (usage <= 450) return 14.50;
    if (usage <= 500) return 12.00;
    if (usage <= 550) return 10.50;
    if (usage <= 600) return 9.00;
    if (usage <= 650) return 7.50;
    if (usage <= 700) return 5.50;
    if (usage <= 750) return 4.50;
    if (usage <= 800) return 4.00;
    if (usage <= 850) return 2.50;
    if (usage <= 900) return 1.00;
    if (usage <= 1000) return 0.50;

    return 0;
}

// ======================================
// HOUSE CHARGES
// ======================================

function calculateCharges(usage) {
    return {
        tenaga: usage * TENAGA_RATE,
        kapasiti: usage * KAPASITI_RATE,
        rangkaian: usage * RANGKAIAN_RATE,
        afa: usage > 800
            ? usage * AFA_RATE
            : 0
    };
}

function calculateICT(usage) {
    const ictRate = getICTRate(usage);

    return {
        ictRate,
        ictDiscount: round2(
            usage * ictRate / 100
        )
    };
}

function calculateBeforeSolar(usage) {
    const charges = calculateCharges(usage);
    const ict = calculateICT(usage);

    const total = Math.max(
        0,
        charges.tenaga +
        charges.kapasiti +
        charges.rangkaian +
        charges.afa -
        ict.ictDiscount
    );

    return {
        usage,
        ...charges,
        ...ict,
        total
    };
}

// ======================================
// HOUSE SOLAR - ORIGINAL MODEL
// ======================================

function calculateSolar(usage, batteryCount) {
    const nightUsage = usage * 0.60;
    const batteryDeduction = batteryCount * 450;

    const remainingUsage = Math.max(
        0,
        nightUsage - batteryDeduction
    );

    const charges = calculateCharges(remainingUsage);
    const ict = calculateICT(remainingUsage);

    const currentUsageCharge = round2(
        charges.tenaga +
        charges.kapasiti +
        charges.rangkaian +
        charges.afa -
        ict.ictDiscount
    );

    const kwtbb = round2(
        Math.max(0, currentUsageCharge) * KWTBB_RATE
    );

    const eligibleExportKWh = remainingUsage;

    const atapCredit = round2(
        eligibleExportKWh * TENAGA_RATE
    );

    const pelarasanInsentif = round2(
        eligibleExportKWh * ict.ictRate / 100
    );

    const beforeATAP = Math.max(
        0,
        round2(currentUsageCharge + kwtbb)
    );

    const afterATAP = Math.max(
        0,
        round2(
            currentUsageCharge +
            kwtbb -
            atapCredit +
            pelarasanInsentif
        )
    );

    return {
        nightUsage,
        batteryDeduction,
        remainingUsage,
        eligibleExportKWh,
        ...charges,
        ...ict,
        currentUsageCharge,
        kwtbb,
        atapCredit,
        pelarasanInsentif,
        beforeATAP,
        afterATAP
    };
}

// ======================================
// HOUSE CARDS
// ======================================

function houseBeforeCard(d) {
    const details =
        detail("Jumlah Penggunaan", formatKWh(d.usage)) +
        detail("Tenaga", formatRM(d.tenaga)) +
        detail("Kapasiti", formatRM(d.kapasiti)) +
        detail("Caj Rangkaian", formatRM(d.rangkaian)) +
        detail("AFA", formatRM(d.afa)) +
        detail(
            "ICT Rate",
            d.ictRate.toFixed(2) + " sen/kWh"
        ) +
        detail(
            "ICT Discount",
            "- " + formatRM(d.ictDiscount)
        );

    return resultCard(
        "Sebelum Pasang",
        "Before Solar Installation",
        d.total,
        details
    );
}

function houseSolarCard(d, count) {
    const titles = [
        "Tidak Battery",
        "Ada 1 Battery",
        "Ada 2 Batteries"
    ];

    const subtitles = [
        "Solar Without Battery",
        "Solar With 16 kWh Battery",
        "Solar With 32 kWh Battery"
    ];

    let details = "";

    if (count > 0) {
        details += detail(
            "Battery Deduction",
            formatKWh(d.batteryDeduction)
        );
    }

    details +=
        detail(
            count === 0
                ? "Malam Usage (60%)"
                : "Remaining Usage",
            formatKWh(d.remainingUsage)
        ) +
        detail("Tenaga", formatRM(d.tenaga)) +
        detail("Kapasiti", formatRM(d.kapasiti)) +
        detail("Caj Rangkaian", formatRM(d.rangkaian)) +
        detail("AFA", formatRM(d.afa)) +
        detail(
            "ICT Rate",
            d.ictRate.toFixed(2) + " sen/kWh"
        ) +
        detail(
            "ICT Discount",
            "- " + formatRM(d.ictDiscount)
        ) +
        detail("KWTBB (1.6%)", formatRM(d.kwtbb)) +
        detail(
            "Eligible Export Usage",
            formatKWh(d.eligibleExportKWh)
        ) +
        detail(
            "Kredit ATAP Suria",
            "- " + formatRM(d.atapCredit)
        ) +
        detail(
            "Pelarasan Insentif",
            "+ " + formatRM(d.pelarasanInsentif)
        ) +
        detail(
            "Sebelum ATAP Suria",
            formatRM(d.beforeATAP)
        ) +
        detail(
            "Selepas ATAP Suria",
            formatRM(d.afterATAP)
        );

    return resultCard(
        titles[count],
        subtitles[count],
        d.afterATAP,
        details
    );
}

// ======================================
// HOUSE MAIN
// ======================================

function calculateAll() {
    const usage = numeric("jumlah");
    const before = calculateBeforeSolar(usage);

    let results = houseBeforeCard(before);
    let savings = "";

    const names = [
        "No Battery",
        "1 Battery",
        "2 Batteries"
    ];

    for (let count = 0; count <= 2; count++) {
        const solar = calculateSolar(usage, count);

        results += houseSolarCard(solar, count);

        const saving = Math.max(
            0,
            before.total - solar.afterATAP
        );

        savings += savingCard(
            names[count],
            saving
        );
    }

    document.getElementById(
        "houseResults"
    ).innerHTML = results;

    document.getElementById(
        "houseSavings"
    ).innerHTML = savings;
}

// ======================================
// NON-DOMESTIC AFA
// ======================================

function updateAFAMode(type) {
    const split = document.getElementById(
        type + "AFAMode"
    ).value === "split";

    document.getElementById(
        type + "SplitAFAGroup"
    ).hidden = !split;

    document.getElementById(
        type + "SingleAFAGroup"
    ).hidden = split;

    calculateNonDomestic(type);
}

function getAFAConfig(type, usage) {
    const mode = document.getElementById(
        type + "AFAMode"
    ).value;

    if (mode === "single") {
        return {
            valid: true,
            rate: signedNumeric(type + "AFARate"),
            mode: "single"
        };
    }

    const usage1 = numeric(type + "AFA1Usage");
    const usage2 = numeric(type + "AFA2Usage");

    const rate1 = signedNumeric(type + "AFA1Rate");
    const rate2 = signedNumeric(type + "AFA2Rate");

    const valid = Math.abs(
        usage1 + usage2 - usage
    ) < 0.001;

    return {
        valid,
        mode: "split",
        usage1,
        usage2,
        rate1,
        rate2
    };
}

function calculateAFA(usage, originalUsage, config) {
    if (config.mode === "single") {
        return usage * config.rate;
    }

    if (originalUsage <= 0) return 0;

    const proportion = usage / originalUsage;

    return (
        config.usage1 * proportion * config.rate1 +
        config.usage2 * proportion * config.rate2
    );
}

// ======================================
// NON-DOMESTIC BILL
// ======================================

function nonDomesticBill(
    usage, md, voltage, originalUsage, afaConfig
) {
    const rate = NON_DOMESTIC[voltage];

    const tenaga = round2(
        usage * rate.energy
    );

    const kapasiti = round2(
        (voltage === "LV" ? usage : md) *
        rate.capacity
    );

    const rangkaian = round2(
        (voltage === "LV" ? usage : md) *
        rate.network
    );

    const afa = round2(
        calculateAFA(
            usage,
            originalUsage,
            afaConfig
        )
    );

    const retail = rate.retail;

    // Estimation based on the supplied
    // October 2026 LV shop bill:
    // KWTBB on base variable charges,
    // excluding AFA and retail.
    const baseVariable =
        usage * rate.energy +
        (voltage === "LV" ? usage : md) *
        (rate.capacity + rate.network);

    const kwtbb = round2(
        Math.max(0, baseVariable) * 0.016
    );

    const total = round2(
        tenaga +
        kapasiti +
        rangkaian +
        afa +
        retail +
        kwtbb
    );

    return {
        usage,
        md,
        tenaga,
        kapasiti,
        rangkaian,
        afa,
        retail,
        kwtbb,
        total
    };
}

// ======================================
// NON-DOMESTIC CARDS
// ======================================

function nonDomesticCard(
    title, subtitle, bill, voltage, batteryCount
) {
    let details = "";

    if (batteryCount > 0) {
        details += detail(
            "Battery Deduction",
            formatKWh(batteryCount * 450)
        );
    }

    details += detail(
        "Jumlah Penggunaan",
        formatKWh(bill.usage)
    );

    if (voltage === "MV") {
        details += detail(
            "Maximum Demand",
            bill.md.toFixed(2) + " kW"
        );
    }

    details +=
        detail("Tenaga", formatRM(bill.tenaga)) +
        detail("AFA", formatRM(bill.afa)) +
        detail("Kapasiti", formatRM(bill.kapasiti)) +
        detail(
            "Caj Rangkaian",
            formatRM(bill.rangkaian)
        ) +
        detail(
            "Caj Peruncitan",
            formatRM(bill.retail)
        ) +
        detail(
            "KWTBB (1.6%)",
            formatRM(bill.kwtbb)
        ) +
        detail(
            "Caj Semasa (Estimated)",
            formatRM(bill.total)
        );

    return resultCard(
        title,
        subtitle,
        bill.total,
        details
    );
}

// ======================================
// SHOP / FACTORY MAIN
// ======================================

function calculateNonDomestic(type) {
    const usage = numeric(type + "Usage");

    const voltage = document.getElementById(
        type + "Voltage"
    ).value;

    const md = numeric(type + "MD");

    document.getElementById(
        type + "MDGroup"
    ).hidden = voltage !== "MV";

    const afaConfig = getAFAConfig(
        type, usage
    );

    const warning = document.getElementById(
        type + "AFAWarning"
    );

    if (!afaConfig.valid) {
        warning.textContent =
            "AFA Period 1 + Period 2 usage must equal " +
            usage.toFixed(2) + " kWh.";

        document.getElementById(
            type + "Results"
        ).innerHTML = "";

        document.getElementById(
            type + "Savings"
        ).innerHTML = "";

        return;
    }

    warning.textContent = "";

    const before = nonDomesticBill(
        usage, md, voltage, usage, afaConfig
    );

    let results = nonDomesticCard(
        "Sebelum Pasang",
        "Before Solar Installation",
        before,
        voltage,
        0
    );

    let savings = "";

    const titles = [
        "Tidak Battery",
        "Ada 1 Battery",
        "Ada 2 Batteries"
    ];

    const names = [
        "No Battery",
        "1 Battery",
        "2 Batteries"
    ];

    for (let count = 0; count <= 2; count++) {
        const nightUsage = usage * 0.60;

        const batteryDeduction = count * 450;

        const remainingUsage = Math.max(
            0,
            nightUsage - batteryDeduction
        );

        // MD remains unchanged in this estimate.
        const after = nonDomesticBill(
            remainingUsage,
            md,
            voltage,
            usage,
            afaConfig
        );

        results += nonDomesticCard(
            titles[count],
            "After Solar · 60% Usage Model",
            after,
            voltage,
            count
        );

        const saving = Math.max(
            0,
            before.total - after.total
        );

        savings += savingCard(
            names[count],
            saving
        );
    }

    document.getElementById(
        type + "Results"
    ).innerHTML = results;

    document.getElementById(
        type + "Savings"
    ).innerHTML = savings;
}

// ======================================
// SWITCH PAGE
// ======================================

function switchPage(page) {
    const pages = [
        "house",
        "shop",
        "factory"
    ];

    pages.forEach(name => {
        document.getElementById(
            name + "Page"
        ).hidden = name !== page;

        const button = document.querySelector(
            `[data-page="${name}"]`
        );

        button.classList.toggle(
            "active",
            name === page
        );
    });

    if (page === "house") {
        calculateAll();
    } else {
        calculateNonDomestic(page);
    }
}

// ======================================
// START
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        calculateAll();
        calculateNonDomestic("shop");
        calculateNonDomestic("factory");
    }
);
