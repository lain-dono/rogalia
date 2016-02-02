'use strict'

module.exports = {
    attrs:    ["Strength", "Vitality", "Dexterity",    "Intellect",  "Perception", "Wisdom"],
    vitamins: ["Protein",  "Fat",      "Carbohydrate", "Phosphorus", "Calcium",    "Magnesium"],
    equipSlots: [
        "bag",
        "right-hand",
        "left-hand",
        "head",
        "neck",
        "body",
        "legs",
        "feet",
    ],

    sexArr: ["male", "female"],
    sex: function(sex) {
        return ["male", "female"][sex];
    },
}
