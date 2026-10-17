
// ======================================
// SKYWORTH SOLAR CALCULATOR
// ATAP SURIA BILLING MODEL
// ======================================

const TENAGA_RATE = 0.2703;
const KAPASITI_RATE = 0.0455;
const RANGKAIAN_RATE = 0.1285;
const AFA_RATE = 0.038;
const KWTBB_RATE = 0.016;

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

    if (element) {
        element.textContent = value;
    }
}

// ======================================
// ICT RATE TABLE
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
// BASIC CHARGES
// ======================================

function calculateCharges(usage) {

    const tenaga = usage * TENAGA_RATE;
    const kapasiti = usage * KAPASITI_RATE;
    const rangkaian = usage * RANGKAIAN_RATE;

    const afa = usage > 800
        ? usage * AFA_RATE
        : 0;

    return {
        tenaga,
        kapasiti,
        rangkaian,
        afa
    };
}

// ======================================
// ICT
// ======================================

function calculateICT(usage) {

    const ictRate = getICTRate(usage);

    const ictDiscount = round2(
        usage * ictRate / 100
    );

    return {
        ictRate,
        ictDiscount
    };
}

// ======================================
// BEFORE SOLAR
// KEEP ORIGINAL FORMULA
// ======================================

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
// ATAP SURIA CALCULATION
// ======================================

function calculateSolar(usage, batteryCount) {

    // Previous sales assumptions
    const nightUsage = usage * 0.60;

    const batteryDeduction = batteryCount * 450;

    const remainingUsage = Math.max(
        0,
        nightUsage - batteryDeduction
    );

    const charges = calculateCharges(remainingUsage);
    const ict = calculateICT(remainingUsage);

    // Monthly usage charges
    const currentUsageCharge = round2(
        charges.tenaga +
        charges.kapasiti +
        charges.rangkaian +
        charges.afa -
        ict.ictDiscount
    );

    // KWTBB: assumption based on supplied bill
    const kwtbb = round2(
        Math.max(0, currentUsageCharge) * KWTBB_RATE
    );

    // IMPORTANT:
    // Temporary assumption for the one-input calculator.
    // Actual eligible export kWh may differ.
    const eligibleExportKWh = remainingUsage;

    // ATAP energy credit
    const atapCredit = round2(
        eligibleExportKWh * TENAGA_RATE
    );

    // ICT adjustment on credited energy
    const pelarasanInsentif = round2(
        eligibleExportKWh * ict.ictRate / 100
    );

    // Before ATAP credit
    const beforeATAP = Math.max(
        0,
        round2(currentUsageCharge + kwtbb)
    );

    // After ATAP credit and ICT adjustment
    const calculatedAfterATAP = round2(
        currentUsageCharge +
        kwtbb -
        atapCredit +
        pelarasanInsentif
    );

    // Estimated payable amount, minimum zero
    const afterATAP = Math.max(
        0,
        calculatedAfterATAP
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
// DISPLAY BEFORE SOLAR
// ======================================

function displayBeforeSolar(data) {

    setText("beforeUsage", formatKWh(data.usage));
    setText("beforeTenaga", formatRM(data.tenaga));
    setText("beforeKapasiti", formatRM(data.kapasiti));
    setText("beforeRangkaian", formatRM(data.rangkaian));
    setText("beforeAFA", formatRM(data.afa));

    setText(
        "ictRate",
        data.ictRate.toFixed(2) + " sen/kWh"
    );

    setText(
        "ictDiscount",
        "- " + formatRM(data.ictDiscount)
    );

    setText("beforeTotal", formatRM(data.total));
}

// ======================================
// DISPLAY SOLAR
// ======================================

function displaySolar(data, prefix, totalId) {

    setText(
        prefix + "Usage",
        formatKWh(data.remainingUsage)
    );

    setText(prefix + "Tenaga", formatRM(data.tenaga));
    setText(prefix + "Kapasiti", formatRM(data.kapasiti));
    setText(prefix + "Rangkaian", formatRM(data.rangkaian));
    setText(prefix + "AFA", formatRM(data.afa));

    setText(
        prefix + "ICTRate",
        data.ictRate.toFixed(2) + " sen/kWh"
    );

    setText(
        prefix + "ICT",
        "- " + formatRM(data.ictDiscount)
    );

    setText(
        prefix + "KWTBB",
        formatRM(data.kwtbb)
    );

    setText(
        prefix + "ATAPCredit",
        "- " + formatRM(data.atapCredit)
    );

    setText(
        prefix + "Pelarasan",
        "+ " + formatRM(data.pelarasanInsentif)
    );

    setText(
        prefix + "ExportUsage",
        formatKWh(data.eligibleExportKWh)
    );

    setText(
        prefix + "Before",
        formatRM(data.beforeATAP)
    );

    setText(
        prefix + "After",
        formatRM(data.afterATAP)
    );

    setText(totalId, formatRM(data.afterATAP));
}

// ======================================
// MAIN CALCULATION
// ======================================

function calculateAll() {

    const input = document.getElementById("jumlah");

    if (!input) return;

    let usage = Number(input.value);

    if (
        input.value.trim() === "" ||
        !Number.isFinite(usage) ||
        usage < 0
    ) {
        usage = 0;
    }

    const beforeSolar = calculateBeforeSolar(usage);

    const noBattery = calculateSolar(usage, 0);
    const oneBattery = calculateSolar(usage, 1);
    const twoBattery = calculateSolar(usage, 2);

    displayBeforeSolar(beforeSolar);

    displaySolar(
        noBattery,
        "noBattery",
        "noBatteryTotal"
    );

    displaySolar(
        oneBattery,
        "oneBattery",
        "oneBatteryTotal"
    );

    displaySolar(
        twoBattery,
        "twoBattery",
        "twoBatteryTotal"
    );

    const savingNoBattery = Math.max(
        0,
        beforeSolar.total - noBattery.afterATAP
    );

    const savingOneBattery = Math.max(
        0,
        beforeSolar.total - oneBattery.afterATAP
    );

    const savingTwoBattery = Math.max(
        0,
        beforeSolar.total - twoBattery.afterATAP
    );

    setText(
        "savingNoBattery",
        formatRM(savingNoBattery)
    );

    setText(
        "savingOneBattery",
        formatRM(savingOneBattery)
    );

    setText(
        "savingTwoBattery",
        formatRM(savingTwoBattery)
    );
}

// ======================================
// START
// ======================================

document.addEventListener("DOMContentLoaded", calculateAll);
