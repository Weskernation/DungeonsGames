const ENABLE_ITEM_TOOLTIPS = false;


if (ENABLE_ITEM_TOOLTIPS) {

    fetch("items.json")
    .then(response => {
        console.log("JSON response:", response);
        return response.json();
    })
    .then(items => {

        console.log("Items loaded:", items);

        document.querySelectorAll(".loot-item").forEach(cell => {


                const itemName = cell.dataset.item;


                const item = items[itemName];


                if (!item) {
                    console.warn("Missing item:", itemName);
                    return;
                }


                const tooltip = document.createElement("div");

                tooltip.className = "item-description";


                tooltip.innerHTML = `

                    <div class="item-meta">
                        ${item.type} | ${item.rarity}
                        <br>
                        ${item.attunement?.required 
                            ? "Requires Attunement " + item.attunement.who 
                            : "No Attunement"}
                    </div>


                    ${item.effects ? `

                    <h4>Effects</h4>

                        <ul>
                            ${item.effects
                                .map(effect => `<li>${effect}</li>`)
                                .join("")}
                        </ul>

                        ` : ""}

                            ${item.abilities ? `

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


                            ${item.variants ? `

                    <h4>Variants</h4>

                        <ul>
                            ${item.variants
                                .map(variant => `<li>${variant}</li>`)
                                .join("")}
                        </ul>

                    ` : ""}
                    <div class="item-source-note">Compact summary only. Refer to the official source for the complete item description.</div>

                `;


                cell.appendChild(tooltip);


            });


        });

}
