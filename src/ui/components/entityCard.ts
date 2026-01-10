/**
 * Entity card component
 * Renders wiki cards for towers, monsters, etc.
 */

export interface EntityCardImageConfig {
    /** Sprite sheet URL */
    url: string;
    /** Single sprite width */
    width: number;
    /** Single sprite height */
    height: number;
    /** Sprite index in sheet */
    index: number;
    /** Function to get sprite position by index */
    getPosition: (index: number) => { x: number; y: number };
}

export interface EntityCardDataItem {
    label: string;
    value: string | number;
}

export interface EntityCardConfig {
    /** Card CSS class name */
    className: string;
    /** Entity display name */
    title: string;
    /** Image configuration */
    image: EntityCardImageConfig;
    /** Data items to display */
    dataItems: EntityCardDataItem[];
}

/**
 * Create an entity card element
 * @param config Card configuration
 * @returns The card DOM element
 */
export function createEntityCard(config: EntityCardConfig): HTMLDivElement {
    const card = document.createElement("div");
    card.classList.add(config.className);

    // Title
    const title = document.createElement("h3");
    title.innerText = config.title;
    card.appendChild(title);

    // Image
    const imgDiv = document.createElement("div");
    imgDiv.style.backgroundImage = `url('${config.image.url}')`;
    imgDiv.style.width = config.image.width + "px";
    imgDiv.style.height = config.image.height + "px";
    const pos = config.image.getPosition(config.image.index);
    imgDiv.style.backgroundPositionX = -pos.x + "px";
    imgDiv.style.backgroundPositionY = -pos.y + "px";
    imgDiv.style.margin = "0 auto";
    card.appendChild(imgDiv);

    // Data section
    const data = document.createElement("div");
    for (const item of config.dataItems) {
        const line = document.createElement("p");
        line.innerText = `${item.label}：${item.value}`;
        data.appendChild(line);
    }
    card.appendChild(data);

    return card;
}

/**
 * Helper to get asset URL with Vite base path
 */
export function getAssetUrl(path: string): string {
    const base = import.meta.env.BASE_URL ?? "/";
    return `${base}${path.replace(/^\//, "")}`;
}
