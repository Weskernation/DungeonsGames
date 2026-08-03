const ENABLE_ITEM_TOOLTIPS = true;

const MOBILE_WIDTH = 900;

function tooltipsEnabled() {
    return document.body.classList.contains("item-tooltips-enabled");
}
function isMobileTooltip() {
    return window.innerWidth <= MOBILE_WIDTH;
}


if (ENABLE_ITEM_TOOLTIPS) {

    document.body.classList.add("item-tooltips-disabled");

    fetch("items.json")
        .then(response => {
            console.log("JSON response:", response);
            return response.json();
        })

        .then(items => {

            console.log("Items loaded:", items);

            document.querySelectorAll(".loot-item[data-item]").forEach(cell => {

                const itemName = cell.dataset.item;

                if (!itemName) {
                    return;
                }

                const item = items[itemName];

                if (!item) {
                    return;
                }

                if (!item) {
                    return;
                }

                const tooltip = document.createElement("div");

                tooltip.className = "item-description";

                tooltip.innerHTML = `

                    <div class="item-meta">
                        ${item.type} | ${item.rarity}
                        <br>
                        ${item.attunement?.required
                            ? `<br>Requires Attunement${item.attunement.who ? " " + item.attunement.who : ""}`
                            : ""}
                    </div>
                    
                    ${item.description?.length ? `

                    <div class="item-description-text">

                        ${item.description
                            .map(text => `<p>${text}</p>`)
                            .join("")}

                    </div>

                    ` : ""}                    

                    ${item.effects?.length ? `

                    <h4>Effects</h4>

                    <ul>
                        ${item.effects
                            .map(effect => `<li>${effect}</li>`)
                            .join("")}
                    </ul>

                    ` : ""}

                    ${item.abilities?.length ? `

                    <h4>Abilities</h4>

                    ${item.abilities.map(ability => `

                        <div class="ability">
                            <strong>${ability.name}</strong><br>
                            ${ability.action ? "Action: " + ability.action + "<br>" : ""}
                            ${ability.effect}<br>
                            ${ability.recharge ? "Recharge: " + ability.recharge : ""}
                        </div>

                    `).join("")}

                    ` : ""}

                    ${item.variants?.length ? `

                    <h4>Variants</h4>

                    <ul>
                        ${item.variants
                            .map(variant => `<li>${variant}</li>`)
                            .join("")}
                    </ul>

                    ` : ""}

                    ${item.notes !== undefined 
                        ? (item.notes.trim() !== "" 
                            ? `
                            <div class="item-source-note">
                                ${item.notes}
                            </div>
                            `
                            : "")
                        : `
                            <div class="item-source-note">
                                Compact summary only. Refer to the official source for the complete item description.
                            </div>
                        `
                    }

                `;

                    cell.addEventListener("click", (event) => {

                        if (!tooltipsEnabled()) return;
                        if (!isMobileTooltip()) return;

                        event.preventDefault();
                        event.stopPropagation();

                        // Sluit eventueel al geopende tooltip
                        document.querySelectorAll(".item-description.mobile-open")
                            .forEach(t => t.classList.remove("mobile-open"));

                        document.querySelectorAll(".tooltip-overlay")
                            .forEach(o => o.remove());

                        // Achtergrond
                        const overlay = document.createElement("div");
                        overlay.className = "tooltip-overlay";

                        overlay.addEventListener("click", () => {
                            tooltip.classList.remove("mobile-open");
                            overlay.remove();
                        });

                        document.body.appendChild(overlay);

                        tooltip.classList.add("mobile-open");

                    });
                        // Dit is de tooltip voor <= 900px schermen/mobiel) EINDE

        

                            cell.addEventListener("mouseenter", () => {

                                tooltip.style.visibility = "hidden";
                                tooltip.style.display = "block";

                                const tooltipRect = tooltip.getBoundingClientRect();


                                if (tooltipRect.right > window.innerWidth) {

                                    tooltip.style.left = "auto";
                                    tooltip.style.right = "100%";
                                    tooltip.style.marginLeft = "0";
                                    tooltip.style.marginRight = "10px";

                                }


                                if (tooltipRect.bottom > window.innerHeight) {

                                    tooltip.style.top = "auto";
                                    tooltip.style.bottom = "0";

                                }


                                tooltip.style.visibility = "";

                            });


                            cell.addEventListener("mouseleave", () => {

                                tooltip.style.left = "";
                                tooltip.style.right = "";
                                tooltip.style.top = "";
                                tooltip.style.bottom = "";
                                tooltip.style.marginLeft = "";
                                tooltip.style.marginRight = "";

                            });
                        
            
            });
    const tooltipButton = document.getElementById("toggle-item-tooltips");

        if (tooltipButton) {

            tooltipButton.style.display = "block";

            let tooltipMode = 0;


                tooltipButton.addEventListener("click", () => {


                    tooltipMode++;


                    if (tooltipMode > 2) {
                        tooltipMode = 0;
                    }


                    // Alles eerst resetten
                    document.body.classList.remove(
                        "item-tooltips-enabled",
                        "item-tooltips-disabled"
                    );

                    document.querySelectorAll(".item-description").forEach(tooltip => {
                        tooltip.classList.remove("parchment");
                    });


                    // 0 = OFF
                    if (tooltipMode === 0) {

                        document.body.classList.add("item-tooltips-disabled");

                        tooltipButton.textContent = "Loot Tooltips: OFF";
                    }

                    // 1 = ON + parchment
                    if (tooltipMode === 1) {

                        document.body.classList.add("item-tooltips-enabled");

                        document.querySelectorAll(".item-description").forEach(tooltip => {
                            tooltip.classList.add("parchment");
                        });

                        tooltipButton.textContent = "Loot Tooltips: ON";
                        tooltipButton.classList.add("parchment-mode");
                    }

                    // 2 = ON standaard
                    if (tooltipMode === 2) {

                        document.body.classList.add("item-tooltips-enabled");

                        tooltipButton.textContent = "Loot Tooltips: ON";
                        tooltipButton.classList.remove("parchment-mode");
                    }
                });

        }
    const tooltipSections = document.querySelectorAll(
    // Vanaf waar wordt de tooltip ON/OFF zichtbaar
    "#progression-title, #loot-table"
    );

    if (tooltipButton && tooltipSections.length) {

        let visibleSections = new Set();

        const observer = new IntersectionObserver((entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {
                    visibleSections.add(entry.target);
                } 
                else {
                    visibleSections.delete(entry.target);
                }

            });


            if (visibleSections.size > 0) {
                tooltipButton.parentElement.classList.add("visible");
            } 
            else {
                tooltipButton.parentElement.classList.remove("visible");
            }


        },  {
            rootMargin: "0px 0px 0px 0px"
            });


        tooltipSections.forEach(section => {
            observer.observe(section);
        });


            } else {
            const tooltipButton = document.getElementById("toggle-item-tooltips");

            if (tooltipButton) {

                tooltipButton.style.display = "none";

            }
        document.body.classList.add("item-tooltips-disabled");
}
