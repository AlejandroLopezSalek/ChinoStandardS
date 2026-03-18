const levelsData = require("./i18n/levels.json");

module.exports = function () {
  const result = [];
  levelsData.forEach((lang) => {
    Object.keys(lang.levels).forEach((levelKey) => {
      result.push({
        code: lang.code,
        dir: lang.dir,
        levelKey: levelKey,
        t: lang.levels[levelKey],
        ui: lang // Includes search_placeholder, create_lesson, etc.
      });
    });
  });
  return result;
};
