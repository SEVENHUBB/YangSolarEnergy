
/* ======================================
   SKYWORTH SOLAR CALCULATOR
   COMPLETE UPDATED VERSION
====================================== */

// ======================================
// FORMAT FUNCTIONS
// ======================================

function formatRM(amount) {
    // Prevent negative zero
    const value = Math.max(0, round2(amount));

    return "RM " + value.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatKWh(amount) {
    return amount.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " kWh";
}

function round2(value) {
    return Math.round(
        (value + Number.EPSILON) * 100
    ) / 100;
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
// ELECTRICITY CHARGES
// ======================================

function calculateCharges(usage) {

    const tenaga = usage * 0.2703;

    const kapasiti = usage * 0.0455;

    const rangkaian = usage * 0.1285;

    // AFA applies only when usage > 800 kWh
    const afa = usage > 800
        ? usage * 0.038
        : 0;

    return {
        tenaga,
        kapasiti,
        rangkaian,
        afa
    };
}

// ======================================
// ICT DISCOUNT CALCULATION
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
// BEFORE SOLAR INSTALLATION
// ======================================

function calculateBeforeSolar(usage) {

    const charges = calculateCharges(usage);

    const ict = calculateICT(usage);

    const calculatedTotal =
        charges.tenaga +
        charges.kapasiti +
        charges.rangkaian +
        charges.afa -
        ict.ictDiscount;

    // Final bill cannot be negative
    const total = Math.max(0, calculatedTotal);

    return {
        usage,
        ...charges,
        ...ict,
        total
    };
}

// ======================================
// SOLAR WITH / WITHOUT BATTERY
// ======================================

function calculateSolar(usage, batteryCount) {

    // Night electricity usage = 60%
    const nightUsage = usage * 0.60;

    // 1 battery = 450 kWh deduction
    // 2 batteries = 900 kWh deduction
    const batteryDeduction = batteryCount * 450;

    // Remaining usage cannot be negative
    const remainingUsage = Math.max(
        0,
        nightUsage - batteryDeduction
    );

    // Calculate electricity charges
    const charges = calculateCharges(remainingUsage);

    // Calculate ICT based on remaining usage
    const ict = calculateICT(remainingUsage);

    // ==================================
    // SEBELUM ATAP SURIA
    // ==================================

    const calculatedBeforeATAP =
        charges.tenaga +
        charges.kapasiti +
        charges.rangkaian +
        charges.afa -
        ict.ictDiscount;

    const beforeATAP = Math.max(
        0,
        calculatedBeforeATAP
    );

    // ==================================
    // SELEPAS ATAP SURIA
    // ==================================

    const calculatedAfterATAP =
        charges.kapasiti +
        charges.rangkaian +
        charges.afa -
        ict.ictDiscount;

    const afterATAP = Math.max(
        0,
        calculatedAfterATAP
    );

    return {
        nightUsage,
        batteryDeduction,
        remainingUsage,
        ...charges,
        ...ict,
        beforeATAP,
        afterATAP
    };
}

// ======================================
// UPDATE HTML ELEMENT
// ======================================

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

// ======================================
// DISPLAY BEFORE SOLAR
// ======================================

function displayBeforeSolar(data) {

    setText(
        "beforeUsage",
        formatKWh(data.usage)
    );

    setText(
        "beforeTenaga",
        formatRM(data.tenaga)
    );

    setText(
        "beforeKapasiti",
        formatRM(data.kapasiti)
    );

    setText(
        "beforeRangkaian",
        formatRM(data.rangkaian)
    );

    setText(
        "beforeAFA",
        formatRM(data.afa)
    );

    setText(
        "ictRate",
        data.ictRate.toFixed(2) + " sen/kWh"
    );

    setText(
        "ictDiscount",
        "- " + formatRM(data.ictDiscount)
    );

    setText(
        "beforeTotal",
        formatRM(data.total)
    );
}

// ======================================
// DISPLAY SOLAR RESULTS
// ======================================

function displaySolar(data, prefix, totalId) {

    // Remaining electricity usage
    setText(
        prefix + "Usage",
        formatKWh(data.remainingUsage)
    );

    // Tenaga
    setText(
        prefix + "Tenaga",
        formatRM(data.tenaga)
    );

    // Kapasiti
    setText(
        prefix + "Kapasiti",
        formatRM(data.kapasiti)
    );

    // Caj Rangkaian
    setText(
        prefix + "Rangkaian",
        formatRM(data.rangkaian)
    );

    // AFA
    setText(
        prefix + "AFA",
        formatRM(data.afa)
    );

    // ICT Rate
    setText(
        prefix + "ICTRate",
        data.ictRate.toFixed(2) + " sen/kWh"
    );

    // ICT Discount
    setText(
        prefix + "ICT",
        "- " + formatRM(data.ictDiscount)
    );

    // Sebelum ATAP Suria
    setText(
        prefix + "Before",
        formatRM(data.beforeATAP)
    );

    // Selepas ATAP Suria
    setText(
        prefix + "After",
        formatRM(data.afterATAP)
    );

    // Main displayed amount
    setText(
        totalId,
        formatRM(data.afterATAP)
    );
}

// ======================================
// MAIN CALCULATION FUNCTION
// ======================================

function calculateAll() {

    const input = document.getElementById("jumlah");

    if (!input) return;

    const inputValue = input.value.trim();

    let usage = Number(inputValue);

    // Prevent invalid electricity usage
    if (
        inputValue === "" ||
        !Number.isFinite(usage) ||
        usage < 0
    ) {
        usage = 0;
    }

    // ==================================
    // CALCULATE ALL FOUR OPTIONS
    // ==================================

    // 1. Before Solar
    const beforeSolar = calculateBeforeSolar(usage);

    // 2. Solar Without Battery
    const noBattery = calculateSolar(usage, 0);

    // 3. Solar With 1 Battery (16 kWh)
    const oneBattery = calculateSolar(usage, 1);

    // 4. Solar With 2 Batteries (32 kWh)
    const twoBattery = calculateSolar(usage, 2);

    // ==================================
    // DISPLAY ALL RESULTS
    // ==================================

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

    // ==================================
    // ESTIMATED MONTHLY SAVINGS
    // ==================================

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

    // Display savings
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
// RUN AUTOMATICALLY WHEN PAGE LOADS
// ======================================

document.addEventListener("DOMContentLoaded", function () {
    calculateAll();
});
