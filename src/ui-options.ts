export const UI_OPTIONS = [
  {
    number: "A",
    slug: "floor",
    version: "v2",
    name: "Neon Rush",
    title: "A high-energy arcade floor",
    tagline: "Electric violet, hot pink and laser-lime accents make every move feel like a game.",
    highlights: ["Glowing scoreboards and neon signals", "Bright, punchy Buy and Sell buttons", "An arcade look built for a short round"],
    palette: "neon",
  },
  {
    number: "B",
    slug: "arcade",
    version: "v3",
    name: "Candy Clash",
    title: "A colourful market party",
    tagline: "Bubblegum pink, tangerine and aqua bring a playful, comic-book feel to the floor.",
    highlights: ["Candy-colour company cards", "Bold pop-art trading buttons", "A bright look that reads quickly"],
    palette: "candy",
  },
  {
    number: "C",
    slug: "studio",
    version: "v4",
    name: "Game Show",
    title: "A live market showdown",
    tagline: "Royal purple, electric blue and trophy gold turn the market into a game-show stage.",
    highlights: ["Scoreboard-style market highlights", "Gold and cyan game-show accents", "A dramatic, event-ready colour scheme"],
    palette: "show",
  },
] as const;

export type UiVariant = (typeof UI_OPTIONS)[number]["slug"];
