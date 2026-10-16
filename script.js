
// ======================================
// SKYWORTH SOLAR CALCULATOR
// ======================================

// Format amount to RM
function formatRM(amount) {
    return "RM " + amount.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Format electricity usage
function formatKWh(amount) {
    return amount.toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " kWh";
}

// Round to 2 decimal places
function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
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

    // AFA only applies above 800 kWh
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
// BEFORE SOLAR INSTALLATION
// ======================================

function calculateBeforeSolar(usage) {

    const charges = calculateCharges(usage);

    const ictRate = getICTRate(usage);

    const ictDiscount = round2(
        usage * ictRate / 100
    );

    const total =
        charges.tenaga +
        charges.kapasiti +
        charges.rangkaian +
        charges.afa -
        ictDiscount;

    return {
        usage,
        ...charges,
        ictRate,
        ictDiscount,
        total
    };
}

// ======================================
// SOLAR WITH / WITHOUT BATTERY
// ======================================


function calculateSolar(usage, batteryCount) {

    // Night usage = 60%
    const nightUsage = usage * 0.60;

    // Each battery deducts 450 kWh
    const batteryDeduction = batteryCount * 450;

    // Remaining usage cannot be negative
    const remainingUsage = Math.max(
        0,
        nightUsage - batteryDeduction
    );

    // Calculate electricity charges
    const charges = calculateCharges(remainingUsage);

    // Calculate ICT based on remaining usage
    const ictRate = getICTRate(remainingUsage);

    const ictDiscount = round2(
        remainingUsage * ictRate / 100
    );

    // Sebelum ATAP Suria
 const beforeATAP =
    charges.tenaga +
    charges.kapasiti +
    charges.rangkaian +
    charges.afa -
    ictDiscount;

const afterATAP =
    charges.kapasiti +
    charges.rangkaian +
    charges.afa -
    ictDiscount;

    return {
        nightUsage,
        batteryDeduction,
        remainingUsage,
        ...charges,
        ictRate,
        ictDiscount,
        beforeATAP,
        afterATAP
    };
}


// ======================================
// UPDATE HTML ELEMENTS
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
// DISPLAY SOLAR RESULTS
// ======================================


function displaySolar(data, prefix, totalId) {

    setText(
        prefix + "Usage",
        formatKWh(data.remainingUsage)
    );

    setText(
        prefix + "Tenaga",
        formatRM(data.tenaga)
    );

    setText(
        prefix + "Kapasiti",
        formatRM(data.kapasiti)
    );

    setText(
        prefix + "Rangkaian",
        formatRM(data.rangkaian)
    );

    setText(
        prefix + "AFA",
        formatRM(data.afa)
    );

    // Display ICT Rate
    setText(
        prefix + "ICTRate",
        data.ictRate.toFixed(2) + " sen/kWh"
    );

    // Display ICT Discount
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

    // Main total
    setText(
        totalId,
        formatRM(data.afterATAP)
    );
}

// ======================================
// MAIN CALCULATION
// ======================================

function calculateAll() {

    const input = document.getElementById("jumlah");

    if (!input) return;

    const inputValue = input.value.trim();

    // Reset to zero when input is empty
    let usage = Number(inputValue);

    if (
        inputValue === "" ||
        !Number.isFinite(usage) ||
        usage < 0
    ) {
        usage = 0;
    }

    // 1. Before solar
    const beforeSolar = calculateBeforeSolar(usage);

    // 2. Solar without battery
    const noBattery = calculateSolar(usage, 0);

    // 3. Solar with 1 battery
    const oneBattery = calculateSolar(usage, 1);

    // 4. Solar with 2 batteries
    const twoBattery = calculateSolar(usage, 2);

    // ==================================
    // DISPLAY ALL FOUR RESULTS
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
    // MONTHLY SAVINGS
    // ==================================

    const savingNoBattery =
        beforeSolar.total - noBattery.afterATAP;

    const savingOneBattery =
        beforeSolar.total - oneBattery.afterATAP;

    const savingTwoBattery =
        beforeSolar.total - twoBattery.afterATAP;

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
// RUN WHEN PAGE LOADS
// ======================================

document.addEventListener("DOMContentLoaded", function () {
    calculateAll();
});
