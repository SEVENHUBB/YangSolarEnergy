
// ======================================
// SKYWORTH SOLAR CALCULATOR
// ======================================

// HOUSE RATES
const TENAGA_RATE = 0.2703;
const KAPASITI_RATE = 0.0455;
const RANGKAIAN_RATE = 0.1285;
const AFA_RATE = 0.038;
const KWTBB_RATE = 0.016;

// NON-DOMESTIC GENERAL BASE RATES
// Verify current tariff before using for quotations.
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
// FORMAT
// ======================================

function round2(value) {
    return Math.round(
        (value + Number.EPSILON) * 100
    ) / 100;
}

function formatRM(value) {
    return "RM " + round2(value).toLocaleString(
        "en-MY",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

function formatKWh(value) {
    return value.toFixed(2) + " kWh";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function numeric(id) {
    const input = document.getElementById(id);
    if (!input || input.value.trim() === "") return 0;

    const value = Number(input.value);
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

// ======================================
// HOUSE ICT
// ======================================

function getICTRate(usage) {
    if (usage <= 0) return 0;
    if (usage <= 200) return 25;
    if (usage <= 250) return 24.50;
    if (usage <= 300) return 22.50;
    if (usage <= 350) return 21;
    if (usage <= 400) return 17;
    if (usage <= 450) return 14.50;
    if (usage <= 500) return 12;
    if (usage <= 550) return 10.50;
    if (usage <= 600) return 9;
    if (usage <= 650) return 7.50;
    if (usage <= 700) return 5.50;
    if (usage <= 750) return 4.50;
    if (usage <= 800) return 4;
    if (usage <= 850) return 2.50;
    if (usage <= 900) return 1;
    if (usage <= 1000) return 0.50;
    return 0;
}

function calculateCharges(usage) {
    return {
        tenaga: usage * TENAGA_RATE,
        kapasiti: usage * KAPASITI_RATE,
        rangkaian: usage * RANGKAIAN_RATE,
        afa: usage > 800 ? usage * AFA_RATE : 0
    };
}

function calculateICT(usage) {
    const ictRate = getICTRate(usage);
    const ictDiscount = round2(usage * ictRate / 100);

    return { ictRate, ictDiscount };
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
// HOUSE SOLAR
// ORIGINAL 60% MODEL
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
// HTML CARD HELPERS
// ======================================

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

function savingCard(title, value) {
    return `
        <div class="saving-card">
            <h3>${title}</h3>
            <h2>${formatRM(value)}</h2>
        </div>
    `;
}

// ======================================
// HOUSE DISPLAY
// ======================================

function houseBeforeCard(d) {
    const details =
        detail("Jumlah Penggunaan", formatKWh(d.usage)) +
        detail("Tenaga", formatRM(d.tenaga)) +
        detail("Kapasiti", formatRM(d.kapasiti)) +
        detail("Caj Rangkaian", formatRM(d.rangkaian)) +
        detail("AFA", formatRM(d.afa)) +
        detail("ICT Rate", d.ictRate.toFixed(2) + " sen/kWh") +
        detail("ICT Discount", "- " + formatRM(d.ictDiscount));

    return resultCard(
        "Sebelum Pasang",
        "Before Solar Installation",
        d.total,
        details
    );
}

function houseSolarCard(d, count) {
    const title = [
        "Tidak Battery",
        "Ada 1 Battery",
        "Ada 2 Batteries"
    ][count];

    const subtitle = [
        "Solar Without Battery",
        "Solar With 16 kWh Battery",
        "Solar With 32 kWh Battery"
    ][count];

    let details = "";

    if (count > 0) {
        details += detail(
            "Battery Deduction",
            formatKWh(count * 450)
        );
    }

    details +=
        detail(
            count === 0 ? "Malam Usage (60%)" : "Remaining Usage",
            formatKWh(d.remainingUsage)
        ) +
        detail("Tenaga", formatRM(d.tenaga)) +
        detail("Kapasiti", formatRM(d.kapasiti)) +
        detail("Caj Rangkaian", formatRM(d.rangkaian)) +
        detail("AFA", formatRM(d.afa)) +
        detail("ICT Rate", d.ictRate.toFixed(2) + " sen/kWh") +
        detail("ICT Discount", "- " + formatRM(d.ictDiscount)) +
        detail("KWTBB (1.6%)", formatRM(d.kwtbb)) +
        detail("Eligible Export Usage", formatKWh(d.eligibleExportKWh)) +
        detail("Kredit ATAP Suria", "- " + formatRM(d.atapCredit)) +
        detail("Pelarasan Insentif", "+ " + formatRM(d.pelarasanInsentif)) +
        detail("Sebelum ATAP Suria", formatRM(d.beforeATAP)) +
        detail("Selepas ATAP Suria", formatRM(d.afterATAP));

    return resultCard(
        title,
        subtitle,
        d.afterATAP,
        details
    );
}

function calculateAll() {
    const usage = numeric("jumlah");
    const before = calculateBeforeSolar(usage);

    let results = houseBeforeCard(before);
    let savings = "";

    for (let count = 0; count <= 2; count++) {
        const solar = calculateSolar(usage, count);

        results += houseSolarCard(solar, count);

        const saving = Math.max(
            0,
            before.total - solar.afterATAP
        );

        const name = [
            "No Battery",
            "1 Battery",
            "2 Batteries"
        ][count];

        savings += savingCard(name, saving);
    }

    document.getElementById("houseResults").innerHTML = results;
    document.getElementById("houseSavings").innerHTML = savings;
}

// ======================================
// SHOP & FACTORY BASE BILL
// ======================================

function nonDomesticBill(kwh, md, voltage) {
    const rate = NON_DOMESTIC[voltage];

    const energy = kwh * rate.energy;

    const capacity = (
        voltage === "LV" ? kwh : md
    ) * rate.capacity;

    const network = (
        voltage === "LV" ? kwh : md
    ) * rate.network;

    const retail = rate.retail;

    return {
        energy,
        capacity,
        network,
        retail,
        total: energy + capacity + network + retail
    };
}

function nonDomesticCard(title, subtitle, kwh, md, voltage) {
    const bill = nonDomesticBill(kwh, md, voltage);

    let details =
        detail("Monthly Usage", formatKWh(kwh));

    if (voltage === "MV") {
        details += detail(
            "Maximum Demand",
            md.toFixed(2) + " kW"
        );
    }

    details +=
        detail("Energy Charge", formatRM(bill.energy)) +
        detail("Capacity Charge", formatRM(bill.capacity)) +
        detail("Network Charge", formatRM(bill.network)) +
        detail("Retail Charge", formatRM(bill.retail));

    return resultCard(
        title,
        subtitle,
        bill.total,
        details
    );
}

// ======================================
// SHOP & FACTORY CALCULATION
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

    const before = nonDomesticBill(
        usage, md, voltage
    );

    let results = nonDomesticCard(
        "Sebelum Pasang",
        "Before Solar Installation",
        usage, md, voltage
    );

    let savings = "";

    for (let count = 0; count <= 2; count++) {

        // SAME 60% ASSUMPTION
        const nightUsage = usage * 0.60;

        const batteryDeduction = count * 450;

        const remainingUsage = Math.max(
            0,
            nightUsage - batteryDeduction
        );

        const after = nonDomesticBill(
            remainingUsage, md, voltage
        );

        const titles = [
            "Tidak Battery",
            "Ada 1 Battery",
            "Ada 2 Batteries"
        ];

        results += nonDomesticCard(
            titles[count],
            "After Solar · Battery Deduction: " +
                formatKWh(batteryDeduction),
            remainingUsage,
            md,
            voltage
        );

        const saving = Math.max(
            0,
            before.total - after.total
        );

        const names = [
            "No Battery",
            "1 Battery",
            "2 Batteries"
        ];

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
// PAGE SWITCHING
// ======================================

function switchPage(page) {
    const pages = ["house", "shop", "factory"];

    pages.forEach(name => {
        const element = document.getElementById(
            name + "Page"
        );

        element.hidden = name !== page;

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

document.addEventListener("DOMContentLoaded", () => {
    calculateAll();
    calculateNonDomestic("shop");
    calculateNonDomestic("factory");
});
