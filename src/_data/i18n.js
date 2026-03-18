const storyLab = require("./i18n/storyLab.json");
const labPanda = require("./i18n/labPanda.json");
const dna = require("./i18n/dna.json");
const analysis = require("./i18n/analysis.json");
const exams = require("./i18n/exams.json");
const home = require("./i18n/home.json");
const auth = require("./i18n/auth.json");
const dashboard = require("./i18n/dashboard.json");
const tips = require("./i18n/tips.json");
const contribute = require("./i18n/contribute.json");
const privacy = require("./i18n/privacy.json");
const profile = require("./i18n/profile.json");
const grammar = require("./i18n/grammar.json");
const resources = require("./i18n/resources.json");
const glossary = require("./i18n/glossary.json");
const contributors = require("./i18n/contributors.json");
const levels = require("./i18n/levels.json");
const admin = require("./i18n/admin.json");
const community = require("./i18n/community.json");
const login = require("./i18n/login.json");
const register = require("./i18n/register.json");
const common = require("./i18n/common.json");

// Helper to access common translations easily
const commonByCode = common.reduce((acc, curr) => {
  acc[curr.code] = curr;
  return acc;
}, {});

module.exports = {
  storyLab,
  labPanda,
  dna,
  analysis,
  exams,
  home,
  auth,
  dashboard,
  tips,
  contribute,
  privacy,
  profile,
  grammar,
  resources,
  glossary,
  contributors,
  levels,
  admin,
  community,
  login,
  register,
  common,
  commonByCode
};
