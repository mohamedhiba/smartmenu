import type { AnalyzedMenu } from "./schema";

/**
 * The demo menu. Trattoria-style Italian, 8 dishes across 4 sections.
 *
 * Two jobs:
 *  1. Every screen must render from this with no API key present.
 *  2. It backs `?demo=1`, which is what we show on stage if the network dies.
 *
 * Numbers are realistic restaurant portions, not USDA-accurate. That is fine.
 */
export const DEMO_MENU: AnalyzedMenu = {
  isMenu: true,
  rejectionReason: null,
  sourceLang: "it",
  items: [
    {
      id: "bruschetta-pomodoro",
      originalName: "Bruschetta al Pomodoro",
      translatedName: "Tomato Bruschetta",
      section: "Starters",
      category: "other",
      ingredients: ["grilled bread", "tomato", "garlic", "basil", "olive oil"],
      nutrition: { calories: 220, protein: 5, carbs: 30, fat: 9 },
      flags: { vegan: true, vegetarian: true, glutenFree: false, containsNuts: false },
      confidence: 0.95,
    },
    {
      id: "insalata-caprese",
      originalName: "Insalata Caprese",
      translatedName: "Caprese Salad",
      section: "Starters",
      category: "salad",
      ingredients: ["buffalo mozzarella", "tomato", "basil", "olive oil"],
      nutrition: { calories: 310, protein: 17, carbs: 8, fat: 24 },
      flags: { vegan: false, vegetarian: true, glutenFree: true, containsNuts: false },
      confidence: 0.95,
    },
    {
      id: "spaghetti-carbonara",
      originalName: "Spaghetti alla Carbonara",
      translatedName: "Spaghetti Carbonara",
      section: "First courses",
      category: "pasta",
      ingredients: ["spaghetti", "guanciale", "egg yolk", "pecorino romano", "black pepper"],
      nutrition: { calories: 780, protein: 28, carbs: 82, fat: 36 },
      flags: { vegan: false, vegetarian: false, glutenFree: false, containsNuts: false },
      confidence: 0.92,
    },
    {
      id: "pesto-genovese",
      originalName: "Trofie al Pesto Genovese",
      translatedName: "Trofie with Genoese Pesto",
      section: "First courses",
      category: "pasta",
      ingredients: ["trofie pasta", "basil", "pine nuts", "parmesan", "garlic", "olive oil"],
      nutrition: { calories: 690, protein: 19, carbs: 76, fat: 33 },
      flags: { vegan: false, vegetarian: true, glutenFree: false, containsNuts: true },
      confidence: 0.9,
    },
    {
      id: "risotto-funghi",
      originalName: "Risotto ai Funghi Porcini",
      translatedName: "Porcini Mushroom Risotto",
      section: "First courses",
      category: "risotto",
      ingredients: ["arborio rice", "porcini mushrooms", "butter", "parmesan", "white wine"],
      nutrition: { calories: 620, protein: 14, carbs: 78, fat: 24 },
      flags: { vegan: false, vegetarian: true, glutenFree: true, containsNuts: false },
      confidence: 0.9,
    },
    {
      id: "branzino-forno",
      originalName: "Branzino al Forno",
      translatedName: "Baked Sea Bass",
      section: "Main courses",
      category: "fish",
      ingredients: ["sea bass", "lemon", "rosemary", "olive oil", "potatoes"],
      nutrition: { calories: 420, protein: 46, carbs: 12, fat: 20 },
      flags: { vegan: false, vegetarian: false, glutenFree: true, containsNuts: false },
      confidence: 0.93,
    },
    {
      id: "tagliata-manzo",
      originalName: "Tagliata di Manzo con Rucola",
      translatedName: "Sliced Beef with Rocket",
      section: "Main courses",
      category: "meat",
      ingredients: ["beef sirloin", "rocket", "parmesan shavings", "olive oil", "balsamic"],
      nutrition: { calories: 540, protein: 52, carbs: 4, fat: 34 },
      flags: { vegan: false, vegetarian: false, glutenFree: true, containsNuts: false },
      confidence: 0.91,
    },
    {
      id: "tiramisu",
      originalName: "Tiramisù della Casa",
      translatedName: "House Tiramisu",
      section: "Desserts",
      category: "dessert",
      ingredients: ["mascarpone", "savoiardi biscuits", "espresso", "egg", "cocoa"],
      nutrition: { calories: 450, protein: 8, carbs: 46, fat: 26 },
      flags: { vegan: false, vegetarian: true, glutenFree: false, containsNuts: false },
      confidence: 0.94,
    },
  ],
};
