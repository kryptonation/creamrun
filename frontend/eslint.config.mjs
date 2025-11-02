import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

export default [
  {files: ["**/*.{js,mjs,cjs,jsx}"]},
  {languageOptions: { globals: {...globals.browser, ...globals.node} }},
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {ignores: ['build','__mocks__' , '.eslintrc.cjs']},
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/prop-types": "off",
      "no-undef":"off",
      "react/react-in-jsx-scope": "off", 
      "react-hooks/exhaustive-deps":"off",
      'react/display-name': 'off'
    },
  }
];
