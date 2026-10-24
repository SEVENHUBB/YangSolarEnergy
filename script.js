
// ==========================================
// SKYWORTH SOLAR CALCULATOR
// HOUSE / SHOP / FACTORY
// ==========================================

// ==========================================
// CONFIGURATION
// ==========================================

const SOLAR_REMAINING_RATIO = 0.60;
const BATTERY_DEDUCTION_KWH = 450;
const KWTBB_RATE = 0.016;

// House: previous sales model
const HOUSE_RATE = {
    tenaga: 0.2703,
    kapasiti: 0.0455,
    rangkaian: 0.1285,
    afa: 0.038
};

// Shop: Non-Domestic Low Voltage General
const SHOP_RATE = {
    tenaga: 0.2703,
    kapasiti: 0.0883,
    rangkaian: 0.1482,
    retail: 20,

    // Estimated AFA from the previous shop bill.
    // This is not a permanent monthly TNB rate.
    afa: 0.0361
};

// Factory: previous model
const FACTORY_RATE = {
    LV: {
        tenaga: 0.2703,
        kapasiti: 0.0883,
        rangkaian: 0.1482,
        retail: 20
    },

    MV: {
        tenaga: 0.2983,
        kapasiti: 29.43,
        rangkaian: 59.84,
        retail: 200
    }
};

// ==========================================
// HELPERS
// ==========================================

