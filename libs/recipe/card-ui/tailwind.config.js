// Storybook resolves Tailwind from the library project root. Reuse the app's
// design-system configuration so the component and its UI-library dependencies
// generate the same utilities as the application.
module.exports = require('../../../apps/recipe/tailwind.config.js');
