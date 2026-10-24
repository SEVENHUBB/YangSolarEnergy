
// =======================================
// SKYWORTH SOLAR CALCULATOR
// HOUSE / SHOP / FACTORY
// =======================================

// HOUSE TARIFF ASSUMPTIONS
const TENAGA_RATE = 0.2703;
const KAPASITI_RATE = 0.0455;
const RANGKAIAN_RATE = 0.1285;
const AFA_RATE = 0.038;
const KWTBB_RATE = 0.016;

// NON-DOMESTIC TARIFF ASSUMPTIONS
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

// =======================================
// HELPER FUNCTIONS
// =======================================

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
    const element = document.getElementById(id);

    if (!element || element.value.trim() === "") {
        return 0;
    }

    const value = Number(element.value);

    return Number.isFinite(value) && value >= 0
        ? value
        : 0;
}

function signedNumeric(id) {
    const element = document.getElementById(id);

    if (!element || element.value.trim() === "") {
        return 0;
    }

    const value = Number(element.value);

    return Number.isFinite(value) ? value : 0;
}

function detail(label, value, className = "") {
    return `
        <p class="${className}">
            ${label}
            <span>${value}</span>
        </p>
    `;
}

function resultCard(title, subtitle, total, details) {
    return `
        <article class="result-card">
            <h3>${title}</h3>
            <p>${subtitle}</p>
            <h2>${formatRM(total)}</h2>
            <div class="details">
                ${details}
            </div>
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

// =======================================
// HOUSE ICT TABLE
// =======================================

function getICTRate(usage) {
    if (usage <= 0) return 0;
    if (usage <= 200) return 25;
    if (usage <= 250) return 24.5;
    if (usage <= 300) return 22.5;
    if (usage <= 350) return 21;
    if (usage <= 400) return 17;
    if (usage <= 450) return 14.5;
    if (usage <= 500) return 12;
    if (usage <= 550) return 10.5;
    if (usage <= 600) return 9;
    if (usage <= 650) return 7.5;
    if (usage <= 700) return 5.5;
    if (usage <= 750) return 4.5;
    if (usage <= 800) return 4;
    if (usage <= 850) return 2.5;
    if (usage <= 900) return 1;
    if (usage <= 1000) return 0.5;

    return 0;
}

// =======================================
// HOUSE CALCULATIONS
// =======================================

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
        round2(
            charges.tenaga +
            charges.kapasiti +
            charges.rangkaian +
            charges.afa -
            ict.ictDiscount
        )
    );

    return {
        usage,
        ...charges,
        ...ict,
        total
    };
}

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
        Math.max(0, currentUsageCharge) *
        KWTBB_RATE
    );

    // Original House sales model assumption.
    // This is not a measured solar export value.
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
            beforeATAP -
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

// =======================================
// HOUSE RESULT CARDS
// =======================================

function houseBeforeCard(data) {
    const details =
        detail(
            "Jumlah Penggunaan",
            formatKWh(data.usage)
        ) +
        detail("Tenaga", formatRM(data.tenaga)) +
        detail("Kapasiti", formatRM(data.kapasiti)) +
        detail(
            "Caj Rangkaian",
            formatRM(data.rangkaian)
        ) +
        detail("AFA", formatRM(data.afa)) +
        detail(
            "ICT Rate",
            data.ictRate.toFixed(2) + " sen/kWh"
        ) +
        detail(
            "ICT Discount",
            "- " + formatRM(data.ictDiscount)
        );

    return resultCard(
        "Sebelum Pasang",
        "Before Solar Installation",
        data.total,
        details
    );
}

function houseSolarCard(data, batteryCount) {
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

    if (batteryCount > 0) {
        details += detail(
            "Battery Deduction",
            formatKWh(data.batteryDeduction)
        );
    }

    details +=
        detail(
            "Remaining Usage",
            formatKWh(data.remainingUsage)
        ) +
        detail("Tenaga", formatRM(data.tenaga)) +
        detail("Kapasiti", formatRM(data.kapasiti)) +
        detail(
            "Caj Rangkaian",
            formatRM(data.rangkaian)
        ) +
        detail("AFA", formatRM(data.afa)) +
        detail(
            "ICT Rate",
            data.ictRate.toFixed(2) + " sen/kWh"
        ) +
        detail(
            "ICT Discount",
            "- " + formatRM(data.ictDiscount)
        ) +
        detail(
            "KWTBB (1.6%)",
            formatRM(data.kwtbb)
        ) +
        detail(
            "Eligible Export Usage",
            formatKWh(data.eligibleExportKWh)
        ) +
        detail(
            "Sebelum ATAP Suria",
            formatRM(data.beforeATAP),
            "atap-before"
        ) +
        detail(
            "Kredit ATAP Suria",
            "- " + formatRM(data.atapCredit),
            "atap-credit"
        ) +
        detail(
            "Pelarasan Insentif",
            "+ " + formatRM(data.pelarasanInsentif)
        ) +
        detail(
            "Selepas ATAP Suria",
            formatRM(data.afterATAP),
            "atap-after"
        );

    return resultCard(
        titles[batteryCount],
        subtitles[batteryCount],
        data.afterATAP,
        details
    );
}

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

        savings += savingCard(
            names[count],
            Math.max(
                0,
                round2(
                    before.total - solar.afterATAP
                )
            )
        );
    }

    document.getElementById(
        "houseResults"
    ).innerHTML = results;

    document.getElementById(
        "houseSavings"
    ).innerHTML = savings;
}

// =======================================
// SHOP / FACTORY AFA
// =======================================

function updateAFAMode(type) {
    const isSplit = document.getElementById(
        type + "AFAMode"
    ).value === "split";

    document.getElementById(
        type + "SplitAFAGroup"
    ).hidden = !isSplit;

    document.getElementById(
        type + "SingleAFAGroup"
    ).hidden = isSplit;

    calculateNonDomestic(type);
}

function getAFAConfig(type, usage) {
    const mode = document.getElementById(
        type + "AFAMode"
    ).value;

    if (mode === "single") {
        return {
            valid: true,
            mode: "single",
            rate: signedNumeric(type + "AFARate")
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

function calculateAFA(
    usage,
    originalUsage,
    config
) {
    if (config.mode === "single") {
        return usage * config.rate;
    }

    if (originalUsage <= 0) {
        return 0;
    }

    // Estimated allocation of reduced import usage
    // across the two original AFA periods.
    const proportion = usage / originalUsage;

    return (
        config.usage1 * proportion * config.rate1 +
        config.usage2 * proportion * config.rate2
    );
}

// =======================================
// NON-DOMESTIC BILL
// =======================================

function nonDomesticBill(
    usage,
    md,
    voltage,
    originalUsage,
    afaConfig
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

    // Based on the provided LV shop bill:
    // KWTBB is estimated on energy,
    // capacity and network charges,
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

// =======================================
// NON-DOMESTIC RESULT CARD
// =======================================

function nonDomesticCard(
    title,
    subtitle,
    bill,
    voltage,
    batteryCount,
    atap = null
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
        );

    let finalTotal = bill.total;

    if (atap !== null) {
        finalTotal = Math.max(
            0,
            round2(bill.total - atap.credit)
        );

        details +=
            detail(
                "Sebelum ATAP Suria",
                formatRM(bill.total),
                "atap-before"
            ) +
            detail(
                "Eligible Export Usage",
                formatKWh(atap.exportUsage)
            ) +
            detail(
                "Average SMP",
                formatRM(atap.smp) + "/kWh"
            ) +
            detail(
                "Kredit ATAP Suria",
                "- " + formatRM(atap.credit),
                "atap-credit"
            ) +
            detail(
                "Selepas ATAP Suria",
                formatRM(finalTotal),
                "atap-after"
            );
    } else {
        details += detail(
            "Caj Semasa (Estimated)",
            formatRM(bill.total)
        );
    }

    return resultCard(
        title,
        subtitle,
        finalTotal,
        details
    );
}

// =======================================
// SHOP / FACTORY MAIN
// =======================================

function calculateNonDomestic(type) {
    const usage = numeric(type + "Usage");

    const voltage = document.getElementById(
        type + "Voltage"
    ).value;

    const md = numeric(type + "MD");

    document.getElementById(
        type + "MDGroup"
    ).hidden = voltage !== "MV";

    const afaConfig = getAFAConfig(type, usage);

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
        usage,
        md,
        voltage,
        usage,
        afaConfig
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

        // Maximum Demand is kept unchanged
        // in this simplified model.
        const after = nonDomesticBill(
            remainingUsage,
            md,
            voltage,
            usage,
            afaConfig
        );

        let atap = null;
        let finalTotal = after.total;

        if (type === "shop") {
            const exportUsage = numeric(
                "shopExport" + count
            );

            const smp = numeric("shopSMP");

            const credit = round2(
                exportUsage * smp
            );

            atap = {
                exportUsage,
                smp,
                credit
            };

            finalTotal = Math.max(
                0,
                round2(after.total - credit)
            );
        }

        results += nonDomesticCard(
            titles[count],
            "After Solar · 60% Usage Model",
            after,
            voltage,
            count,
            atap
        );

        const saving = Math.max(
            0,
            round2(before.total - finalTotal)
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

// =======================================
// PAGE SWITCHING
// =======================================

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

// =======================================
// INITIALIZE
// =======================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        calculateAll();
        updateAFAMode("shop");
        updateAFAMode("factory");
    }
);