function round2(value) {
    return Math.round(
        (value + Number.EPSILON) * 100
    ) / 100;
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
    return value.toLocaleString(
        "en-MY",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ) + " kWh";
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

function savingCard(title, amount) {
    return `
        <div class="saving-card">
            <h3>${title}</h3>
            <h2>${formatRM(amount)}</h2>
        </div>
    `;
}

function getRemainingUsage(usage, batteryCount) {
    return Math.max(
        0,
        usage * SOLAR_REMAINING_RATIO -
        batteryCount * BATTERY_DEDUCTION_KWH
    );
}

// ==========================================
// HOUSE ICT
// ==========================================

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

// ==========================================
// HOUSE BILL
// ==========================================

function houseBill(usage, isSolar = false) {
    const tenaga = round2(
        usage * HOUSE_RATE.tenaga
    );

    const kapasiti = round2(
        usage * HOUSE_RATE.kapasiti
    );

    const rangkaian = round2(
        usage * HOUSE_RATE.rangkaian
    );

    const afa = round2(
        usage > 800
            ? usage * HOUSE_RATE.afa
            : 0
    );

    const ictRate = getICTRate(usage);

    const ictDiscount = round2(
        usage * ictRate / 100
    );

    const currentCharge = Math.max(
        0,
        round2(
            tenaga +
            kapasiti +
            rangkaian +
            afa -
            ictDiscount
        )
    );

    // Preserve the previous House calculation model.
    const kwtbb = isSolar
        ? round2(currentCharge * KWTBB_RATE)
        : 0;

    const beforeATAP = round2(
        currentCharge + kwtbb
    );

    // Original House sales assumption:
    // remaining import usage is also used as
    // estimated eligible export usage.
    // This is NOT measured export generation.
    const estimatedExport = isSolar ? usage : 0;

    const atapCredit = isSolar
        ? round2(
            estimatedExport * HOUSE_RATE.tenaga
        )
        : 0;

    const pelarasanInsentif = isSolar
        ? round2(
            estimatedExport * ictRate / 100
        )
        : 0;

    const afterATAP = Math.max(
        0,
        round2(
            beforeATAP -
            atapCredit +
            pelarasanInsentif
        )
    );

    return {
        usage,
        tenaga,
        kapasiti,
        rangkaian,
        afa,
        ictRate,
        ictDiscount,
        kwtbb,
        beforeATAP,
        estimatedExport,
        atapCredit,
        pelarasanInsentif,
        afterATAP
    };
}

// ==========================================
// HOUSE CARDS
// ==========================================

function houseCard(title, subtitle, bill, solar) {
    let details =
        detail(
            "Jumlah Penggunaan",
            formatKWh(bill.usage)
        ) +
        detail(
            "Tenaga",
            formatRM(bill.tenaga)
        ) +
        detail(
            "Kapasiti",
            formatRM(bill.kapasiti)
        ) +
        detail(
            "Caj Rangkaian",
            formatRM(bill.rangkaian)
        ) +
        detail(
            "AFA",
            formatRM(bill.afa)
        ) +
        detail(
            "ICT Rate",
            bill.ictRate.toFixed(2) + " sen/kWh"
        ) +
        detail(
            "ICT Discount",
            "- " + formatRM(bill.ictDiscount)
        );

    if (solar) {
        details +=
            detail(
                "KWTBB (1.6%)",
                formatRM(bill.kwtbb)
            ) +
            detail(
                "Sebelum ATAP Suria",
                formatRM(bill.beforeATAP),
                "atap-before"
            ) +
            detail(
                "Kredit ATAP Suria (Estimated)",
                "- " + formatRM(bill.atapCredit),
                "atap-credit"
            ) +
            detail(
                "Pelarasan Insentif",
                "+ " + formatRM(
                    bill.pelarasanInsentif
                )
            ) +
            detail(
                "Selepas ATAP Suria",
                formatRM(bill.afterATAP),
                "atap-after"
            );
    }

    return resultCard(
        title,
        subtitle,
        bill.afterATAP,
        details
    );
}

function calculateAll() {
    const usage = numeric("jumlah");

    const before = houseBill(usage, false);

    let results = houseCard(
        "Sebelum Pasang",
        "Before Solar Installation",
        before,
        false
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
        const remaining = getRemainingUsage(
            usage,
            count
        );

        const after = houseBill(
            remaining,
            true
        );

        results += houseCard(
            titles[count],
            "After Solar Installation",
            after,
            true
        );

        savings += savingCard(
            names[count],
            Math.max(
                0,
                round2(
                    before.afterATAP -
                    after.afterATAP
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

// ==========================================
// SHOP BILL
// ==========================================

function shopBill(usage, isSolar = false) {
    const tenaga = round2(
        usage * SHOP_RATE.tenaga
    );

    const kapasiti = round2(
        usage * SHOP_RATE.kapasiti
    );

    const rangkaian = round2(
        usage * SHOP_RATE.rangkaian
    );

    const afa = round2(
        usage * SHOP_RATE.afa
    );

    const retail = SHOP_RATE.retail;

    // Estimated KWTBB base, based on the
    // earlier Low Voltage shop bill.
    const kwtbbBase =
        usage * (
            SHOP_RATE.tenaga +
            SHOP_RATE.kapasiti +
            SHOP_RATE.rangkaian
        );

    const kwtbb = round2(
        kwtbbBase * KWTBB_RATE
    );

    const beforeATAP = round2(
        tenaga +
        kapasiti +
        rangkaian +
        afa +
        retail +
        kwtbb
    );

    // No export/SMP inputs are available.
    // Therefore no ATAP credit is assumed.
    const atapCredit = 0;

    const afterATAP = beforeATAP;

    return {
        usage,
        tenaga,
        kapasiti,
        rangkaian,
        afa,
        retail,
        kwtbb,
        beforeATAP,
        atapCredit,
        afterATAP
    };
}

// ==========================================
// SHOP CARDS
// ==========================================

function shopCard(title, subtitle, bill, solar) {
    let details =
        detail(
            "Jumlah Penggunaan",
            formatKWh(bill.usage)
        ) +
        detail(
            "Tenaga",
            formatRM(bill.tenaga)
        ) +
        detail(
            "Kapasiti",
            formatRM(bill.kapasiti)
        ) +
        detail(
            "Caj Rangkaian",
            formatRM(bill.rangkaian)
        ) +
        detail(
            "AFA (Estimated)",
            formatRM(bill.afa)
        ) +
        detail(
            "Caj Peruncitan",
            formatRM(bill.retail)
        ) +
        detail(
            "KWTBB (1.6%)",
            formatRM(bill.kwtbb)
        );

    if (solar) {
        details +=
            detail(
                "Sebelum ATAP Suria",
                formatRM(bill.beforeATAP),
                "atap-before"
            ) +
            detail(
                "Kredit ATAP Suria (Not Included)",
                formatRM(bill.atapCredit),
                "atap-credit"
            ) +
            detail(
                "Selepas ATAP Suria",
                formatRM(bill.afterATAP),
                "atap-after"
            );
    } else {
        details += detail(
            "Caj Semasa (Estimated)",
            formatRM(bill.beforeATAP)
        );
    }

    return resultCard(
        title,
        subtitle,
        bill.afterATAP,
        details
    );
}

function calculateShop() {
    const usage = numeric("shopUsage");

    const before = shopBill(usage, false);

    let results = shopCard(
        "Sebelum Pasang",
        "Before Solar Installation",
        before,
        false
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
        const remaining = getRemainingUsage(
            usage,
            count
        );

        const after = shopBill(
            remaining,
            true
        );

        results += shopCard(
            titles[count],
            "After Solar Installation",
            after,
            true
        );

        savings += savingCard(
            names[count],
            Math.max(
                0,
                round2(
                    before.afterATAP -
                    after.afterATAP
                )
            )
        );
    }

    document.getElementById(
        "shopResults"
    ).innerHTML = results;

    document.getElementById(
        "shopSavings"
    ).innerHTML = savings;
}

// ==========================================
// FACTORY AFA
// ==========================================

function updateFactoryAFAMode() {
    const isSplit = document.getElementById(
        "factoryAFAMode"
    ).value === "split";

    document.getElementById(
        "factorySplitAFAGroup"
    ).hidden = !isSplit;

    document.getElementById(
        "factorySingleAFAGroup"
    ).hidden = isSplit;

    calculateFactory();
}

function getFactoryAFAConfig(usage) {
    const mode = document.getElementById(
        "factoryAFAMode"
    ).value;

    if (mode === "single") {
        return {
            valid: true,
            mode: "single",
            rate: signedNumeric(
                "factoryAFARate"
            )
        };
    }

    const usage1 = numeric(
        "factoryAFA1Usage"
    );

    const usage2 = numeric(
        "factoryAFA2Usage"
    );

    const rate1 = signedNumeric(
        "factoryAFA1Rate"
    );

    const rate2 = signedNumeric(
        "factoryAFA2Rate"
    );

    return {
        valid: Math.abs(
            usage1 + usage2 - usage
        ) < 0.001,
        mode: "split",
        usage1,
        usage2,
        rate1,
        rate2
    };
}

function factoryAFA(
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

    const ratio = usage / originalUsage;

    return (
        config.usage1 *
        ratio *
        config.rate1
    ) + (
        config.usage2 *
        ratio *
        config.rate2
    );
}

// ==========================================
// FACTORY BILL
// ==========================================

function factoryBill(
    usage,
    md,
    voltage,
    originalUsage,
    afaConfig
) {
    const rate = FACTORY_RATE[voltage];

    const tenaga = round2(
        usage * rate.tenaga
    );

    const kapasiti = round2(
        (voltage === "LV" ? usage : md) *
        rate.kapasiti
    );

    const rangkaian = round2(
        (voltage === "LV" ? usage : md) *
        rate.rangkaian
    );

    const afa = round2(
        factoryAFA(
            usage,
            originalUsage,
            afaConfig
        )
    );

    const retail = rate.retail;

    const kwtbbBase =
        usage * rate.tenaga +
        (voltage === "LV" ? usage : md) *
        (rate.kapasiti + rate.rangkaian);

    const kwtbb = round2(
        Math.max(0, kwtbbBase) *
        KWTBB_RATE
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

// ==========================================
// FACTORY CARDS
// ==========================================

function factoryCard(
    title,
    subtitle,
    bill,
    voltage
) {
    let details = detail(
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
        detail(
            "Tenaga",
            formatRM(bill.tenaga)
        ) +
        detail(
            "AFA",
            formatRM(bill.afa)
        ) +
        detail(
            "Kapasiti",
            formatRM(bill.kapasiti)
        ) +
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

// ==========================================
// FACTORY MAIN
// ==========================================

function calculateFactory() {
    const usage = numeric(
        "factoryUsage"
    );

    const voltage = document.getElementById(
        "factoryVoltage"
    ).value;

    const md = numeric(
        "factoryMD"
    );

    document.getElementById(
        "factoryMDGroup"
    ).hidden = voltage !== "MV";

    const afaConfig = getFactoryAFAConfig(
        usage
    );

    const warning = document.getElementById(
        "factoryAFAWarning"
    );

    if (!afaConfig.valid) {
        warning.textContent =
            "Period 1 + Period 2 usage must equal " +
            usage.toFixed(2) +
            " kWh.";

        document.getElementById(
            "factoryResults"
        ).innerHTML = "";

        document.getElementById(
            "factorySavings"
        ).innerHTML = "";

        return;
    }

    warning.textContent = "";

    const before = factoryBill(
        usage,
        md,
        voltage,
        usage,
        afaConfig
    );

    let results = factoryCard(
        "Sebelum Pasang",
        "Before Solar Installation",
        before,
        voltage
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
        const remaining = getRemainingUsage(
            usage,
            count
        );

        const after = factoryBill(
            remaining,
            md,
            voltage,
            usage,
            afaConfig
        );

        results += factoryCard(
            titles[count],
            "After Solar Installation",
            after,
            voltage
        );

        savings += savingCard(
            names[count],
            Math.max(
                0,
                round2(
                    before.total -
                    after.total
                )
            )
        );
    }

    document.getElementById(
        "factoryResults"
    ).innerHTML = results;

    document.getElementById(
        "factorySavings"
    ).innerHTML = savings;
}

// ==========================================
// PAGE SWITCHING
// ==========================================

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
    }

    if (page === "shop") {
        calculateShop();
    }

    if (page === "factory") {
        calculateFactory();
    }
}

// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        calculateAll();
        calculateShop();
        updateFactoryAFAMode();
    }
);
