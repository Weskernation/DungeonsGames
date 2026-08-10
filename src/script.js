document.addEventListener("DOMContentLoaded", () => {

    const credits = `
        <div class="credits">
            <div>
                A collaborative creation by David, Johanna, Robin and Wesley.
            </div>
            <div>
                Website design & development by Wesley.
            </div>
            <small class="tooltip"><span class="tooltip-text">
                <p>Images used in this page are not owned by these persons.</p>
                <p>They are used for a non-commercial Dungeons & Dragons environment.</p>
            </span>
        </small>
        </div>
    `;


    document.querySelectorAll(".credits-container")
        .forEach(container => {
            container.innerHTML = credits;
        });


    document.querySelectorAll(".loot-tier-info").forEach(panel => {

    if (panel.textContent.trim() === "") {
        panel.style.visibility = "hidden";
    }

    });

    document.querySelectorAll(".loot-item").forEach(item => {

    if (item.dataset.attunement === "true") {
        item.classList.add("attunement");
    }

    if (item.dataset.excluded === "true") {
        item.classList.add("excluded");
    }

    });



    document.querySelectorAll(".floating-menu button")
        .forEach(button => {

            const image = button.dataset.image;
            
            if (!image) return;


            const img = new Image();

            img.onload = () => {
                button.style.backgroundImage = `url('${image}')`;
                button.classList.add("has-image");
            };


            img.src = image;

    });

});



function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

